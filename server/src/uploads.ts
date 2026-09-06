import { createWriteStream, mkdirSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { MultipartFile } from '@fastify/multipart'
import { ApiError } from './auction.js'
import { DATA_DIR } from './db.js'

/** Байршуулсан зургууд энд хадгалагдана (git-д ordoggүй) */
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
mkdirSync(UPLOAD_DIR, { recursive: true })

/** Статикаар үйлчлэх зам — DB-д энэ хэлбэрээр хадгална */
export const UPLOAD_PREFIX = '/uploads/'

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

/** Зөвшөөрөгдсөн төрөл → өргөтгөл. Клиентийн файлын нэрэнд итгэхгүй. */
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

/**
 * Multipart файлыг диск рүү бичээд нийтийн замыг буцаана.
 * Хэмжээ хэтэрвэл дутуу бичигдсэн файлыг устгана.
 */
export async function saveImage(part: MultipartFile): Promise<string> {
  const ext = ALLOWED[part.mimetype]
  if (!ext)
    throw new ApiError(400, 'Зөвхөн JPG, PNG, WebP, GIF зураг байршуулна')

  const name = randomUUID() + ext
  const dest = path.join(UPLOAD_DIR, name)

  await pipeline(part.file, createWriteStream(dest))

  // multipart limit-д хүрсэн бол урсгал таслагдсан — бүтэн файл биш
  if (part.file.truncated) {
    rmSync(dest, { force: true })
    throw new ApiError(413, `Зураг ${MAX_UPLOAD_BYTES / 1024 / 1024}MB-аас хэтрэхгүй байна`)
  }

  return UPLOAD_PREFIX + name
}

/**
 * Байршуулсан зургийг устгана. Зөвхөн `/uploads/<файл>` хэлбэрийн замыг хүлээж авах
 * бөгөөд basename-ийг л ашиглана — path traversal-аас хамгаална.
 */
export function deleteImage(url: string | null | undefined) {
  if (!url?.startsWith(UPLOAD_PREFIX)) return
  const name = path.basename(url)
  if (!name || name === '.' || name === '..') return
  rmSync(path.join(UPLOAD_DIR, name), { force: true })
}
