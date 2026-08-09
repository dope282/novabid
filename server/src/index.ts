import Fastify from 'fastify'
import cors from '@fastify/cors'
import { initDb } from './db.js'
import { authRoutes } from './routes/auth.js'
import { lotRoutes } from './routes/lots.js'
import { walletRoutes } from './routes/wallet.js'
import { adminRoutes } from './routes/admin.js'
import { initWs } from './ws.js'
import { startEngine } from './auction.js'

const PORT = Number(process.env.PORT ?? 4000)

const app = Fastify({ logger: { level: 'info' } })

// Web (localhost:5173) болон дараа нь Expo/mobile-аас хандахыг зөвшөөрнө
await app.register(cors, { origin: true })

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

app.get('/api/health', async () => ({ ok: true, serverNow: Date.now() }))
app.get('/api/time', async () => ({ now: Date.now() }))

authRoutes(app)
lotRoutes(app)
walletRoutes(app)
adminRoutes(app)

await app.listen({ port: PORT, host: '0.0.0.0' })

// WebSocket (/ws) + аукционы хаалтын engine
initWs(app.server)
startEngine()

app.log.info(`NovaBid API: http://localhost:${PORT} · WS: ws://localhost:${PORT}/ws`)
