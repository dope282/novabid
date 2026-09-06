import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * SQLite болон байршуулсан зураг хадгалагдах хавтас.
 * `DATA_DIR`-ээр өөрчилж болно (Docker/NAS дээр volume эсвэл share руу заахад).
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data')

mkdirSync(DATA_DIR, { recursive: true })
const dataDir = DATA_DIR

export const db = new Database(path.join(dataDir, 'novabid.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/** Хуучин лотуудын Round-д нөхөж өгөх хугацаа (1 цаг) */
export const DEFAULT_ROUND_SEC = 3600

/** Хүснэгтүүдийг үүсгэнэ (байхгүй бол) */
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,           -- Google-ээр бүртгүүлсэн бол '' (нууц үгээр нэвтэрч болохгүй)
      google_sub    TEXT,                    -- Google Account-ын тогтмол ID; индексээр UNIQUE
      name          TEXT NOT NULL DEFAULT '',
      avatar_color  TEXT,                    -- bid feed дэх дүрсний өнгө (NULL = id-аар автоматаар)
      blocked       INTEGER NOT NULL DEFAULT 0,  -- 1 = хаагдсан: нэвтрэх, bid хийх боломжгүй
      verified      INTEGER NOT NULL DEFAULT 0,
      verify_code   TEXT,
      referral_code TEXT UNIQUE,
      referred_by   INTEGER REFERENCES users(id),
      credits       INTEGER NOT NULL DEFAULT 0,
      tokens        INTEGER NOT NULL DEFAULT 0,
      wins          INTEGER NOT NULL DEFAULT 0,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lots (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      code           TEXT NOT NULL UNIQUE,          -- "LOT 042"
      title          TEXT NOT NULL,
      subtitle       TEXT,
      description    TEXT,                          -- дэлгэрэнгүй тайлбар (detail хуудас)
      image_url      TEXT,                          -- "/uploads/<файл>" эсвэл NULL
      start_price    INTEGER NOT NULL DEFAULT 1,
      current_price  INTEGER NOT NULL DEFAULT 1,
      status         TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | live | closed
      current_stage  INTEGER NOT NULL DEFAULT 1,     -- одоогийн Round
      total_stages   INTEGER NOT NULL DEFAULT 11,    -- Round-ын тоо (lot_rounds-тай тэнцүү)
      bids_per_stage INTEGER NOT NULL DEFAULT 15,    -- шинэ Round-ын үндсэн bid босго
      starts_at         INTEGER,                    -- scheduled → live болох unix ms (NULL = гараар)
      round_started_at  INTEGER,                    -- одоогийн Round эхэлсэн unix ms (хатуу таглаанд)
      ends_at        INTEGER,                       -- ОДООГИЙН Round дуусах unix ms
      bid_count      INTEGER NOT NULL DEFAULT 0,
      winner_user_id INTEGER REFERENCES users(id),
      closed_at      INTEGER,                       -- хаагдсан unix ms
      created_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bids (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id      INTEGER NOT NULL REFERENCES lots(id),
      user_id     INTEGER NOT NULL REFERENCES users(id),
      increment   INTEGER NOT NULL,
      price_after INTEGER NOT NULL,
      stage       INTEGER NOT NULL,
      created_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id, id DESC);

    -- Round бүрийн тохиргоо. Round дуусах нөхцөл: хугацаа дуусах ЭСВЭЛ bid босго хүрэх
    -- (аль нь түрүүлснээр). Сүүлийн Round дуусмагц лот хаагдана.
    CREATE TABLE IF NOT EXISTS lot_rounds (
      lot_id        INTEGER NOT NULL REFERENCES lots(id),
      round_no      INTEGER NOT NULL,               -- 1-ээс эхэлнэ
      duration_sec  INTEGER NOT NULL,               -- Round-ын товлосон урт (секунд)
      reset_sec     INTEGER NOT NULL DEFAULT 30,    -- bid бүрд сэргэх цонх: төгсгөлийн уралдаан
      bids_required INTEGER NOT NULL,               -- 0 = ХЯЗГААРГҮЙ (зөвхөн хугацаагаар дуусна)
      PRIMARY KEY (lot_id, round_no)
    );

    -- Шат бүрийн оролцоо (gating): bid хийсэн эсвэл 5 кредит төлж орсон
    CREATE TABLE IF NOT EXISTS participation (
      lot_id  INTEGER NOT NULL REFERENCES lots(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      stage   INTEGER NOT NULL,
      via     TEXT NOT NULL DEFAULT 'bid',          -- bid | rejoin
      PRIMARY KEY (lot_id, user_id, stage)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      type       TEXT NOT NULL,   -- purchase | bid | rejoin_fee | token_earn | token_spend | referral
      credits    INTEGER NOT NULL DEFAULT 0,
      tokens     INTEGER NOT NULL DEFAULT 0,
      meta       TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id, id DESC);

    -- "Дараагийн лотыг сонго" санал хураалт. Нэг зэрэг зөвхөн нэг нь open байна.
    CREATE TABLE IF NOT EXISTS polls (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      subtitle   TEXT,
      max_picks  INTEGER NOT NULL DEFAULT 1,      -- хэрэглэгч хэдэн бараанд санал өгөх вэ
      closes_at  INTEGER,                          -- unix ms
      status     TEXT NOT NULL DEFAULT 'draft',   -- draft | open | closed
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS poll_candidates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      poll_id    INTEGER NOT NULL REFERENCES polls(id),
      title      TEXT NOT NULL,
      tag        TEXT,
      base_votes INTEGER NOT NULL DEFAULT 0,      -- админы тавьсан суурь тоо
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cand_poll ON poll_candidates(poll_id, sort_order);

    -- Нэг хэрэглэгч нэг нэр дэвшигчид нэг л удаа (PK хангана)
    CREATE TABLE IF NOT EXISTS poll_votes (
      poll_id      INTEGER NOT NULL REFERENCES polls(id),
      candidate_id INTEGER NOT NULL REFERENCES poll_candidates(id),
      user_id      INTEGER NOT NULL REFERENCES users(id),
      created_at   INTEGER NOT NULL,
      PRIMARY KEY (poll_id, candidate_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_votes_cand ON poll_votes(candidate_id);

    -- Token дэлгүүрийн бараа
    CREATE TABLE IF NOT EXISTS shop_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT '',
      tokens      INTEGER NOT NULL,            -- үнэ (Token)
      description TEXT,
      image_url   TEXT,                        -- "/uploads/<файл>"
      stock       INTEGER,                     -- NULL = хязгааргүй
      status      TEXT NOT NULL DEFAULT 'active',  -- active | hidden
      created_at  INTEGER NOT NULL
    );

    -- Token-оор солисон захиалга. title/tokens нь тухайн үеийн хувилбарыг хадгална
    -- (бараа хожим засагдсан ч захиалгын түүх өөрчлөгдөхгүй).
    CREATE TABLE IF NOT EXISTS shop_orders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      item_id    INTEGER REFERENCES shop_items(id),
      title      TEXT NOT NULL,
      tokens     INTEGER NOT NULL,
      status     TEXT NOT NULL DEFAULT 'pending',  -- pending | shipped | done | cancelled
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON shop_orders(user_id, id DESC);

    -- Кредит багцууд. Өмнө нь код дотор хатуу бичигдсэн байсан — админаас удирдана.
    CREATE TABLE IF NOT EXISTS credit_packs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      credits    INTEGER NOT NULL,
      price_mnt  INTEGER NOT NULL,
      best       INTEGER NOT NULL DEFAULT 0,   -- 1 = "хамгийн ашигтай" тэмдэглэгээ
      status     TEXT NOT NULL DEFAULT 'active', -- active | hidden
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `)

  migrate()
}

/**
 * Хуучин DB-д дутуу баганыг нэмнэ.
 * CREATE TABLE IF NOT EXISTS нь аль хэдийн үүссэн хүснэгтийг өөрчлөхгүй тул
 * шинэ багана нэмэх бүрт энд бүртгэнэ. Дахин ажиллуулахад аюулгүй.
 */
function migrate() {
  const cols = (table: string) =>
    (db.pragma(`table_info(${table})`) as { name: string }[]).map((c) => c.name)

  const lotCols = cols('lots')
  const lotAdds: Record<string, string> = {
    description: 'ALTER TABLE lots ADD COLUMN description TEXT',
    image_url: 'ALTER TABLE lots ADD COLUMN image_url TEXT',
    closed_at: 'ALTER TABLE lots ADD COLUMN closed_at INTEGER',
    starts_at: 'ALTER TABLE lots ADD COLUMN starts_at INTEGER',
    round_started_at: 'ALTER TABLE lots ADD COLUMN round_started_at INTEGER',
  }
  for (const [col, sql] of Object.entries(lotAdds)) {
    if (!lotCols.includes(col)) db.exec(sql)
  }

  // Сэргэх цонх нь Round-ын уртаас тусдаа талбар болов.
  // Хуучин `duration_sec` нь countdown байсан, `max_sec` нь дээд хязгаар байсан:
  //   reset_sec    ← хуучин duration_sec
  //   duration_sec ← хуучин max_sec (байхгүй бол хэвээр)
  const roundCols = cols('lot_rounds')
  if (!roundCols.includes('reset_sec')) {
    db.exec('ALTER TABLE lot_rounds ADD COLUMN reset_sec INTEGER NOT NULL DEFAULT 30')
    if (roundCols.includes('max_sec')) {
      db.exec('UPDATE lot_rounds SET reset_sec = MIN(duration_sec, 300)')
      db.exec('UPDATE lot_rounds SET duration_sec = COALESCE(max_sec, duration_sec)')
    }
  }
  for (const dead of ['max_sec', 'resets_on_bid']) {
    if (cols('lot_rounds').includes(dead)) db.exec(`ALTER TABLE lot_rounds DROP COLUMN ${dead}`)
  }
  // Одоо явж буй лотуудад Round эхэлсэн цагийг нөхнө (хатуу таглаа тооцоход хэрэгтэй)
  db.exec("UPDATE lots SET round_started_at = COALESCE(round_started_at, created_at) WHERE status='live'")

  if (!cols('users').includes('google_sub')) {
    db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT')
  }
  if (!cols('users').includes('avatar_color')) {
    db.exec('ALTER TABLE users ADD COLUMN avatar_color TEXT')
  }
  if (!cols('users').includes('blocked')) {
    db.exec('ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0')
  }

  // Багцууд хоосон бол хуучин код дотор байсан утгуудаар дүүргэнэ
  const packCount = (db.prepare('SELECT COUNT(*) AS c FROM credit_packs').get() as { c: number }).c
  if (packCount === 0) {
    const ins = db.prepare(
      'INSERT INTO credit_packs (credits, price_mnt, best, status, sort_order, created_at) VALUES (?,?,?,?,?,?)',
    )
    const now = Date.now()
    const seed: [number, number, number][] = [
      [10, 10_000, 0],
      [25, 20_000, 0],
      [50, 35_000, 0],
      [100, 60_000, 1],
    ]
    seed.forEach(([credits, price, best], i) => ins.run(credits, price, best, 'active', i, now))
  }

  // Round бүрийн тохиргоо нэвтрэхээс өмнөх лотуудад мөрүүдийг нь нөхнө
  const missing = db
    .prepare('SELECT id, total_stages, bids_per_stage FROM lots WHERE id NOT IN (SELECT DISTINCT lot_id FROM lot_rounds)')
    .all() as { id: number; total_stages: number; bids_per_stage: number }[]
  const insRound = db.prepare(
    'INSERT INTO lot_rounds (lot_id, round_no, duration_sec, bids_required) VALUES (?,?,?,?)',
  )
  for (const l of missing) {
    for (let r = 1; r <= l.total_stages; r++) insRound.run(l.id, r, DEFAULT_ROUND_SEC, l.bids_per_stage)
  }

  // ALTER TABLE ADD COLUMN нь UNIQUE зөвшөөрдөггүй тул индексээр хийнэ.
  // SQLite-д NULL утгууд UNIQUE индекст давхардаж болдог — нууц үгтэй хэрэглэгчдэд асуудалгүй.
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub)')

  // Soft close хасагдсан — Round дуусахдаа сунахгүй болсон
  if (cols('lots').includes('soft_close_sec')) {
    db.exec('ALTER TABLE lots DROP COLUMN soft_close_sec')
  }
}

export interface LotRoundRow {
  lot_id: number
  round_no: number
  duration_sec: number
  /** Bid ирэх бүрд сэргэх цонх — Round-ын төгсгөлд уралдаан үүсгэнэ */
  reset_sec: number
  /** 0 = ХЯЗГААРГҮЙ — bid-ээр Round дуусахгүй, зөвхөн хугацаагаар */
  bids_required: number
}

export interface UserRow {
  id: number
  email: string
  password_hash: string
  google_sub: string | null
  name: string
  avatar_color: string | null
  blocked: number
  verified: number
  verify_code: string | null
  referral_code: string | null
  referred_by: number | null
  credits: number
  tokens: number
  wins: number
  is_admin: number
  created_at: number
}

export interface LotRow {
  id: number
  code: string
  title: string
  subtitle: string | null
  description: string | null
  image_url: string | null
  start_price: number
  current_price: number
  status: 'scheduled' | 'live' | 'closed'
  current_stage: number
  total_stages: number
  bids_per_stage: number
  starts_at: number | null
  round_started_at: number | null
  ends_at: number | null
  bid_count: number
  winner_user_id: number | null
  closed_at: number | null
  created_at: number
}

export function getUser(id: number): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function getUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
    | UserRow
    | undefined
}

export function getLot(id: number): LotRow | undefined {
  return db.prepare('SELECT * FROM lots WHERE id = ?').get(id) as LotRow | undefined
}

/** Гүйлгээ бүртгэх (транзакц дотор дуудагдана) */
export function recordTxn(
  userId: number,
  type: string,
  opts: { credits?: number; tokens?: number; meta?: string } = {},
) {
  db.prepare(
    'INSERT INTO transactions (user_id, type, credits, tokens, meta, created_at) VALUES (?,?,?,?,?,?)',
  ).run(userId, type, opts.credits ?? 0, opts.tokens ?? 0, opts.meta ?? null, Date.now())
}
