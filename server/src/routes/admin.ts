import type { FastifyInstance } from 'fastify'
import { db, getUser, type LotRow } from '../db.js'
import { requireAdmin } from '../auth.js'

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
    }))
    return { auctions }
  })

  /** Бүх хэрэглэгч */
  app.get('/api/admin/users', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db.prepare('SELECT * FROM users ORDER BY id').all() as {
      name: string
      email: string
      credits: number
      tokens: number
      wins: number
      verified: number
      created_at: number
    }[]
    const users = rows.map((u) => ({
      name: u.name || u.email.split('@')[0],
      email: u.email,
      credits: u.credits,
      tokens: u.tokens,
      wins: u.wins,
      verified: !!u.verified,
      joined: fmtDate(u.created_at),
    }))
    return { users }
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
        token_earn: 'Token авсан (consolation)',
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
}
