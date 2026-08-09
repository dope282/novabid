import type { FastifyInstance } from 'fastify'
import { db, getLot, type LotRow } from '../db.js'
import { getUid, requireUser } from '../auth.js'
import { ApiError, gatingStatus, lotSnapshot, placeBid, rejoinStage } from '../auction.js'

function recentBids(lotId: number, limit = 6) {
  return (
    db
      .prepare(
        `SELECT b.increment, b.price_after, b.created_at, u.name, u.email
         FROM bids b JOIN users u ON u.id = b.user_id
         WHERE b.lot_id = ? ORDER BY b.id DESC LIMIT ?`,
      )
      .all(lotId, limit) as {
      increment: number
      price_after: number
      created_at: number
      name: string
      email: string
    }[]
  ).map((b) => ({
    user: b.name || b.email.split('@')[0],
    inc: b.increment,
    priceAfter: b.price_after,
    at: b.created_at,
  }))
}

export function lotRoutes(app: FastifyInstance) {
  /** Идэвхтэй + удахгүй болох лотууд */
  app.get('/api/lots', async (req) => {
    const uid = getUid(req)
    const lots = db
      .prepare("SELECT * FROM lots WHERE status IN ('live','scheduled') ORDER BY id")
      .all() as LotRow[]
    return {
      serverNow: Date.now(),
      lots: lots.map((l) => ({
        ...lotSnapshot(l),
        gating: l.status === 'live' ? gatingStatus(l, uid) : { canBid: false },
      })),
    }
  })

  /** Лотын дэлгэрэнгүй + сүүлийн bid-үүд + gating */
  app.get('/api/lots/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const lot = getLot(id)
    if (!lot) return reply.code(404).send({ error: 'Лот олдсонгүй' })
    const uid = getUid(req)
    return {
      serverNow: Date.now(),
      lot: lotSnapshot(lot),
      gating: gatingStatus(lot, uid),
      bids: recentBids(id),
    }
  })

  /** Bid хийх */
  app.post('/api/lots/:id/bid', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const id = Number((req.params as { id: string }).id)
    const { inc } = (req.body ?? {}) as { inc?: number }
    try {
      return placeBid(user.id, id, Number(inc))
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  /** Оролцоогүй шатанд 5 кредит төлж орох */
  app.post('/api/lots/:id/rejoin', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const id = Number((req.params as { id: string }).id)
    try {
      return rejoinStage(user.id, id)
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })
}
