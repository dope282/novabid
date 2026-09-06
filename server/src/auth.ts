import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { getUser, type UserRow } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'novabid-dev-secret-change-me'

export function hashPassword(pw: string): string {
  return bcrypt.hashSync(pw, 10)
}

export function checkPassword(pw: string, hash: string): boolean {
  // Google-ээр бүртгүүлсэн хэрэглэгчид hash хоосон — нууц үгээр нэвтрэх боломжгүй
  if (!pw || !hash) return false
  return bcrypt.compareSync(pw, hash)
}

export function signToken(userId: number): string {
  return jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' })
}

/** Authorization: Bearer <token> — хүчинтэй бол userId, үгүй бол null */
export function getUid(req: FastifyRequest): number | null {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return null
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET) as { uid: number }
    return payload.uid
  } catch {
    return null
  }
}

/** Нэвтрэлт шаардана — амжилтгүй бол 401 буцааж null өгнө */
export function requireUser(req: FastifyRequest, reply: FastifyReply): UserRow | null {
  const uid = getUid(req)
  const user = uid ? getUser(uid) : undefined
  if (!user) {
    reply.code(401).send({ error: 'Нэвтрэх шаардлагатай' })
    return null
  }
  // Хаагдсан хэрэглэгчийн токен хүчинтэй хэвээр байж болох тул энд шалгана
  if (user.blocked) {
    reply.code(403).send({ error: 'Таны бүртгэл хаагдсан байна' })
    return null
  }
  return user
}

/** Админ эрх шаардана — админ биш бол 401/403 */
export function requireAdmin(req: FastifyRequest, reply: FastifyReply): UserRow | null {
  const user = requireUser(req, reply)
  if (!user) return null
  if (!user.is_admin) {
    reply.code(403).send({ error: 'Админ эрх шаардлагатай' })
    return null
  }
  return user
}

/**
 * Дүрсний өнгөний палитр — сервер талд эрх мэдэлтэй жагсаалт.
 * Клиент дурын hex илгээж чадахгүй.
 */
export const AVATAR_COLORS = [
  '#3346E6', // цэнхэр
  '#1FA55E', // ногоон
  '#E8930C', // шар
  '#E5484D', // улаан
  '#8B5CF6', // ягаан ягаан
  '#0EA5E9', // тэнгэрийн
  '#EC4899', // ягаан
  '#15171E', // хар
] as const

/** Сонгоогүй хэрэглэгчид id-аар тогтвортой өнгө ононо (үргэлж ижил гарна) */
export function avatarColorOf(user: { id: number; avatar_color: string | null }): string {
  return user.avatar_color ?? AVATAR_COLORS[user.id % AVATAR_COLORS.length]
}

/** Палитраас гаднах утгыг татгалзана */
export function validAvatarColor(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null
  const s = String(v).toUpperCase()
  return (AVATAR_COLORS as readonly string[]).includes(s) ? s : null
}

/** Клиент рүү буцаах хэрэглэгчийн snapshot (нууц талбаргүй) */
export function userSnapshot(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarColor: avatarColorOf(u),
    verified: !!u.verified,
    credits: u.credits,
    tokens: u.tokens,
    wins: u.wins,
    referralCode: u.referral_code,
    isAdmin: !!u.is_admin,
  }
}
