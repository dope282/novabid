import type { FastifyInstance } from 'fastify'
import { db, getUser, recordTxn } from '../db.js'
import { requireUser, userSnapshot } from '../auth.js'

export interface PackRow {
  id: number
  credits: number
  price_mnt: number
  best: number
  status: 'active' | 'hidden'
  sort_order: number
}

export function packSnapshot(p: PackRow) {
  return {
    id: p.id,
    credits: p.credits,
    priceMnt: p.price_mnt,
    best: !!p.best,
    status: p.status,
    /** Нэг кредитийн үнэ — клиент дээр дахин бодохгүйн тулд энд гаргана */
    perCredit: Math.round(p.price_mnt / p.credits),
  }
}

export function getPack(id: number): PackRow | undefined {
  return db.prepare('SELECT * FROM credit_packs WHERE id=?').get(id) as PackRow | undefined
}

export function walletRoutes(app: FastifyInstance) {
  /** Нийтэд харагдах багцууд (нуусныг нь буцаахгүй) */
  app.get('/api/wallet/packs', async () => {
    const rows = db
      .prepare("SELECT * FROM credit_packs WHERE status='active' ORDER BY sort_order, credits")
      .all() as PackRow[]
    return { packs: rows.map(packSnapshot) }
  })

  /**
   * Кредит цэнэглэх — MOCK QPay.
   * Жинхэнэ QPay merchant API холбогдох хүртэл шууд амжилттай гэж үзнэ.
   */
  const topup = db.transaction((userId: number, pack: PackRow) => {
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(pack.credits, userId)
    recordTxn(userId, 'purchase', {
      credits: pack.credits,
      meta: JSON.stringify({ packId: pack.id, priceMnt: pack.price_mnt, method: 'qpay-mock' }),
    })

    // Referral урамшуулал: урьсан хүн анхны худалдан авалтаа хиймэгц урьсан хүнд 2 кредит
    const user = getUser(userId)!
    if (user.referred_by) {
      const purchases = db
        .prepare("SELECT COUNT(*) AS c FROM transactions WHERE user_id=? AND type='purchase'")
        .get(userId) as { c: number }
      if (purchases.c === 1) {
        db.prepare('UPDATE users SET credits = credits + 2 WHERE id = ?').run(user.referred_by)
        recordTxn(user.referred_by, 'referral', {
          credits: 2,
          meta: JSON.stringify({ invitedUserId: userId }),
        })
      }
    }
  })

  app.post('/api/wallet/topup', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const { packId } = (req.body ?? {}) as { packId?: number }
    const pack = typeof packId === 'number' ? getPack(packId) : undefined
    if (!pack || pack.status !== 'active')
      return reply.code(404).send({ error: 'Багц олдсонгүй' })
    topup(user.id, pack)
    return { ok: true, user: userSnapshot(getUser(user.id)!) }
  })

  /** Урилгын хуудасны өгөгдөл — код, статистик, урьсан хүмүүсийн жагсаалт */
  app.get('/api/referral', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return

    const invited = db
      .prepare(
        `SELECT u.id, u.name, u.email, u.created_at,
                (SELECT COUNT(*) FROM transactions t WHERE t.user_id=u.id AND t.type='purchase') AS purchases
         FROM users u WHERE u.referred_by=? ORDER BY u.id DESC`,
      )
      .all(user.id) as { id: number; name: string; email: string; created_at: number; purchases: number }[]

    // Урамшуулал нь урьсан хүний ЭХНИЙ худалдан авалтад л олгогддог
    const earned = (
      db
        .prepare("SELECT COALESCE(SUM(credits),0) AS c FROM transactions WHERE user_id=? AND type='referral'")
        .get(user.id) as { c: number }
    ).c

    return {
      code: user.referral_code,
      stats: {
        invited: invited.length,
        earned,
        pending: invited.filter((i) => i.purchases === 0).length,
      },
      referrals: invited.map((i) => {
        const name = i.name || i.email.split('@')[0]
        return {
          name,
          initial: name[0].toUpperCase(),
          rewarded: i.purchases > 0,
          joinedAt: i.created_at,
        }
      }),
    }
  })

  /**
   * Token хөдөлгөөн — үлдэгдэлд нөлөөлсөн гүйлгээ л.
   * Шошгыг сервер талд бэлдэж өгнө (meta-г клиент тайлах шаардлагагүй).
   */
  app.get('/api/wallet/tokens', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return

    const rows = db
      .prepare(
        `SELECT id, type, tokens, meta, created_at FROM transactions
         WHERE user_id=? AND tokens <> 0 ORDER BY id DESC LIMIT 50`,
      )
      .all(user.id) as { id: number; type: string; tokens: number; meta: string | null; created_at: number }[]

    const entries = rows.map((t) => {
      let m: Record<string, unknown> = {}
      try {
        m = JSON.parse(t.meta ?? '{}')
      } catch {
        /* meta эвдэрсэн бол хоосон гэж үзнэ */
      }
      const positive = t.tokens > 0

      let title: string
      let kind: string
      if (m.refundOrderId) {
        title = `Захиалга цуцлагдав${m.title ? ` · ${m.title}` : ''}`
        kind = 'БУЦААЛТ'
      } else if (m.restoreOrderId) {
        title = `Захиалга сэргээв${m.title ? ` · ${m.title}` : ''}`
        kind = 'ЗАХИАЛГА'
      } else if (t.type === 'admin_adjust') {
        title = 'Админ гараар өөрчлөв'
        kind = 'ЗАСВАР'
      } else if (t.type === 'token_spend') {
        title = `Дэлгүүр · ${m.title ?? 'бараа'}`
        kind = 'ХУДАЛДАН АВАЛТ'
      } else {
        // Consolation — лотын нэрийг нэмж тодорхой болгоно
        const lot = m.lotId
          ? (db.prepare('SELECT code, title FROM lots WHERE id=?').get(m.lotId) as
              | { code: string; title: string }
              | undefined)
          : undefined
        title = lot ? `${lot.code} · ${lot.title}` : String(m.code ?? 'Аукцион')
        kind = 'AUCTION ДУУССАН'
      }

      return { id: t.id, title, kind, tokens: t.tokens, positive, createdAt: t.created_at }
    })

    return { balance: getUser(user.id)!.tokens, entries }
  })

  /** Гүйлгээний түүх */
  app.get('/api/wallet/transactions', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const rows = db
      .prepare(
        'SELECT id, type, credits, tokens, meta, created_at FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 50',
      )
      .all(user.id)
    return { transactions: rows }
  })
}
