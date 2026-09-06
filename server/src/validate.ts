import { ApiError } from './auction.js'

/** Заавал байх бүхэл тоо — буруу бол ApiError */
export function posInt(v: unknown, field: string, { min = 1, max = 1_000_000 } = {}): number {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max)
    throw new ApiError(400, `${field}: ${min}–${max} хооронд бүхэл тоо байна`)
  return n
}

/** Текст талбар — хоосон зайг тайрна */
export function str(v: unknown, field: string, { max = 200, required = true } = {}): string {
  const s = typeof v === 'string' ? v.trim() : ''
  if (required && !s) throw new ApiError(400, `${field}: хоосон байж болохгүй`)
  if (s.length > max) throw new ApiError(400, `${field}: ${max} тэмдэгтээс богино байна`)
  return s
}
