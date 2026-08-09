import { WebSocketServer } from 'ws'
import type { Server } from 'node:http'

let wss: WebSocketServer | null = null

/** HTTP сервер дээр /ws зам нээнэ */
export function initWs(server: Server) {
  wss = new WebSocketServer({ server, path: '/ws' })
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'hello', serverNow: Date.now() }))
  })
}

/** Бүх холбогдсон клиент рүү мэдээ цацна (клиент lotId-аар шүүнэ) */
export function broadcast(msg: Record<string, unknown>) {
  if (!wss) return
  const data = JSON.stringify({ ...msg, serverNow: Date.now() })
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) client.send(data)
  }
}
