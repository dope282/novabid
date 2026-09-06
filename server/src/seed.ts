/** Demo дата — анхны байдлаар дүүргэнэ. Дахин ажиллуулбал алгасна. */
import { db, initDb, recordTxn } from './db.js'
import { hashPassword } from './auth.js'

initDb()

const already = (db.prepare('SELECT COUNT(*) AS c FROM lots').get() as { c: number }).c
if (already > 0) {
  console.log('Seed аль хэдийн хийгдсэн — алгасаж байна. (Шинээр эхлэх бол data/novabid.db устгана уу)')
  process.exit(0)
}

const now = Date.now()

function addUser(
  email: string,
  name: string,
  opts: { credits?: number; tokens?: number; wins?: number; admin?: boolean; ref?: string } = {},
): number {
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, verified, referral_code, credits, tokens, wins, is_admin, created_at)
       VALUES (?,?,?,1,?,?,?,?,?,?)`,
    )
    .run(
      email,
      hashPassword('12345678'),
      name,
      opts.ref ?? `${name.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      opts.credits ?? 50,
      opts.tokens ?? 0,
      opts.wins ?? 0,
      opts.admin ? 1 : 0,
      now,
    )
  return Number(info.lastInsertRowid)
}

// --- Хэрэглэгчид ---
const demo = addUser('bat.erdene@gmail.com', 'Бат-Эрдэнэ', {
  credits: 24,
  tokens: 132,
  wins: 2,
  ref: 'BAT-24KH',
})
addUser('admin@novabid.mn', 'Админ', { admin: true, credits: 999 })
const bots = [
  addUser('tulga.x@example.com', 'tulga.x', { credits: 100 }),
  addUser('anar99@example.com', 'anar_99', { credits: 100 }),
  addUser('zolo.mn@example.com', 'zolo.mn', { credits: 100 }),
  addUser('saraa.d@example.com', 'saraa.d', { credits: 100 }),
  addUser('batka7@example.com', 'batka_7', { credits: 100 }),
]

// --- Лотууд (frontend mock-той ижил төлөв) ---
/**
 * Round бүр өөрийн хугацаа, bid босготой. Энд Round ахих тусам хугацааг нь уртасгаж
 * (эхний Round-ууд хурдан, сүүлийнх нь удаан) demo байдлаар үзүүлэв.
 */
function addLot(
  code: string,
  title: string,
  subtitle: string,
  price: number,
  bidCount: number,
  bidsPerStage: number,
  stage: number,
  roundMinutes: number[],
): number {
  const info = db
    .prepare(
      `INSERT INTO lots (code, title, subtitle, current_price, status, current_stage, total_stages,
        bids_per_stage, ends_at, bid_count, created_at)
       VALUES (?,?,?,?,'live',?,?,?,?,?,?)`,
    )
    .run(
      code,
      title,
      subtitle,
      price,
      stage,
      roundMinutes.length,
      bidsPerStage,
      now + roundMinutes[stage - 1] * 60_000,
      bidCount,
      now,
    )
  const id = Number(info.lastInsertRowid)
  db.prepare('UPDATE lots SET round_started_at=? WHERE id=?').run(now, id)
  roundMinutes.forEach((min, i) => {
    const last = i === roundMinutes.length - 1
    db.prepare(
      `INSERT INTO lot_rounds (lot_id, round_no, duration_sec, reset_sec, bids_required)
       VALUES (?,?,?,?,?)`,
    ).run(
      id,
      i + 1,
      min * 60,
      // Bid ирэх бүрд 30 секунд сэргэнэ — Round-ын төгсгөлд уралдаан үүснэ
      30,
      // Сүүлийн Round-д bid босго байхгүй: зөвхөн хугацаагаар дуусна
      last ? 0 : bidsPerStage,
    )
  })
  return id
}

// Round 1–11: 30 мин-ээс эхэлж аажим уртасна (сүүлийнх нь 30 секунд болж солигдоно)
const ramp = [30, 45, 60, 60, 90, 90, 120, 120, 180, 180, 240]

const lot1 = addLot('LOT 042', 'iPhone 16 Pro · 256GB', 'iPhone 16 Pro · 256GB · Titanium', 41254, 128, 15, 9, ramp)
const lot2 = addLot('LOT 043', 'Dyson V15 Detect', 'Dyson V15 Detect Absolute', 12847, 63, 18, 4, ramp)
const lot3 = addLot('LOT 044', 'PlayStation 5 Pro', 'PlayStation 5 Pro · 2TB', 28103, 15, 20, 8, ramp)
const lot4 = addLot('LOT 045', 'MacBook Air M4', 'MacBook Air M4 · 15" · 512GB', 55032, 204, 22, 10, ramp)

// --- Lot 1 дээрх сүүлийн bid-үүд (feed) ---
const feedBids: [number, number][] = [
  [bots[4], 2],
  [bots[3], 1],
  [bots[2], 3],
  [bots[1], 1],
  [bots[0], 2],
]
let p = 41254 - feedBids.reduce((s, [, i]) => s + i, 0)
feedBids.forEach(([uid, inc], i) => {
  p += inc
  db.prepare(
    'INSERT INTO bids (lot_id, user_id, increment, price_after, stage, created_at) VALUES (?,?,?,?,?,?)',
  ).run(lot1, uid, inc, p, 9, now - (feedBids.length - i) * 6000)
})

// --- Gating demo ---
// Demo хэрэглэгч lot1-ийн 8-р шатанд оролцсон → 9-р шатанд bid хийж чадна
db.prepare("INSERT INTO participation (lot_id, user_id, stage, via) VALUES (?,?,8,'bid')").run(lot1, demo)
// lot2 (Dyson): 3-р шатанд оролцоогүй → түгжигдсэн, 5 кредитээр орж болно
// lot3, lot4: шат 1-8 — эхний шат биш тул мөн rejoin шаардлагатай болно (шинэ хэрэглэгчид)

// --- Санал хураалт: "Дараагийн лотыг та сонго" ---
const pollId = Number(
  db
    .prepare(
      `INSERT INTO polls (title, subtitle, max_picks, closes_at, status, created_at)
       VALUES (?,?,1,?, 'open', ?)`,
    )
    .run(
      'Дараагийн лотыг та сонго',
      'Хамгийн олон санал авсан бараа дараагийн дуудлага худалдаанд орно.',
      now + 18 * 3600_000,
      now,
    ).lastInsertRowid,
)
const candidates: [string, string, number][] = [
  ['Samsung 55" QLED TV', 'Техник', 412],
  ['Apple Watch Series 10', 'Гаджет', 508],
  ['Nintendo Switch 2', 'Тоглоом', 356],
]
candidates.forEach(([title, tag, base], i) => {
  db.prepare(
    'INSERT INTO poll_candidates (poll_id, title, tag, base_votes, sort_order) VALUES (?,?,?,?,?)',
  ).run(pollId, title, tag, base, i)
})

// --- Token дэлгүүрийн бараа ---
const shop: [string, string, number, number | null][] = [
  ['JBL Go 4 чанга яригч', 'Техник', 180, 12],
  ['Xiaomi Smart Band 9', 'Техник', 220, 8],
  ['Stanley термос 0.6л', 'Гэр ахуй', 140, 20],
  ['Anker 10,000mAh цэнэглэгч', 'Техник', 200, 15],
  ['Хэрэглэгчийн иж бүрдэл', 'Гэр ахуй', 160, null],
  ['Аяллын гэрэл', 'Аялал', 120, 30],
]
shop.forEach(([title, category, tokens, stock]) => {
  db.prepare(
    `INSERT INTO shop_items (title, category, tokens, stock, status, created_at)
     VALUES (?,?,?,?, 'active', ?)`,
  ).run(title, category, tokens, stock, now)
})

// --- Урилга (demo): нэг нь худалдан авалт хийсэн, нөгөө нь хүлээгдэж буй ---
db.prepare('UPDATE users SET referred_by=? WHERE id IN (?,?)').run(demo, bots[0], bots[1])

// --- Гүйлгээний түүх (demo) ---
recordTxn(demo, 'purchase', { credits: 25, meta: JSON.stringify({ packId: 2, priceMnt: 20000, method: 'qpay-mock' }) })
// bots[0] худалдан авалт хийсэн тул demo урамшуулалаа авсан
recordTxn(bots[0], 'purchase', { credits: 10, meta: JSON.stringify({ packId: 1, priceMnt: 10000, method: 'qpay-mock' }) })
recordTxn(demo, 'referral', { credits: 2, meta: JSON.stringify({ invitedUserId: bots[0] }) })

console.log('Seed амжилттай:')
console.log(`  Хэрэглэгч: bat.erdene@gmail.com / 12345678 (24 кредит, 132 token)`)
console.log(`  Админ:     admin@novabid.mn / 12345678`)
console.log(`  Лот: ${[lot1, lot2, lot3, lot4].join(', ')} (live)`)
