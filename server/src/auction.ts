import { db, getLot, getUser, recordTxn, type LotRow } from './db.js'
import { broadcast } from './ws.js'

/** Оролцоогүй шатанд дахин орох хураамж (кредит) */
export const REJOIN_COST = 5

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Клиент рүү буцаах лотын snapshot */
export function lotSnapshot(lot: LotRow) {
  return {
    id: lot.id,
    code: lot.code,
    title: lot.title,
    subtitle: lot.subtitle,
    price: lot.current_price,
    status: lot.status,
    currentStage: lot.current_stage,
    totalStages: lot.total_stages,
    softCloseSec: lot.soft_close_sec,
    endsAt: lot.ends_at,
    bidCount: lot.bid_count,
    winnerUserId: lot.winner_user_id,
  }
}

function hasParticipation(lotId: number, userId: number, stage: number, via?: string): boolean {
  const row = via
    ? db
        .prepare('SELECT 1 FROM participation WHERE lot_id=? AND user_id=? AND stage=? AND via=?')
        .get(lotId, userId, stage, via)
    : db
        .prepare('SELECT 1 FROM participation WHERE lot_id=? AND user_id=? AND stage=?')
        .get(lotId, userId, stage)
  return !!row
}

/** Хэрэглэгч энэ шатанд bid хийх эрхтэй юу? */
export function gatingStatus(lot: LotRow, userId: number | null) {
  if (!userId || lot.current_stage === 1) return { canBid: true as const }
  if (hasParticipation(lot.id, userId, lot.current_stage - 1)) return { canBid: true as const }
  if (hasParticipation(lot.id, userId, lot.current_stage, 'rejoin')) return { canBid: true as const }
  return {
    canBid: false as const,
    lockedAtStage: lot.current_stage - 1,
    rejoinCost: REJOIN_COST,
  }
}

/** Bid хийх — бүх шалгалт + өөрчлөлт нэг транзакцад */
export const placeBid = db.transaction((userId: number, lotId: number, inc: number) => {
  if (![1, 2, 3].includes(inc)) throw new ApiError(400, 'Нэмэгдэл 1, 2, 3₮ л байна')

  const lot = getLot(lotId)
  if (!lot || lot.status !== 'live') throw new ApiError(400, 'Лот идэвхгүй байна')

  const user = getUser(userId)
  if (!user) throw new ApiError(401, 'Нэвтрэх шаардлагатай')
  if (!user.verified) throw new ApiError(403, 'Имэйлээ баталгаажуулна уу')
  if (user.credits < 1) throw new ApiError(402, 'Кредит хүрэлцэхгүй байна')

  const gate = gatingStatus(lot, userId)
  if (!gate.canBid)
    throw new ApiError(
      403,
      `Та ${gate.lockedAtStage}-р шатанд оролцоогүй — ${REJOIN_COST} кредит төлж орох боломжтой`,
    )

  const now = Date.now()
  const stage = lot.current_stage
  const newPrice = lot.current_price + inc
  const newBidCount = lot.bid_count + 1
  // Шат урагшлах: bid-ийн тоо шатны хэмжээнд хүрмэгц
  const newStage = Math.min(lot.total_stages, Math.floor(newBidCount / lot.bids_per_stage) + 1)
  const endsAt = now + lot.soft_close_sec * 1000

  db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(userId)
  db.prepare(
    'UPDATE lots SET current_price=?, bid_count=?, current_stage=?, ends_at=? WHERE id=?',
  ).run(newPrice, newBidCount, newStage, endsAt, lotId)
  db.prepare(
    'INSERT INTO bids (lot_id, user_id, increment, price_after, stage, created_at) VALUES (?,?,?,?,?,?)',
  ).run(lotId, userId, inc, newPrice, stage, now)
  db.prepare(
    'INSERT OR IGNORE INTO participation (lot_id, user_id, stage, via) VALUES (?,?,?,?)',
  ).run(lotId, userId, stage, 'bid')
  recordTxn(userId, 'bid', { credits: -1, meta: JSON.stringify({ lotId, inc }) })

  const updated = getLot(lotId)!
  broadcast({
    type: 'bid',
    lotId,
    price: updated.current_price,
    endsAt: updated.ends_at,
    stage: updated.current_stage,
    bidCount: updated.bid_count,
    bid: { user: getUser(userId)!.name || getUser(userId)!.email, inc },
  })
  return { lot: lotSnapshot(updated), credits: getUser(userId)!.credits }
})

/** Оролцоогүй шатанд 5 кредит төлж орох */
export const rejoinStage = db.transaction((userId: number, lotId: number) => {
  const lot = getLot(lotId)
  if (!lot || lot.status !== 'live') throw new ApiError(400, 'Лот идэвхгүй байна')

  const user = getUser(userId)
  if (!user) throw new ApiError(401, 'Нэвтрэх шаардлагатай')

  const gate = gatingStatus(lot, userId)
  if (gate.canBid) throw new ApiError(400, 'Та энэ шатанд аль хэдийн оролцох эрхтэй')
  if (user.credits < REJOIN_COST)
    throw new ApiError(402, `${REJOIN_COST} кредит хүрэлцэхгүй байна`)

  db.prepare('UPDATE users SET credits = credits - ? WHERE id = ?').run(REJOIN_COST, userId)
  db.prepare(
    'INSERT OR IGNORE INTO participation (lot_id, user_id, stage, via) VALUES (?,?,?,?)',
  ).run(lotId, userId, lot.current_stage, 'rejoin')
  recordTxn(userId, 'rejoin_fee', {
    credits: -REJOIN_COST,
    meta: JSON.stringify({ lotId, stage: lot.current_stage }),
  })

  return { credits: getUser(userId)!.credits }
})

/** Лот хаах — ялагч тодруулж, ялагдагсдын кредитийг Token болгож буцаана */
const closeLot = db.transaction((lot: LotRow) => {
  const lastBid = db
    .prepare('SELECT user_id FROM bids WHERE lot_id=? ORDER BY id DESC LIMIT 1')
    .get(lot.id) as { user_id: number } | undefined
  const winnerId = lastBid?.user_id ?? null

  db.prepare('UPDATE lots SET status=?, winner_user_id=? WHERE id=?').run(
    'closed',
    winnerId,
    lot.id,
  )

  if (winnerId) {
    db.prepare('UPDATE users SET wins = wins + 1 WHERE id = ?').run(winnerId)
  }

  // Consolation: ялагчаас бусад оролцогчийн bid бүр = 1 Token
  const spenders = db
    .prepare('SELECT user_id, COUNT(*) AS cnt FROM bids WHERE lot_id=? GROUP BY user_id')
    .all(lot.id) as { user_id: number; cnt: number }[]
  for (const s of spenders) {
    if (s.user_id === winnerId) continue
    db.prepare('UPDATE users SET tokens = tokens + ? WHERE id = ?').run(s.cnt, s.user_id)
    recordTxn(s.user_id, 'token_earn', {
      tokens: s.cnt,
      meta: JSON.stringify({ lotId: lot.id, code: lot.code }),
    })
  }

  const winner = winnerId ? getUser(winnerId) : undefined
  broadcast({
    type: 'lot_closed',
    lotId: lot.id,
    code: lot.code,
    finalPrice: lot.current_price,
    winner: winner ? winner.name || winner.email : null,
  })
})

/** Хугацаа дууссан live лотуудыг хаадаг tick */
export function startEngine() {
  setInterval(() => {
    const now = Date.now()
    const expired = db
      .prepare("SELECT * FROM lots WHERE status='live' AND ends_at IS NOT NULL AND ends_at <= ?")
      .all(now) as LotRow[]
    for (const lot of expired) closeLot(lot)
  }, 500)
}
