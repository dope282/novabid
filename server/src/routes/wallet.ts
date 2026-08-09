import type { FastifyInstance } from 'fastify'
import { db, getUser, recordTxn } from '../db.js'
import { requireUser, userSnapshot } from '../auth.js'

/** Кредит багцууд — сервер талд эрх мэдэлтэй жагсаалт */
const PACKS: Record<string, { credits: number; priceMnt: number }> = {
  p1: { credits: 10, priceMnt: 10000 },
  p2: { credits: 25, priceMnt: 20000 },
  p3: { credits: 50, priceMnt: 35000 },
  p4: { credits: 100, priceMnt: 60000 },
}

export function walletRoutes(app: FastifyInstance) {
  /** Багцуудын жагсаалт */
  app.get('/api/wallet/packs', async () => ({
    packs: Object.entries(PACKS).map(([id, p]) => ({ id, ...p })),
  }))

  /**
   * Кредит цэнэглэх — MOCK QPay.
   * Жинхэнэ QPay merchant API холбогдох хүртэл шууд амжилттай гэж үзнэ.
   */
  const topup = db.transaction((userId: number, packId: string) => {
    const pack = PACKS[packId]
    db.prepare('UPDATE users SET credits = credits + ? WHERE id = ?').run(pack.credits, userId)
    recordTxn(userId, 'purchase', {
      credits: pack.credits,
      meta: JSON.stringify({ packId, priceMnt: pack.priceMnt, method: 'qpay-mock' }),
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
    const { packId } = (req.body ?? {}) as { packId?: string }
    if (!packId || !PACKS[packId]) return reply.code(400).send({ error: 'Багц олдсонгүй' })
    topup(user.id, packId)
    return { ok: true, user: userSnapshot(getUser(user.id)!) }
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
