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
function addLot(
  code: string,
  title: string,
  subtitle: string,
  price: number,
  bidCount: number,
  bidsPerStage: number,
  minutesLeft: number,
): number {
  const stage = Math.min(11, Math.floor(bidCount / bidsPerStage) + 1)
  const info = db
    .prepare(
      `INSERT INTO lots (code, title, subtitle, current_price, status, current_stage, total_stages,
        bids_per_stage, soft_close_sec, ends_at, bid_count, created_at)
       VALUES (?,?,?,?,'live',?,11,?,15,?,?,?)`,
    )
    .run(code, title, subtitle, price, stage, bidsPerStage, now + minutesLeft * 60_000, bidCount, now)
  return Number(info.lastInsertRowid)
}

const lot1 = addLot('LOT 042', 'iPhone 16 Pro · 256GB', 'iPhone 16 Pro · 256GB · Titanium', 41254, 128, 15, 90)
const lot2 = addLot('LOT 043', 'Dyson V15 Detect', 'Dyson V15 Detect Absolute', 12847, 63, 18, 120)
const lot3 = addLot('LOT 044', 'PlayStation 5 Pro', 'PlayStation 5 Pro · 2TB', 28103, 15, 2, 75)
const lot4 = addLot('LOT 045', 'MacBook Air M4', 'MacBook Air M4 · 15" · 512GB', 55032, 204, 22, 60)

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

// --- Гүйлгээний түүх (demo) ---
recordTxn(demo, 'purchase', { credits: 25, meta: JSON.stringify({ packId: 'p2', priceMnt: 20000, method: 'qpay-mock' }) })
recordTxn(demo, 'referral', { credits: 2, meta: JSON.stringify({ invitedUserId: bots[0] }) })

console.log('Seed амжилттай:')
console.log(`  Хэрэглэгч: bat.erdene@gmail.com / 12345678 (24 кредит, 132 token)`)
console.log(`  Админ:     admin@novabid.mn / 12345678`)
console.log(`  Лот: ${[lot1, lot2, lot3, lot4].join(', ')} (live)`)
