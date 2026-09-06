import { db, getUserByEmail } from './db.js'
import { hashPassword } from './auth.js'

/**
 * `ADMIN_EMAIL` + `ADMIN_PASSWORD` өгсөн бол админ бүртгэлийг үүсгэнэ/шинэчилнэ.
 *
 * Production-д demo seed ажиллуулах нь аюултай (нийтэд мэдэгдэх нууц үгтэй бүртгэл
 * үүснэ). Үүний оронд орчны хувьсагчаар өөрийн админаа тавина.
 */
export function bootstrapAdmin(log: (msg: string) => void) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) return

  if (password.length < 8) {
    log('ADMIN_PASSWORD хэт богино (8+ тэмдэгт) — админ үүсгэсэнгүй')
    return
  }

  const existing = getUserByEmail(email)
  if (existing) {
    db.prepare('UPDATE users SET password_hash=?, is_admin=1, verified=1 WHERE id=?').run(
      hashPassword(password),
      existing.id,
    )
    log(`Админ шинэчлэв: ${email}`)
    return
  }

  db.prepare(
    `INSERT INTO users (email, password_hash, name, verified, is_admin, referral_code, created_at)
     VALUES (?,?,?,1,1,?,?)`,
  ).run(email, hashPassword(password), 'Админ', `ADM-${Date.now().toString(36).toUpperCase()}`, Date.now())
  log(`Админ үүсгэв: ${email}`)
}
