import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'novabid.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/** Хүснэгтүүдийг үүсгэнэ (байхгүй бол) */
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
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
      start_price    INTEGER NOT NULL DEFAULT 1,
      current_price  INTEGER NOT NULL DEFAULT 1,
      status         TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | live | closed
      current_stage  INTEGER NOT NULL DEFAULT 1,
      total_stages   INTEGER NOT NULL DEFAULT 11,
      bids_per_stage INTEGER NOT NULL DEFAULT 15,
      soft_close_sec INTEGER NOT NULL DEFAULT 15,
      ends_at        INTEGER,                       -- unix ms
      bid_count      INTEGER NOT NULL DEFAULT 0,
      winner_user_id INTEGER REFERENCES users(id),
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
  `)
}

export interface UserRow {
  id: number
  email: string
  password_hash: string
  name: string
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
  start_price: number
  current_price: number
  status: 'scheduled' | 'live' | 'closed'
  current_stage: number
  total_stages: number
  bids_per_stage: number
  soft_close_sec: number
  ends_at: number | null
  bid_count: number
  winner_user_id: number | null
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
