import type { FastifyInstance } from 'fastify'
import { db, getLot, getUser, type LotRow } from '../db.js'
import { avatarColorOf, getUid, requireUser } from '../auth.js'
import { ApiError, gatingStatus, lotSnapshot, placeBid, rejoinStage, roundSchedule } from '../auction.js'

function uid2IsAdmin(uid: number | null): boolean {
  return !!(uid && getUser(uid)?.is_admin)
}

function recentBids(lotId: number, limit = 6) {
  return (
    db
      .prepare(
        `SELECT b.increment, b.price_after, b.created_at, u.id AS uid, u.name, u.email, u.avatar_color
         FROM bids b JOIN users u ON u.id = b.user_id
         WHERE b.lot_id = ? ORDER BY b.id DESC LIMIT ?`,
      )
      .all(lotId, limit) as {
      increment: number
      price_after: number
      created_at: number
      uid: number
      name: string
      email: string
      avatar_color: string | null
    }[]
  ).map((b) => ({
    user: b.name || b.email.split('@')[0],
    // Өнгө нь хэрэглэгчээс хамаарна — жагсаалт дахь байрлалаас биш
    color: avatarColorOf({ id: b.uid, avatar_color: b.avatar_color }),
    inc: b.increment,
    priceAfter: b.price_after,
    at: b.created_at,
  }))
}

export function lotRoutes(app: FastifyInstance) {
  /**
   * Идэвхтэй лотууд.
   * `scheduled` нь нийтлээгүй ноорог — админ гараар л live болгодог тул энд буцаахгүй
   * (буцаавал зарлаагүй барааны нэр, зураг ил гарна).
   */
  app.get('/api/lots', async (req) => {
    const uid = getUid(req)
    const lots = db.prepare("SELECT * FROM lots WHERE status='live' ORDER BY id").all() as LotRow[]

    // Сүүлд хаагдсан лотууд — нүүр хуудсанд "өмнөх дуудлага худалдаа" болж харагдана
    const closedRows = db
      .prepare(
        `SELECT l.*, u.name AS winner_name, u.email AS winner_email
         FROM lots l LEFT JOIN users u ON u.id = l.winner_user_id
         WHERE l.status='closed'
         ORDER BY COALESCE(l.closed_at, l.ends_at, l.created_at) DESC LIMIT 8`,
      )
      .all() as (LotRow & { winner_name: string | null; winner_email: string | null })[]

    return {
      serverNow: Date.now(),
      lots: lots.map((l) => ({ ...lotSnapshot(l), gating: gatingStatus(l, uid) })),
      closed: closedRows.map((l) => ({
        id: l.id,
        code: l.code,
        title: l.title,
        image: l.image_url,
        finalPrice: l.current_price,
        bidCount: l.bid_count,
        winner: l.winner_name || l.winner_email?.split('@')[0] || null,
        closedAt: l.closed_at ?? l.ends_at,
      })),
    }
  })

  /** Лотын дэлгэрэнгүй + сүүлийн bid-үүд + gating */
  app.get('/api/lots/:id', async (req, reply) => {
    const id = Number((req.params as { id: string }).id)
    const lot = getLot(id)
    if (!lot) return reply.code(404).send({ error: 'Лот олдсонгүй' })
    const uid = getUid(req)
    // Ноорогийг зөвхөн админ урьдчилан харна
    if (lot.status === 'scheduled' && !uid2IsAdmin(uid))
      return reply.code(404).send({ error: 'Лот олдсонгүй' })
    return {
      serverNow: Date.now(),
      lot: lotSnapshot(lot),
      gating: gatingStatus(lot, uid),
      bids: recentBids(id),
      // Round бүрийн товлосон эхлэх/дуусах цаг — хэрэглэгчид ил харагдана
      schedule: roundSchedule(lot),
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
