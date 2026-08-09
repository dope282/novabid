import type { FastifyInstance } from 'fastify'
import { db, getUserByEmail } from '../db.js'
import { checkPassword, hashPassword, requireUser, signToken, userSnapshot } from '../auth.js'

/** Урилгын код үүсгэх: НЭР-XXXX */
function makeReferralCode(name: string): string {
  const base = (name || 'NB').replace(/[^A-Za-zА-Яа-яӨөҮүЁё]/g, '').slice(0, 3).toUpperCase() || 'NB'
  for (let i = 0; i < 20; i++) {
    const code = `${base}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    if (!db.prepare('SELECT 1 FROM users WHERE referral_code=?').get(code)) return code
  }
  return `NB-${Date.now().toString(36).toUpperCase()}`
}

export function authRoutes(app: FastifyInstance) {
  /** Бүртгүүлэх */
  app.post('/api/auth/register', async (req, reply) => {
    const { email, password, name, referralCode } = (req.body ?? {}) as {
      email?: string
      password?: string
      name?: string
      referralCode?: string
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return reply.code(400).send({ error: 'Имэйл буруу байна' })
    if (!password || password.length < 8)
      return reply.code(400).send({ error: 'Нууц үг 8-аас дээш тэмдэгт байна' })
    if (getUserByEmail(email)) return reply.code(409).send({ error: 'Имэйл бүртгэлтэй байна' })

    let referredBy: number | null = null
    if (referralCode) {
      const ref = db.prepare('SELECT id FROM users WHERE referral_code=?').get(referralCode) as
        | { id: number }
        | undefined
      referredBy = ref?.id ?? null
    }

    const verifyCode = String(Math.floor(100000 + Math.random() * 900000))
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, name, verify_code, referral_code, referred_by, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        email.toLowerCase(),
        hashPassword(password),
        name ?? '',
        verifyCode,
        makeReferralCode(name ?? email),
        referredBy,
        Date.now(),
      )

    // DEV: имэйл илгээгч холбоогүй тул кодыг хариунд буцаана.
    // Production-д имэйлээр илгээж, эндээс устгана!
    return {
      ok: true,
      userId: info.lastInsertRowid,
      devVerifyCode: verifyCode,
    }
  })

  /** Имэйл баталгаажуулах (6 оронтой код) */
  app.post('/api/auth/verify', async (req, reply) => {
    const { email, code } = (req.body ?? {}) as { email?: string; code?: string }
    const user = email ? getUserByEmail(email) : undefined
    if (!user) return reply.code(404).send({ error: 'Хэрэглэгч олдсонгүй' })
    if (user.verified) return { ok: true, token: signToken(user.id), user: userSnapshot(user) }
    if (!code || user.verify_code !== code)
      return reply.code(400).send({ error: 'Код буруу байна' })

    db.prepare('UPDATE users SET verified=1, verify_code=NULL WHERE id=?').run(user.id)
    const fresh = getUserByEmail(email!)!
    return { ok: true, token: signToken(fresh.id), user: userSnapshot(fresh) }
  })

  /** Нэвтрэх */
  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string }
    const user = email ? getUserByEmail(email) : undefined
    if (!user || !password || !checkPassword(password, user.password_hash))
      return reply.code(401).send({ error: 'Имэйл эсвэл нууц үг буруу' })
    return { token: signToken(user.id), user: userSnapshot(user) }
  })

  /** Өөрийн мэдээлэл */
  app.get('/api/me', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    return { user: userSnapshot(user) }
  })
}
