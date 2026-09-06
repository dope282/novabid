import { DEFAULT_ROUND_SEC, db, getLot, getUser, recordTxn, type LotRoundRow, type LotRow } from './db.js'
import { broadcast } from './ws.js'
import { avatarColorOf } from './auth.js'

/** Лотын бүх Round тохиргоо */
export function roundsOf(lotId: number): LotRoundRow[] {
  return db
    .prepare('SELECT * FROM lot_rounds WHERE lot_id=? ORDER BY round_no')
    .all(lotId) as LotRoundRow[]
}

function roundAt(lotId: number, no: number): LotRoundRow | undefined {
  return db.prepare('SELECT * FROM lot_rounds WHERE lot_id=? AND round_no=?').get(lotId, no) as
    | LotRoundRow
    | undefined
}

/** Тухайн Round дотор хийгдсэн bid-ийн тоо */
function bidsInRound(lotId: number, roundNo: number): number {
  return (db.prepare('SELECT COUNT(*) AS c FROM bids WHERE lot_id=? AND stage=?').get(lotId, roundNo) as {
    c: number
  }).c
}

/**
 * Timer дээр гүйж байгаа хугацаа = СЭРГЭХ цонх.
 * Round эхлэхэд болон bid ирэх бүрд эхнээсээ тавигдана.
 * Энэ тэглэх үед аукцион дуусаж, сүүлд bid хийсэн хүн ялна.
 */
function resetTimer(round: LotRoundRow | undefined, now: number): number {
  return now + (round?.reset_sec ?? 30) * 1000
}

/**
 * Round бүрийн ТОВЛОСОН эхлэх/дуусах цаг — зөвхөн хэрэглэгчид харуулах зорилготой.
 * `duration_sec`-ээр дараалуулан тооцно. Аукционы бодит явцад нөлөөлөхгүй:
 * Round нь bid босгоор л дуусдаг, timer тэглэх нь аукционыг бүхэлд нь хаадаг.
 * Round эрт дуусвал дараагийнх нь урагшилж дахин тооцогдоно.
 */
export function roundSchedule(lot: LotRow) {
  const rounds = roundsOf(lot.id)
  let cursor = lot.round_started_at ?? lot.starts_at ?? lot.created_at
  return rounds.map((r) => {
    if (r.round_no < lot.current_stage) {
      return { round: r.round_no, startsAt: null, endsAt: null, done: true }
    }
    const startsAt = cursor
    cursor = startsAt + r.duration_sec * 1000
    return { round: r.round_no, startsAt, endsAt: cursor, done: false }
  })
}

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
  const round = roundAt(lot.id, lot.current_stage)
  return {
    id: lot.id,
    code: lot.code,
    title: lot.title,
    subtitle: lot.subtitle,
    description: lot.description,
    image: lot.image_url,
    price: lot.current_price,
    status: lot.status,
    currentStage: lot.current_stage,
    totalStages: lot.total_stages,
    /** ОДООГИЙН Round дуусах хугацаа */
    endsAt: lot.ends_at,
    /** Одоогийн Round-ын товлосон урт (progress bar-т) */
    roundDurationSec: round?.duration_sec ?? DEFAULT_ROUND_SEC,
    /** Bid ирэх бүрд сэргэх цонх — төгсгөлийн уралдаан */
    roundResetSec: round?.reset_sec ?? 30,
    roundStartedAt: lot.round_started_at,
    /** Энэ Round-д хийгдсэн bid; босго null бол ХЯЗГААРГҮЙ */
    roundBids: bidsInRound(lot.id, lot.current_stage),
    roundBidsRequired: round && round.bids_required === 0 ? null : (round?.bids_required ?? lot.bids_per_stage),
    startsAt: lot.starts_at,
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
  // Engine 500мс тутам ажилладаг тул хугацаа дуусаад хаагдаагүй байх цонх үүснэ.
  // Тэр зайд ирсэн bid-ийг хүлээж авбал аукцион дуусашгүй сунана.
  if (lot.ends_at !== null && lot.ends_at <= Date.now())
    throw new ApiError(400, 'Аукционы хугацаа дууссан байна')

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

  // Bid бүрд сэргэх timer эхнээсээ. Энэ тэглэвэл аукцион дуусна.
  const round = roundAt(lotId, stage)
  const endsAt = resetTimer(round, now)

  db.prepare('UPDATE users SET credits = credits - 1 WHERE id = ?').run(userId)
  db.prepare('UPDATE lots SET current_price=?, bid_count=?, ends_at=? WHERE id=?').run(
    newPrice,
    newBidCount,
    endsAt,
    lotId,
  )
  db.prepare(
    'INSERT INTO bids (lot_id, user_id, increment, price_after, stage, created_at) VALUES (?,?,?,?,?,?)',
  ).run(lotId, userId, inc, newPrice, stage, now)
  db.prepare(
    'INSERT OR IGNORE INTO participation (lot_id, user_id, stage, via) VALUES (?,?,?,?)',
  ).run(lotId, userId, stage, 'bid')
  recordTxn(userId, 'bid', { credits: -1, meta: JSON.stringify({ lotId, inc }) })

  broadcast({
    type: 'bid',
    lotId,
    price: newPrice,
    endsAt,
    stage,
    bidCount: newBidCount,
    bid: {
      user: user.name || user.email.split('@')[0],
      color: avatarColorOf(user),
      inc,
    },
  })

  // Bid босго давбал дараагийн Round эхэлнэ. Сүүлийн Round дээр давбал аукцион дуусна.
  // bids_required = 0 бол ХЯЗГААРГҮЙ — Round зөвхөн timer тэглэхэд (=аукцион хаагдахад) дуусна.
  const required = round?.bids_required ?? lot.bids_per_stage
  if (required > 0 && bidsInRound(lotId, stage) >= required) advanceRound(getLot(lotId)!)

  return { lot: lotSnapshot(getLot(lotId)!), credits: getUser(userId)!.credits }
})

/** Оролцоогүй шатанд 5 кредит төлж орох */
export const rejoinStage = db.transaction((userId: number, lotId: number) => {
  const lot = getLot(lotId)
  if (!lot || lot.status !== 'live') throw new ApiError(400, 'Лот идэвхгүй байна')
  if (lot.ends_at !== null && lot.ends_at <= Date.now())
    throw new ApiError(400, 'Аукционы хугацаа дууссан байна')

  const user = getUser(userId)
  if (!user) throw new ApiError(401, 'Нэвтрэх шаардлагатай')
  // placeBid нь verified шаарддаг тул энд шалгахгүй бол хэрэглэгч 5 кредит
  // төлчхөөд bid хийж чадахгүй үлдэнэ.
  if (!user.verified) throw new ApiError(403, 'Имэйлээ баталгаажуулна уу')

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

  db.prepare('UPDATE lots SET status=?, winner_user_id=?, closed_at=? WHERE id=?').run(
    'closed',
    winnerId,
    Date.now(),
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

/**
 * Round дууслаа — дараагийнх руу шилжих эсвэл (сүүлийнх бол) лотыг хаана.
 * Хугацаа дуусах болон bid босго хүрэх хоёулаа энд ирнэ.
 */
function advanceRound(lot: LotRow) {
  // Сүүлийн Round дээр босго давсан бол үргэлжлэх Round үлдээгүй — аукцион хаагдана
  if (lot.current_stage >= lot.total_stages) {
    closeLot(lot)
    return
  }
  const next = lot.current_stage + 1
  const round = roundAt(lot.id, next)
  const now = Date.now()
  const endsAt = resetTimer(round, now)
  db.prepare('UPDATE lots SET current_stage=?, round_started_at=?, ends_at=? WHERE id=?').run(
    next,
    now,
    endsAt,
    lot.id,
  )

  broadcast({
    type: 'round',
    lotId: lot.id,
    stage: next,
    endsAt,
    roundResetSec: round?.reset_sec ?? 30,
    roundBidsRequired: round?.bids_required ?? lot.bids_per_stage,
  })
}

/** Админ гараар лот хаах — хугацаа дуусахыг хүлээхгүй */
export function closeLotNow(lotId: number) {
  const lot = getLot(lotId)
  if (!lot) throw new ApiError(404, 'Лот олдсонгүй')
  if (lot.status !== 'live') throw new ApiError(400, 'Зөвхөн идэвхтэй лотыг хаана')
  closeLot(lot)
  return lotSnapshot(getLot(lotId)!)
}

/**
 * Сэргэх timer тэглэсэн лотыг ХААНА — хэн ч bid хийлгүй өнгөрсөн тул
 * хамгийн сүүлд bid хийсэн хүн ялна. (Round ахих нь зөвхөн bid босгоор болно.)
 */
export function startEngine() {
  setInterval(() => {
    const now = Date.now()

    // Хуваарьт ноорог лотыг товлосон цагт нь автоматаар эхлүүлнэ
    const due = db
      .prepare("SELECT * FROM lots WHERE status='scheduled' AND starts_at IS NOT NULL AND starts_at <= ?")
      .all(now) as LotRow[]
    for (const lot of due) startLot(lot)

    const expired = db
      .prepare("SELECT * FROM lots WHERE status='live' AND ends_at IS NOT NULL AND ends_at <= ?")
      .all(now) as LotRow[]
    for (const lot of expired) closeLot(lot)

    // Хугацаа нь дууссан санал хураалтыг хаана — эс бөгөөс админд "НЭЭЛТТЭЙ" гэж
    // харагдсаар, нүүр хуудсанд санал өгөх боломжгүй виджет үлдэнэ
    db.prepare("UPDATE polls SET status='closed' WHERE status='open' AND closes_at IS NOT NULL AND closes_at <= ?")
      .run(now)
  }, 500)
}

/** Ноорог лотыг live болгож Round 1-ийг эхлүүлнэ */
export function startLot(lot: LotRow) {
  const now = Date.now()
  const round = roundAt(lot.id, 1)
  const endsAt = resetTimer(round, now)
  db.prepare(
    "UPDATE lots SET status='live', current_stage=1, round_started_at=?, ends_at=? WHERE id=?",
  ).run(now, endsAt, lot.id)

  broadcast({
    type: 'round',
    lotId: lot.id,
    stage: 1,
    endsAt,
    roundResetSec: round?.reset_sec ?? 30,
    roundBidsRequired: round?.bids_required ?? lot.bids_per_stage,
  })
}
