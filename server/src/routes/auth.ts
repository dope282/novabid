import type { FastifyInstance } from 'fastify'
import { OAuth2Client } from 'google-auth-library'
import { db, getUser, getUserByEmail, type UserRow } from '../db.js'
import {
  AVATAR_COLORS,
  checkPassword,
  hashPassword,
  requireUser,
  signToken,
  userSnapshot,
  validAvatarColor,
} from '../auth.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null

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
  /** Дүрсний өнгөний палитр — клиент энэ жагсаалтаас л сонгоно */
  app.get('/api/avatar-colors', async () => ({ colors: AVATAR_COLORS }))

  /** Бүртгүүлэх */
  app.post('/api/auth/register', async (req, reply) => {
    const { email, password, name, referralCode, avatarColor } = (req.body ?? {}) as {
      email?: string
      password?: string
      name?: string
      referralCode?: string
      avatarColor?: string
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
        `INSERT INTO users (email, password_hash, name, avatar_color, verify_code, referral_code, referred_by, created_at)
         VALUES (?,?,?,?,?,?,?,?)`,
      )
      .run(
        email.toLowerCase(),
        hashPassword(password),
        (name ?? '').trim().slice(0, 40),
        validAvatarColor(avatarColor),
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
    // Баталгаажсан бүртгэлд токен ОЛГОХГҮЙ — эс бөгөөс зөвхөн имэйл мэдэж байхад
    // нууц үггүйгээр нэвтрэх боломжтой болно (админ ч мөн адил).
    if (user.verified)
      return reply.code(400).send({ error: 'Имэйл аль хэдийн баталгаажсан — нэвтэрнэ үү' })
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
    if (user.blocked) return reply.code(403).send({ error: 'Таны бүртгэл хаагдсан байна' })
    return { token: signToken(user.id), user: userSnapshot(user) }
  })

  /**
   * Google-ээр нэвтрэх.
   * Клиент нь Google Identity Services-ээс авсан ID token-оо (`credential`) илгээнэ.
   * Сервер түүнийг Google-ийн нийтийн түлхүүрээр шалгана — клиентийн өгсөн
   * имэйлд шууд итгэхгүй.
   */
  app.post('/api/auth/google', async (req, reply) => {
    if (!googleClient)
      return reply.code(503).send({ error: 'Google нэвтрэлт тохируулагдаагүй байна (GOOGLE_CLIENT_ID)' })

    const { credential, referralCode } = (req.body ?? {}) as {
      credential?: string
      referralCode?: string
    }
    if (!credential) return reply.code(400).send({ error: 'Google token ирээгүй байна' })

    let payload
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      })
      payload = ticket.getPayload()
    } catch {
      return reply.code(401).send({ error: 'Google token хүчингүй байна' })
    }

    const sub = payload?.sub
    const email = payload?.email?.toLowerCase()
    if (!sub || !email) return reply.code(401).send({ error: 'Google хаягийн мэдээлэл дутуу байна' })
    // Баталгаажаагүй имэйлээр холбовол өөр хүний бүртгэлийг булаах эрсдэлтэй
    if (!payload?.email_verified)
      return reply.code(401).send({ error: 'Google дээрх имэйл баталгаажаагүй байна' })

    let user = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub) as UserRow | undefined

    if (!user) {
      const existing = getUserByEmail(email)
      if (existing) {
        // Ижил имэйлтэй нууц үгтэй бүртгэл байвал холбоно (Google имэйлийг баталгаажуулсан)
        db.prepare('UPDATE users SET google_sub=?, verified=1, verify_code=NULL WHERE id=?').run(
          sub,
          existing.id,
        )
        user = getUser(existing.id)!
      } else {
        const name = payload?.name ?? email.split('@')[0]
        let referredBy: number | null = null
        if (referralCode) {
          const ref = db.prepare('SELECT id FROM users WHERE referral_code=?').get(referralCode) as
            | { id: number }
            | undefined
          referredBy = ref?.id ?? null
        }
        const info = db
          .prepare(
            `INSERT INTO users (email, password_hash, google_sub, name, verified, referral_code, referred_by, created_at)
             VALUES (?, '', ?, ?, 1, ?, ?, ?)`,
          )
          .run(email, sub, name, makeReferralCode(name), referredBy, Date.now())
        user = getUser(Number(info.lastInsertRowid))!
      }
    }

    if (user.blocked) return reply.code(403).send({ error: 'Таны бүртгэл хаагдсан байна' })
    return { token: signToken(user.id), user: userSnapshot(user) }
  })

  /** Өөрийн мэдээлэл */
  app.get('/api/me', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    return { user: userSnapshot(user) }
  })

  /** Профайл засах — нэр болон дүрсний өнгө */
  app.patch('/api/me', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const { name, avatarColor } = (req.body ?? {}) as { name?: string; avatarColor?: string }

    const set: string[] = []
    const vals: unknown[] = []
    if (name !== undefined) {
      const clean = String(name).trim().slice(0, 40)
      if (!clean) return reply.code(400).send({ error: 'Нэр хоосон байж болохгүй' })
      set.push('name=?')
      vals.push(clean)
    }
    if (avatarColor !== undefined) {
      const color = validAvatarColor(avatarColor)
      if (avatarColor && !color)
        return reply.code(400).send({ error: 'Өнгө палитраас гадуур байна' })
      set.push('avatar_color=?')
      vals.push(color)
    }
    if (!set.length) return reply.code(400).send({ error: 'Өөрчлөх талбар алга' })

    vals.push(user.id)
    db.prepare(`UPDATE users SET ${set.join(', ')} WHERE id=?`).run(...(vals as never[]))
    return { user: userSnapshot(getUser(user.id)!) }
  })
}
