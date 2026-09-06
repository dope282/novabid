import type { FastifyInstance } from 'fastify'
import { db, getLot, getUser, recordTxn, type LotRow, type UserRow } from '../db.js'
import { avatarColorOf, requireAdmin, userSnapshot } from '../auth.js'
import { getPack, packSnapshot, type PackRow } from './wallet.js'
import { ApiError, closeLotNow, lotSnapshot, roundsOf } from '../auction.js'
import { UPLOAD_PREFIX, deleteImage, saveImage } from '../uploads.js'
import { posInt, str } from '../validate.js'

interface TxnRow {
  id: number
  user_id: number
  type: string
  credits: number
  tokens: number
  meta: string | null
  created_at: number
}

function fmtDate(ms: number, withTime = false): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  const date = `${p(d.getMonth() + 1)}.${p(d.getDate())}`
  return withTime ? `${date} ${p(d.getHours())}:${p(d.getMinutes())}` : date
}

function tugrik(n: number): string {
  return n.toLocaleString('en-US') + '₮'
}

const DAYS = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям']

export function adminRoutes(app: FastifyInstance) {
  /** Тойм — үзүүлэлтүүд, 7 хоногийн bid график, сүүлийн үйл явдал */
  app.get('/api/admin/overview', async (req, reply) => {
    if (!requireAdmin(req, reply)) return

    const now = Date.now()
    const weekAgo = now - 7 * 86400_000
    const dayStart = new Date().setHours(0, 0, 0, 0)

    // Орлого = 7 хоногийн purchase гүйлгээний priceMnt нийлбэр
    const purchases = db
      .prepare("SELECT meta FROM transactions WHERE type='purchase' AND created_at >= ?")
      .all(weekAgo) as { meta: string | null }[]
    const revenue = purchases.reduce((s, p) => {
      try {
        return s + (JSON.parse(p.meta ?? '{}').priceMnt ?? 0)
      } catch {
        return s
      }
    }, 0)

    const activeCount = (db.prepare("SELECT COUNT(*) AS c FROM lots WHERE status='live'").get() as { c: number }).c
    const userCount = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c
    const newUsers = (db.prepare('SELECT COUNT(*) AS c FROM users WHERE created_at >= ?').get(weekAgo) as { c: number }).c
    const bidsToday = (db.prepare('SELECT COUNT(*) AS c FROM bids WHERE created_at >= ?').get(dayStart) as { c: number }).c

    const revMln = (revenue / 1_000_000).toFixed(2)
    const metrics = [
      { label: 'Нийт орлого (7 хоног)', value: `${revMln}сая₮`, delta: `${purchases.length} гүйлгээ`, positive: true, hint: 'Кредит багц борлуулалт' },
      { label: 'Идэвхтэй аукцион', value: String(activeCount), delta: 'live', positive: true, hint: 'Яг одоо явагдаж буй' },
      { label: 'Бүртгэлтэй хэрэглэгч', value: userCount.toLocaleString('en-US'), delta: `+${newUsers}`, positive: true, hint: 'Сүүлийн 7 хоногт' },
      { label: 'Өнөөдрийн bid', value: bidsToday.toLocaleString('en-US'), delta: 'өнөөдөр', positive: bidsToday > 0, hint: 'Өдрийн эхнээс' },
    ]

    // 7 хоногийн bid тоо (өдрөөр)
    const bidsByDay: { day: string; bids: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now - i * 86400_000).setHours(0, 0, 0, 0)
      const end = start + 86400_000
      const c = (db.prepare('SELECT COUNT(*) AS c FROM bids WHERE created_at >= ? AND created_at < ?').get(start, end) as { c: number }).c
      bidsByDay.push({ day: DAYS[new Date(start).getDay()], bids: c })
    }

    // Сүүлийн үйл явдал
    const recentActivity: { text: string; time: string; kind: string }[] = []
    const recentBids = db
      .prepare(
        `SELECT b.increment, b.created_at, u.name, u.email, l.code
         FROM bids b JOIN users u ON u.id=b.user_id JOIN lots l ON l.id=b.lot_id
         ORDER BY b.id DESC LIMIT 4`,
      )
      .all() as { increment: number; created_at: number; name: string; email: string; code: string }[]
    for (const b of recentBids) {
      recentActivity.push({ text: `${b.name || b.email.split('@')[0]} — ${b.code}-т bid хийв (+${b.increment}₮)`, time: fmtDate(b.created_at, true), kind: 'win' })
    }
    const recentUsers = db.prepare('SELECT name, email, created_at FROM users ORDER BY id DESC LIMIT 2').all() as {
      name: string
      email: string
      created_at: number
    }[]
    for (const u of recentUsers) {
      recentActivity.push({ text: `Шинэ хэрэглэгч — ${u.name || u.email.split('@')[0]}`, time: fmtDate(u.created_at, true), kind: 'user' })
    }
    const closed = db.prepare("SELECT code, current_price FROM lots WHERE status='closed' ORDER BY id DESC LIMIT 2").all() as {
      code: string
      current_price: number
    }[]
    for (const l of closed) {
      recentActivity.push({ text: `${l.code} хаагдлаа — ${tugrik(l.current_price)}`, time: '—', kind: 'close' })
    }

    return { metrics, bidsByDay, recentActivity }
  })

  /** Бүх лот */
  app.get('/api/admin/auctions', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const lots = db.prepare('SELECT * FROM lots ORDER BY id DESC').all() as LotRow[]
    const auctions = lots.map((l) => ({
      id: l.id,
      lot: l.code,
      title: l.title,
      price: tugrik(l.current_price),
      bids: l.bid_count,
      stage: `${String(l.current_stage).padStart(2, '0')}/${String(l.total_stages).padStart(2, '0')}`,
      status: l.status,
      winner: l.winner_user_id ? getUser(l.winner_user_id)?.name || getUser(l.winner_user_id)?.email : undefined,
      // Засварын формыг дүүргэхэд хэрэгтэй боловсруулаагүй утгууд
      subtitle: l.subtitle,
      description: l.description,
      image: l.image_url,
      currentPrice: l.current_price,
      totalStages: l.total_stages,
      endsAt: l.ends_at,
      startsAt: l.starts_at,
      // Round тохиргоо — засварын форм үүгээр дүүрнэ
      rounds: roundsOf(l.id).map((r) => ({
        round: r.round_no,
        durationMin: Math.max(1, Math.round(r.duration_sec / 60)),
        resetSec: r.reset_sec,
        // 0 = хязгааргүй → формд хоосон талбар
        bidsRequired: r.bids_required === 0 ? null : r.bids_required,
      })),
    }))
    return { auctions }
  })

  /** Бүх хэрэглэгч — идэвх (bid, захиалга) нь устгаж болох эсэхийг тодорхойлно */
  app.get('/api/admin/users', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db
      .prepare(
        `SELECT u.*,
           (SELECT COUNT(*) FROM bids b WHERE b.user_id=u.id) AS bid_count,
           (SELECT COUNT(*) FROM shop_orders o WHERE o.user_id=u.id) AS order_count,
           (SELECT COUNT(*) FROM users r WHERE r.referred_by=u.id) AS invited_count
         FROM users u ORDER BY u.id`,
      )
      .all() as (UserRow & { bid_count: number; order_count: number; invited_count: number })[]

    const users = rows.map((u) => ({
      id: u.id,
      name: u.name || u.email.split('@')[0],
      email: u.email,
      credits: u.credits,
      tokens: u.tokens,
      wins: u.wins,
      verified: !!u.verified,
      isAdmin: !!u.is_admin,
      blocked: !!u.blocked,
      avatarColor: avatarColorOf(u),
      bids: u.bid_count,
      joined: fmtDate(u.created_at),
      /** Түүх үлдээгээгүй хэрэглэгчийг л устгана — эс бөгөөс аукционы бүртгэл тасарна */
      deletable: u.bid_count === 0 && u.order_count === 0 && u.invited_count === 0,
    }))
    return { users }
  })

  /**
   * Хэрэглэгч засах — кредит/Token гараар өөрчлөх, хаах, админ эрх өгөх.
   * Үлдэгдлийн өөрчлөлтийг гүйлгээгээр бүртгэнэ (хаанаас гарсныг мөрдөх боломжтой байх).
   */
  app.patch('/api/admin/users/:id', async (req, reply) => {
    const me = requireAdmin(req, reply)
    if (!me) return
    const id = Number((req.params as { id: string }).id)
    const target = getUser(id)
    if (!target) return reply.code(404).send({ error: 'Хэрэглэгч олдсонгүй' })

    const b = (req.body ?? {}) as {
      credits?: unknown
      tokens?: unknown
      blocked?: unknown
      isAdmin?: unknown
    }

    try {
      // Өөрийгөө хаах/эрхээ хасахаас сэргийлнэ — админгүй үлдвэл системд орох арга алга
      if (id === me.id && (b.blocked === true || b.isAdmin === false))
        throw new ApiError(400, 'Өөрийн эрхээ хасах эсвэл өөрийгөө хаах боломжгүй')

      db.transaction(() => {
        if (b.credits !== undefined) {
          const next = posInt(b.credits, 'Кредит', { min: 0, max: 1_000_000 })
          const diff = next - target.credits
          db.prepare('UPDATE users SET credits=? WHERE id=?').run(next, id)
          if (diff !== 0)
            recordTxn(id, 'admin_adjust', {
              credits: diff,
              meta: JSON.stringify({ by: me.email, field: 'credits' }),
            })
        }
        if (b.tokens !== undefined) {
          const next = posInt(b.tokens, 'Token', { min: 0, max: 1_000_000 })
          const diff = next - target.tokens
          db.prepare('UPDATE users SET tokens=? WHERE id=?').run(next, id)
          if (diff !== 0)
            recordTxn(id, 'admin_adjust', {
              tokens: diff,
              meta: JSON.stringify({ by: me.email, field: 'tokens' }),
            })
        }
        if (b.blocked !== undefined) db.prepare('UPDATE users SET blocked=? WHERE id=?').run(b.blocked ? 1 : 0, id)
        if (b.isAdmin !== undefined) db.prepare('UPDATE users SET is_admin=? WHERE id=?').run(b.isAdmin ? 1 : 0, id)
      })()

      return { user: userSnapshot(getUser(id)!) }
    } catch (e) {
      const err = toApiError(e)
      return reply.code(err.status).send({ error: err.message })
    }
  })

  /**
   * Хэрэглэгч устгах — зөвхөн bid, захиалга, урилга үлдээгээгүй бол.
   * `users.referred_by` нь FK тул урьсан хүнийг устгавал холбоос тасарна;
   * идэвхтэй хэрэглэгчийг устгахын оронд ХААНА.
   */
  app.delete('/api/admin/users/:id', async (req, reply) => {
    const me = requireAdmin(req, reply)
    if (!me) return
    const id = Number((req.params as { id: string }).id)
    const target = getUser(id)
    if (!target) return reply.code(404).send({ error: 'Хэрэглэгч олдсонгүй' })
    if (id === me.id) return reply.code(400).send({ error: 'Өөрийгөө устгах боломжгүй' })

    const n = (t: string, col = 'user_id') =>
      (db.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE ${col}=?`).get(id) as { c: number }).c
    const blockers = [
      n('bids') && `${n('bids')} bid`,
      n('shop_orders') && `${n('shop_orders')} захиалга`,
      n('users', 'referred_by') && `${n('users', 'referred_by')} урилга`,
    ].filter(Boolean)
    if (blockers.length)
      return reply
        .code(409)
        .send({ error: `${blockers.join(', ')} байгаа тул устгах боломжгүй — хаах товчийг ашиглана уу` })

    db.transaction(() => {
      db.prepare('DELETE FROM poll_votes WHERE user_id=?').run(id)
      db.prepare('DELETE FROM participation WHERE user_id=?').run(id)
      db.prepare('DELETE FROM transactions WHERE user_id=?').run(id)
      db.prepare('DELETE FROM users WHERE id=?').run(id)
    })()
    return { ok: true }
  })

  // --- Кредит багц ---

  app.get('/api/admin/packs', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db
      .prepare('SELECT * FROM credit_packs ORDER BY sort_order, credits')
      .all() as PackRow[]
    // Хэдэн удаа зарагдсаныг харуулна
    const sold = db
      .prepare("SELECT meta FROM transactions WHERE type='purchase'")
      .all() as { meta: string | null }[]
    const count = new Map<number, number>()
    for (const s of sold) {
      try {
        const id = JSON.parse(s.meta ?? '{}').packId
        if (typeof id === 'number') count.set(id, (count.get(id) ?? 0) + 1)
      } catch {
        /* эвдэрсэн meta-г алгасна */
      }
    }
    return { packs: rows.map((p) => ({ ...packSnapshot(p), sold: count.get(p.id) ?? 0 })) }
  })

  app.post('/api/admin/packs', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    try {
      const b = (req.body ?? {}) as Record<string, unknown>
      const info = db
        .prepare(
          `INSERT INTO credit_packs (credits, price_mnt, best, status, sort_order, created_at)
           VALUES (?,?,?,?,?,?)`,
        )
        .run(
          posInt(b.credits, 'Кредит', { min: 1, max: 1_000_000 }),
          posInt(b.priceMnt, 'Үнэ', { min: 1, max: 1_000_000_000 }),
          b.best ? 1 : 0,
          b.status === 'hidden' ? 'hidden' : 'active',
          posInt(b.sortOrder ?? 0, 'Дараалал', { min: 0, max: 999 }),
          Date.now(),
        )
      return reply.code(201).send({ pack: packSnapshot(getPack(Number(info.lastInsertRowid))!) })
    } catch (e) {
      const err = toApiError(e)
      return reply.code(err.status).send({ error: err.message })
    }
  })

  app.patch('/api/admin/packs/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    if (!getPack(id)) return reply.code(404).send({ error: 'Багц олдсонгүй' })

    try {
      const b = (req.body ?? {}) as Record<string, unknown>
      const set: string[] = []
      const vals: unknown[] = []
      if (b.credits !== undefined)
        (set.push('credits=?'), vals.push(posInt(b.credits, 'Кредит', { min: 1, max: 1_000_000 })))
      if (b.priceMnt !== undefined)
        (set.push('price_mnt=?'), vals.push(posInt(b.priceMnt, 'Үнэ', { min: 1, max: 1_000_000_000 })))
      if (b.sortOrder !== undefined)
        (set.push('sort_order=?'), vals.push(posInt(b.sortOrder, 'Дараалал', { min: 0, max: 999 })))
      if (b.best !== undefined) {
        // "Хамгийн ашигтай" тэмдэглэгээ нэг л багцад байна
        if (b.best) db.prepare('UPDATE credit_packs SET best=0').run()
        set.push('best=?')
        vals.push(b.best ? 1 : 0)
      }
      if (b.status !== undefined) {
        if (b.status !== 'active' && b.status !== 'hidden')
          throw new ApiError(400, 'Төлөв буруу байна')
        set.push('status=?')
        vals.push(b.status)
      }
      if (!set.length) return reply.code(400).send({ error: 'Өөрчлөх талбар алга' })

      vals.push(id)
      db.prepare(`UPDATE credit_packs SET ${set.join(', ')} WHERE id=?`).run(...(vals as never[]))
      return { pack: packSnapshot(getPack(id)!) }
    } catch (e) {
      const err = toApiError(e)
      return reply.code(err.status).send({ error: err.message })
    }
  })

  /** Багц устгах — зарагдсан бол түүх тасрахаас сэргийлж нуухыг санал болгоно */
  app.delete('/api/admin/packs/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    if (!getPack(id)) return reply.code(404).send({ error: 'Багц олдсонгүй' })

    const sold = (db.prepare("SELECT meta FROM transactions WHERE type='purchase'").all() as {
      meta: string | null
    }[]).filter((s) => {
      try {
        return JSON.parse(s.meta ?? '{}').packId === id
      } catch {
        return false
      }
    }).length
    if (sold > 0)
      return reply
        .code(409)
        .send({ error: `${sold} удаа зарагдсан тул устгах боломжгүй — нуух товчийг ашиглана уу` })

    db.prepare('DELETE FROM credit_packs WHERE id=?').run(id)
    return { ok: true }
  })

  /** Бүх гүйлгээ (төлбөр) */
  app.get('/api/admin/payments', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db
      .prepare(
        `SELECT t.*, u.name, u.email FROM transactions t JOIN users u ON u.id=t.user_id
         ORDER BY t.id DESC LIMIT 100`,
      )
      .all() as (TxnRow & { name: string; email: string })[]

    const methodMap: Record<string, string> = {
      purchase: 'QPay',
      referral: 'Referral',
      rejoin_fee: 'Кредит',
      bid: 'Кредит',
      token_earn: 'Token',
      token_spend: 'Token',
      admin_adjust: 'Админ',
    }

    const payments = rows.map((t) => {
      let amount: string
      let meta: Record<string, unknown> = {}
      try {
        meta = JSON.parse(t.meta ?? '{}')
      } catch {
        /* ignore */
      }
      if (t.type === 'purchase') amount = tugrik(Number(meta.priceMnt ?? 0))
      else if (t.tokens !== 0) amount = `${t.tokens > 0 ? '+' : ''}${t.tokens} T`
      else amount = `${t.credits > 0 ? '+' : ''}${t.credits} кредит`

      const itemMap: Record<string, string> = {
        purchase: `Кредит багц${meta.packId ? ` · ${meta.packId}` : ''}`,
        referral: 'Урилгын урамшуулал',
        rejoin_fee: 'Шатанд дахин орсон',
        bid: 'Bid',
        // Дэлгүүрийн буцаалт нь мөн token_earn — consolation-оос ялгаж харуулна
        token_earn: meta.refundOrderId
          ? `Захиалга цуцлалт · буцаалт${meta.title ? ` (${meta.title})` : ''}`
          : 'Token авсан (consolation)',
        token_spend: meta.restoreOrderId
          ? 'Захиалга сэргээв'
          : `Дэлгүүрийн худалдан авалт${meta.title ? ` · ${meta.title}` : ''}`,
        admin_adjust: `Админ гараар өөрчлөв${meta.by ? ` · ${meta.by}` : ''}`,
      }

      return {
        id: `TX-${String(t.id).padStart(5, '0')}`,
        user: t.name || t.email.split('@')[0],
        item: itemMap[t.type] ?? t.type,
        method: methodMap[t.type] ?? t.type,
        amount,
        status: 'success',
        date: fmtDate(t.created_at, true),
      }
    })
    return { payments }
  })

  // --- Лот CRUD ---
  adminLotRoutes(app)
}

const STATUSES = ['scheduled', 'live', 'closed'] as const
type LotStatus = (typeof STATUSES)[number]

interface LotInput {
  code?: unknown
  title?: unknown
  subtitle?: unknown
  description?: unknown
  imageUrl?: unknown
  startPrice?: unknown
  /** Round бүрийн тохиргоо — өгвөл бүтнээр нь солино */
  rounds?: unknown
  /** Ноорог лот автоматаар live болох цаг (unix ms эсвэл ISO) */
  startsAt?: unknown
  status?: unknown
}

/**
 * Зургийн зам — зөвхөн өөрсдийн upload endpoint-оос гарсан `/uploads/<файл>` хэлбэр.
 * Хоосон бол null (зураг авах).
 */
function imagePath(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  if (!s.startsWith(UPLOAD_PREFIX) || s.includes('..') || s.slice(UPLOAD_PREFIX.length).includes('/'))
    throw new ApiError(400, 'Зургийн зам буруу — эхлээд /api/admin/uploads руу байршуулна')
  return s
}

interface ParsedRound {
  /** Round-ын товлосон урт (секундэд хөрвүүлсэн) */
  durationSec: number
  /** Bid бүрд сэргэх цонх */
  resetSec: number
  /** 0 = хязгааргүй */
  bidsRequired: number
}

const MAX_ROUND_SEC = 60 * 60 * 24 * 30
const MAX_ROUND_MIN = 60 * 24 * 30

/** Round жагсаалтыг шалгана. Өгөөгүй бол null. */
function parseRounds(v: unknown): ParsedRound[] | null {
  if (v === undefined || v === null) return null
  if (!Array.isArray(v) || !v.length) throw new ApiError(400, 'Дор хаяж нэг Round шаардлагатай')
  if (v.length > 100) throw new ApiError(400, 'Round хамгийн ихдээ 100 байна')
  return v.map((r, i) => {
    const o = (r ?? {}) as { durationMin?: unknown; resetSec?: unknown; bidsRequired?: unknown }
    // Үргэлжлэх хугацаа МИНУТААР, сэргэх цонх СЕКУНДЭЭР ирнэ
    const durationSec =
      posInt(o.durationMin, `Round ${i + 1} үргэлжлэх хугацаа`, { min: 1, max: MAX_ROUND_MIN }) * 60
    const resetSec = posInt(o.resetSec ?? 30, `Round ${i + 1} сэргэх хугацаа`, {
      min: 1,
      max: MAX_ROUND_SEC,
    })
    if (resetSec > durationSec)
      throw new ApiError(
        400,
        `Round ${i + 1}: сэргэх хугацаа нь үргэлжлэх хугацаанаасаа урт байж болохгүй`,
      )
    // Хоосон/null = хязгааргүй (0-оор хадгална)
    const bidsRequired =
      o.bidsRequired === undefined || o.bidsRequired === null || o.bidsRequired === ''
        ? 0
        : posInt(o.bidsRequired, `Round ${i + 1} bid босго`, { min: 1, max: 10_000 })
    return { durationSec, resetSec, bidsRequired }
  })
}

/** Лотын Round мөрүүдийг бүтнээр нь солино */
function writeRounds(lotId: number, rounds: ParsedRound[]) {
  db.prepare('DELETE FROM lot_rounds WHERE lot_id=?').run(lotId)
  const ins = db.prepare(
    `INSERT INTO lot_rounds (lot_id, round_no, duration_sec, reset_sec, bids_required)
     VALUES (?,?,?,?,?)`,
  )
  rounds.forEach((r, i) => ins.run(lotId, i + 1, r.durationSec, r.resetSec, r.bidsRequired))
}

/** Round өгөөгүй үеийн анхдагч: 10 × 30 мин (30с сэргэх) + сүүлийнх босгогүй */
function defaultRounds(): ParsedRound[] {
  const rounds: ParsedRound[] = Array.from({ length: 10 }, () => ({
    durationSec: 1800,
    resetSec: 30,
    bidsRequired: 15,
  }))
  // Сүүлийн Round — bid босгогүй: зөвхөн хугацаагаар дуусна, сүүлд bid хийсэн хүн ялна
  rounds.push({ durationSec: 1800, resetSec: 30, bidsRequired: 0 })
  return rounds
}

/** Эхлэх цаг — unix ms эсвэл ISO мөр. Хоосон = хуваарьгүй (гараар эхлүүлнэ). */
function parseStartsAt(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null
  const ms = typeof v === 'number' ? v : Date.parse(String(v))
  if (!Number.isFinite(ms)) throw new ApiError(400, 'Эхлэх цаг буруу байна')
  return ms
}

/**
 * Алдааг API-ийн нийтлэг `{ error }` хэлбэрт оруулна.
 * UNIQUE(code) зөрчлийг ойлгомжтой мессеж болгоно; танихгүй алдааг дээш нь шиднэ.
 */
function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof Error && e.message.includes('UNIQUE') && e.message.includes('lots.code'))
    return new ApiError(409, 'Энэ лотын код аль хэдийн бүртгэлтэй байна')
  throw e
}

export function adminLotRoutes(app: FastifyInstance) {
  /** Лотын зураг байршуулах → `{ url }`-ийг лот үүсгэх/засахад дамжуулна */
  app.post('/api/admin/uploads', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    try {
      const part = await req.file()
      if (!part) return reply.code(400).send({ error: 'Файл ирээгүй байна' })
      return { url: await saveImage(part) }
    } catch (e) {
      const err = toApiError(e)
      return reply.code(err.status).send({ error: err.message })
    }
  })

  /** Шинэ лот үүсгэх */
  app.post('/api/admin/lots', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const b = (req.body ?? {}) as LotInput

    try {
      const code = str(b.code, 'Код', { max: 40 })
      const title = str(b.title, 'Гарчиг')
      const subtitle = str(b.subtitle, 'Тайлбар', { required: false })
      const description = str(b.description, 'Дэлгэрэнгүй', { required: false, max: 4000 })
      const imageUrl = imagePath(b.imageUrl)
      const startPrice = posInt(b.startPrice ?? 1, 'Эхлэх үнэ', { min: 1, max: 100_000_000 })
      const rounds = parseRounds(b.rounds) ?? defaultRounds()
      const startsAt = parseStartsAt(b.startsAt)
      const status: LotStatus = STATUSES.includes(b.status as LotStatus)
        ? (b.status as LotStatus)
        : 'scheduled'
      if (status === 'closed')
        throw new ApiError(400, 'Шинэ лотыг "хаагдсан" төлөвтэй үүсгэж болохгүй')

      const now = Date.now()
      // Live бол Round 1 шууд эхэлнэ; ноорог бол таймер эхлэхгүй (starts_at дээр engine эхлүүлнэ)
      const live = status === 'live'
      const info = db
        .prepare(
          `INSERT INTO lots (code, title, subtitle, description, image_url, start_price, current_price,
             status, current_stage, total_stages, bids_per_stage, starts_at, round_started_at, ends_at,
             bid_count, created_at)
           VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,?,0,?)`,
        )
        .run(
          code,
          title,
          subtitle || null,
          description || null,
          imageUrl,
          startPrice,
          startPrice,
          status,
          rounds.length,
          rounds[0].bidsRequired || 15,
          startsAt,
          live ? now : null,
          // Timer дээр гүйдэг нь СЭРГЭХ цонх (үргэлжлэх нь зөвхөн хуваарьт)
          live ? now + rounds[0].resetSec * 1000 : null,
          now,
        )
      const newId = Number(info.lastInsertRowid)
      writeRounds(newId, rounds)
      return reply.code(201).send({ lot: lotSnapshot(getLot(newId)!) })
    } catch (e) {
      const err = toApiError(e)
      return reply.code(err.status).send({ error: err.message })
    }
  })

  /** Лот засах — өгсөн талбаруудыг л шинэчилнэ */
  app.patch('/api/admin/lots/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    const lot = getLot(id)
    if (!lot) return reply.code(404).send({ error: 'Лот олдсонгүй' })

    const b = (req.body ?? {}) as LotInput
    const set: string[] = []
    const vals: unknown[] = []

    try {
      if (b.code !== undefined) {
        set.push('code=?')
        vals.push(str(b.code, 'Код', { max: 40 }))
      }
      if (b.title !== undefined) {
        set.push('title=?')
        vals.push(str(b.title, 'Гарчиг'))
      }
      if (b.subtitle !== undefined) {
        set.push('subtitle=?')
        vals.push(str(b.subtitle, 'Тайлбар', { required: false }) || null)
      }
      if (b.description !== undefined) {
        set.push('description=?')
        vals.push(str(b.description, 'Дэлгэрэнгүй', { required: false, max: 4000 }) || null)
      }
      // Зураг солигдвол хуучин файлыг устгана (UPDATE амжилттай болсны дараа)
      let oldImage: string | null = null
      if (b.imageUrl !== undefined) {
        const next = imagePath(b.imageUrl)
        if (next !== lot.image_url) oldImage = lot.image_url
        set.push('image_url=?')
        vals.push(next)
      }
      if (b.status !== undefined) {
        if (!STATUSES.includes(b.status as LotStatus))
          throw new ApiError(400, 'Төлөв буруу байна')
        if (b.status === 'closed' && lot.status !== 'closed')
          throw new ApiError(400, 'Хаахдаа /close дуудна — ялагч, Token тооцоо хийгдэнэ')
        // Дахин нээвэл хаагдахдаа Token дахин тарж, ялагчийн wins давхар нэмэгдэнэ
        if (lot.status === 'closed' && b.status !== 'closed')
          throw new ApiError(400, 'Хаагдсан лотыг дахин нээх боломжгүй — ялагч тодорч, Token тарсан')
        set.push('status=?')
        vals.push(b.status)
      }
      if (b.startsAt !== undefined) {
        set.push('starts_at=?')
        vals.push(parseStartsAt(b.startsAt))
      }
      // Round тохиргоо солигдвол: Round тоо шинэчлэгдэж, одоогийн Round хүрээнд багтана,
      // мөн одоогийн Round-ын таймер шинэ хугацаагаар ДАХИН эхэлнэ.
      const rounds = parseRounds(b.rounds)
      if (rounds) {
        const stage = Math.min(lot.current_stage, rounds.length)
        set.push('total_stages=?', 'bids_per_stage=?', 'current_stage=?')
        vals.push(rounds.length, rounds[0].bidsRequired || 15, stage)
        if (lot.status === 'live') {
          const now = Date.now()
          set.push('round_started_at=?', 'ends_at=?')
          vals.push(now, now + rounds[stage - 1].resetSec * 1000)
        }
      }

      // Ноорогоос live болговол Round-ын таймер эхлэх ёстой — эс бөгөөс лот
      // таймергүй live болж, хэзээ ч урагшлахгүй.
      if (b.status === 'live' && lot.status !== 'live' && !rounds) {
        const now = Date.now()
        const cur = roundsOf(id).find((r) => r.round_no === lot.current_stage)
        set.push('round_started_at=?', 'ends_at=?')
        vals.push(now, now + (cur?.reset_sec ?? 30) * 1000)
      }

      if (!set.length) return reply.code(400).send({ error: 'Өөрчлөх талбар алга' })

      vals.push(id)
      db.transaction(() => {
        db.prepare(`UPDATE lots SET ${set.join(', ')} WHERE id=?`).run(...(vals as never[]))
        if (rounds) writeRounds(id, rounds)
      })()
      deleteImage(oldImage)
      return { lot: lotSnapshot(getLot(id)!) }
    } catch (e) {
      const err = toApiError(e)
      return reply.code(err.status).send({ error: err.message })
    }
  })

  /** Лотыг гараар хаах — ялагч тодруулж, Token буцаана */
  app.post('/api/admin/lots/:id/close', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    try {
      return { lot: closeLotNow(Number((req.params as { id: string }).id)) }
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  /**
   * Лот устгах — зөвхөн bid ороогүй үед.
   * Bid орсон лотын түүхийг устгахгүй (санхүүгийн бүртгэл), оронд нь хаана.
   */
  app.delete('/api/admin/lots/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    const lot = getLot(id)
    if (!lot) return reply.code(404).send({ error: 'Лот олдсонгүй' })

    const bids = (db.prepare('SELECT COUNT(*) AS c FROM bids WHERE lot_id=?').get(id) as { c: number }).c
    if (bids > 0)
      return reply
        .code(409)
        .send({ error: `${bids} bid орсон тул устгах боломжгүй — хаах эсвэл архивлана уу` })

    db.transaction(() => {
      // FK-д заагдсан бүх мөрийг эхлээд цэвэрлэнэ (lot_rounds-ыг мартвал устгах бүхэлдээ унана)
      db.prepare('DELETE FROM participation WHERE lot_id=?').run(id)
      db.prepare('DELETE FROM lot_rounds WHERE lot_id=?').run(id)
      db.prepare('DELETE FROM lots WHERE id=?').run(id)
    })()
    deleteImage(lot.image_url)
    return { ok: true }
  })
}
