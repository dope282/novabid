import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDb } from './db.js'
import { bootstrapAdmin } from './bootstrap.js'
import { MAX_UPLOAD_BYTES, UPLOAD_DIR, UPLOAD_PREFIX } from './uploads.js'
import { authRoutes } from './routes/auth.js'
import { lotRoutes } from './routes/lots.js'
import { walletRoutes } from './routes/wallet.js'
import { adminRoutes } from './routes/admin.js'
import { pollRoutes } from './routes/poll.js'
import { shopRoutes } from './routes/shop.js'
import { initWs } from './ws.js'
import { startEngine } from './auction.js'

const PORT = Number(process.env.PORT ?? 4000)

/**
 * Production-д frontend-ийн build-ыг ижил серверээс үйлчилнэ (нэг порт, ижил origin).
 * Docker-т `/srv/public`, локалд `server/public`. Байхгүй бол алгасна (dev-д Vite үйлчилнэ).
 */
const WEB_ROOT = process.env.WEB_ROOT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public')
const serveWeb = existsSync(path.join(WEB_ROOT, 'index.html'))

// Production дээр анхдагч нууц түлхүүрээр ажиллуулбал бүх токен хуурамчаар үүсгэгдэх боломжтой
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET тавиагүй байна — production дээр ЗААВАЛ санамсаргүй утга өгнө үү.')
  process.exit(1)
}

const app = Fastify({ logger: { level: 'info' } })

// Web (localhost:5173) болон дараа нь Expo/mobile-аас хандахыг зөвшөөрнө
await app.register(cors, { origin: true })

// Лотын зураг байршуулах (админ) — нэг хүсэлтэд нэг файл
await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } })

// Frontend-ийг эхэнд бүртгэвэл `reply.sendFile` нь түүний root-оос уншина (SPA fallback-д хэрэгтэй)
if (serveWeb) {
  await app.register(fastifyStatic, { root: WEB_ROOT, prefix: '/' })
}

// Байршуулсан зургийг /uploads/<файл> замаар үйлчилнэ
await app.register(fastifyStatic, {
  root: UPLOAD_DIR,
  prefix: UPLOAD_PREFIX,
  decorateReply: !serveWeb,
})

if (serveWeb) {
  // SPA — /lot/42 гэх мэт клиент талын замуудыг index.html-ээр хариулна.
  // API болон uploads нь жинхэнэ 404 буцаана.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/') || req.url.startsWith(UPLOAD_PREFIX))
      return reply.code(404).send({ error: 'Олдсонгүй' })
    return reply.sendFile('index.html')
  })
}

// Хоосон JSON body-г алдаа биш {} гэж үзнэ (POST /rejoin гэх мэт body-гүй хүсэлтэд)
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  if (!body || (typeof body === 'string' && body.trim() === '')) return done(null, {})
  try {
    done(null, JSON.parse(body as string))
  } catch (e) {
    done(e as Error)
  }
})

initDb()
// ADMIN_EMAIL/ADMIN_PASSWORD өгсөн бол админ бүртгэлийг бэлдэнэ (production-д seed-ийн оронд)
bootstrapAdmin((m) => app.log.info(m))

app.get('/api/health', async () => ({ ok: true, serverNow: Date.now() }))
app.get('/api/time', async () => ({ now: Date.now() }))

authRoutes(app)
lotRoutes(app)
walletRoutes(app)
adminRoutes(app)
pollRoutes(app)
shopRoutes(app)

await app.listen({ port: PORT, host: '0.0.0.0' })

// WebSocket (/ws) + аукционы хаалтын engine
initWs(app.server)
startEngine()

app.log.info(
  `NovaBid :${PORT} · WS /ws · frontend ${serveWeb ? WEB_ROOT : '(тусад нь Vite үйлчилнэ)'}`,
)
