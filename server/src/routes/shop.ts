import type { FastifyInstance } from 'fastify'
import { db, getUser, recordTxn } from '../db.js'
import { requireAdmin, requireUser, userSnapshot } from '../auth.js'
import { ApiError } from '../auction.js'
import { posInt, str } from '../validate.js'
import { UPLOAD_PREFIX, deleteImage } from '../uploads.js'

interface ItemRow {
  id: number
  title: string
  category: string
  tokens: number
  description: string | null
  image_url: string | null
  stock: number | null
  status: 'active' | 'hidden'
  created_at: number
}

interface OrderRow {
  id: number
  user_id: number
  item_id: number | null
  title: string
  tokens: number
  status: 'pending' | 'shipped' | 'done' | 'cancelled'
  created_at: number
}

const STATUSES = ['active', 'hidden'] as const
const ORDER_STATUSES = ['pending', 'shipped', 'done', 'cancelled'] as const
type ItemStatus = (typeof STATUSES)[number]
type OrderStatus = (typeof ORDER_STATUSES)[number]

function itemSnapshot(i: ItemRow) {
  return {
    id: i.id,
    title: i.title,
    category: i.category,
    tokens: i.tokens,
    description: i.description,
    image: i.image_url,
    stock: i.stock,
    status: i.status,
    /** Дууссан эсэх — stock=null бол хязгааргүй */
    soldOut: i.stock !== null && i.stock <= 0,
  }
}

function getItem(id: number): ItemRow | undefined {
  return db.prepare('SELECT * FROM shop_items WHERE id=?').get(id) as ItemRow | undefined
}

/** Зөвхөн өөрсдийн upload-аас гарсан зам (лоттой ижил дүрэм) */
function imagePath(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  if (!s) return null
  if (!s.startsWith(UPLOAD_PREFIX) || s.includes('..') || s.slice(UPLOAD_PREFIX.length).includes('/'))
    throw new ApiError(400, 'Зургийн зам буруу — эхлээд /api/admin/uploads руу байршуулна')
  return s
}

/** stock: хоосон/null бол хязгааргүй */
function stockOf(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  return posInt(v, 'Нөөц', { min: 0, max: 1_000_000 })
}

export function shopRoutes(app: FastifyInstance) {
  /** Нийтэд харагдах бараанууд (нуусныг нь харуулахгүй) */
  app.get('/api/shop/items', async () => {
    const rows = db
      .prepare("SELECT * FROM shop_items WHERE status='active' ORDER BY tokens, id")
      .all() as ItemRow[]
    return { items: rows.map(itemSnapshot) }
  })

  /**
   * Token-оор солих. Үлдэгдэл шалгах, хасах, нөөц хорогдуулах, захиалга үүсгэхийг
   * нэг транзакцад хийнэ — эс бөгөөс Token хасагдчхаад захиалга үүсэхгүй байх эрсдэлтэй.
   */
  app.post('/api/shop/redeem', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const { itemId } = (req.body ?? {}) as { itemId?: number }

    try {
      const id = posInt(itemId, 'Бараа', { min: 1, max: 2 ** 31 })
      const result = db.transaction(() => {
        const item = getItem(id)
        if (!item || item.status !== 'active') throw new ApiError(404, 'Бараа олдсонгүй')
        if (item.stock !== null && item.stock <= 0) throw new ApiError(409, 'Бараа дууссан байна')

        // Үлдэгдлийг транзакц дотор дахин уншина (хуучирсан утгаар хасахгүйн тулд)
        const fresh = getUser(user.id)!
        if (fresh.tokens < item.tokens) throw new ApiError(402, 'Token хүрэлцэхгүй байна')

        db.prepare('UPDATE users SET tokens = tokens - ? WHERE id = ?').run(item.tokens, user.id)
        if (item.stock !== null)
          db.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ?').run(item.id)

        const info = db
          .prepare(
            `INSERT INTO shop_orders (user_id, item_id, title, tokens, status, created_at)
             VALUES (?,?,?,?, 'pending', ?)`,
          )
          .run(user.id, item.id, item.title, item.tokens, Date.now())

        recordTxn(user.id, 'token_spend', {
          tokens: -item.tokens,
          meta: JSON.stringify({ itemId: item.id, title: item.title }),
        })
        return Number(info.lastInsertRowid)
      })()

      return { ok: true, orderId: result, user: userSnapshot(getUser(user.id)!) }
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  /** Миний захиалгууд */
  app.get('/api/shop/orders', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const rows = db
      .prepare('SELECT id, title, tokens, status, created_at FROM shop_orders WHERE user_id=? ORDER BY id DESC LIMIT 50')
      .all(user.id)
    return { orders: rows }
  })

  // --- Админ ---

  app.get('/api/admin/shop/items', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db.prepare('SELECT * FROM shop_items ORDER BY id DESC').all() as ItemRow[]
    // Хэдэн ширхэг солигдсоныг харуулна
    const redeemed = db
      .prepare("SELECT item_id, COUNT(*) AS c FROM shop_orders WHERE status<>'cancelled' GROUP BY item_id")
      .all() as { item_id: number | null; c: number }[]
    const map = new Map(redeemed.map((r) => [r.item_id, r.c]))
    return { items: rows.map((i) => ({ ...itemSnapshot(i), redeemed: map.get(i.id) ?? 0 })) }
  })

  app.post('/api/admin/shop/items', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    try {
      const b = (req.body ?? {}) as Record<string, unknown>
      const status: ItemStatus = STATUSES.includes(b.status as ItemStatus)
        ? (b.status as ItemStatus)
        : 'active'
      const info = db
        .prepare(
          `INSERT INTO shop_items (title, category, tokens, description, image_url, stock, status, created_at)
           VALUES (?,?,?,?,?,?,?,?)`,
        )
        .run(
          str(b.title, 'Барааны нэр'),
          str(b.category, 'Ангилал', { required: false, max: 60 }),
          posInt(b.tokens, 'Token үнэ', { min: 1, max: 1_000_000 }),
          str(b.description, 'Тайлбар', { required: false, max: 2000 }) || null,
          imagePath(b.imageUrl),
          stockOf(b.stock),
          status,
          Date.now(),
        )
      return reply.code(201).send({ item: itemSnapshot(getItem(Number(info.lastInsertRowid))!) })
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  app.patch('/api/admin/shop/items/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    const item = getItem(id)
    if (!item) return reply.code(404).send({ error: 'Бараа олдсонгүй' })

    try {
      const b = (req.body ?? {}) as Record<string, unknown>
      const set: string[] = []
      const vals: unknown[] = []
      let oldImage: string | null = null

      if (b.title !== undefined) (set.push('title=?'), vals.push(str(b.title, 'Барааны нэр')))
      if (b.category !== undefined)
        (set.push('category=?'), vals.push(str(b.category, 'Ангилал', { required: false, max: 60 })))
      if (b.tokens !== undefined)
        (set.push('tokens=?'), vals.push(posInt(b.tokens, 'Token үнэ', { min: 1, max: 1_000_000 })))
      if (b.description !== undefined)
        (set.push('description=?'),
        vals.push(str(b.description, 'Тайлбар', { required: false, max: 2000 }) || null))
      if (b.stock !== undefined) (set.push('stock=?'), vals.push(stockOf(b.stock)))
      if (b.status !== undefined) {
        if (!STATUSES.includes(b.status as ItemStatus)) throw new ApiError(400, 'Төлөв буруу байна')
        set.push('status=?')
        vals.push(b.status)
      }
      if (b.imageUrl !== undefined) {
        const next = imagePath(b.imageUrl)
        if (next !== item.image_url) oldImage = item.image_url
        set.push('image_url=?')
        vals.push(next)
      }
      if (!set.length) return reply.code(400).send({ error: 'Өөрчлөх талбар алга' })

      vals.push(id)
      db.prepare(`UPDATE shop_items SET ${set.join(', ')} WHERE id=?`).run(...(vals as never[]))
      deleteImage(oldImage)
      return { item: itemSnapshot(getItem(id)!) }
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  /**
   * Бараа устгах — зөвхөн солиулаагүй бол. Захиалгатай бол түүхийг таслахгүйн тулд
   * устгахын оронд нуухыг санал болгоно.
   */
  app.delete('/api/admin/shop/items/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    const item = getItem(id)
    if (!item) return reply.code(404).send({ error: 'Бараа олдсонгүй' })

    const orders = (db.prepare('SELECT COUNT(*) AS c FROM shop_orders WHERE item_id=?').get(id) as {
      c: number
    }).c
    if (orders > 0)
      return reply
        .code(409)
        .send({ error: `${orders} захиалгатай тул устгах боломжгүй — нуух товчийг ашиглана уу` })

    db.prepare('DELETE FROM shop_items WHERE id=?').run(id)
    deleteImage(item.image_url)
    return { ok: true }
  })

  /** Бүх захиалга */
  app.get('/api/admin/shop/orders', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db
      .prepare(
        `SELECT o.*, u.name, u.email FROM shop_orders o JOIN users u ON u.id=o.user_id
         ORDER BY o.id DESC LIMIT 200`,
      )
      .all() as (OrderRow & { name: string; email: string })[]
    return {
      orders: rows.map((o) => ({
        id: o.id,
        user: o.name || o.email.split('@')[0],
        email: o.email,
        title: o.title,
        tokens: o.tokens,
        status: o.status,
        createdAt: o.created_at,
      })),
    }
  })

  /**
   * Захиалгын төлөв солих. Цуцлахад Token-ыг буцаана.
   */
  app.patch('/api/admin/shop/orders/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    const { status } = (req.body ?? {}) as { status?: string }
    if (!ORDER_STATUSES.includes(status as OrderStatus))
      return reply.code(400).send({ error: 'Төлөв буруу байна' })

    const order = db.prepare('SELECT * FROM shop_orders WHERE id=?').get(id) as OrderRow | undefined
    if (!order) return reply.code(404).send({ error: 'Захиалга олдсонгүй' })
    if (order.status === status) return { ok: true }

    try {
      db.transaction(() => {
        // Цуцлахад Token болон нөөцийг буцаана — нэг л удаа
        if (status === 'cancelled' && order.status !== 'cancelled') {
          db.prepare('UPDATE users SET tokens = tokens + ? WHERE id = ?').run(order.tokens, order.user_id)
          if (order.item_id !== null)
            db.prepare('UPDATE shop_items SET stock = stock + 1 WHERE id = ? AND stock IS NOT NULL').run(
              order.item_id,
            )
          recordTxn(order.user_id, 'token_earn', {
            tokens: order.tokens,
            meta: JSON.stringify({ refundOrderId: order.id, title: order.title }),
          })
        }
        // Цуцалснаас буцааж идэвхжүүлбэл Token болон нөөцийг дахин хасна.
        // Нөөцийг хасахгүй бол цуцлаад сэргээх бүрт агуулах хийсвэрээр өснө.
        if (order.status === 'cancelled' && status !== 'cancelled') {
          const u = getUser(order.user_id)!
          if (u.tokens < order.tokens)
            throw new ApiError(402, 'Хэрэглэгчийн Token хүрэлцэхгүй тул сэргээх боломжгүй')
          if (order.item_id !== null) {
            const it = getItem(order.item_id)
            if (it && it.stock !== null) {
              if (it.stock <= 0)
                throw new ApiError(409, 'Барааны нөөц дууссан тул захиалгыг сэргээх боломжгүй')
              db.prepare('UPDATE shop_items SET stock = stock - 1 WHERE id = ?').run(order.item_id)
            }
          }
          db.prepare('UPDATE users SET tokens = tokens - ? WHERE id = ?').run(order.tokens, order.user_id)
          recordTxn(order.user_id, 'token_spend', {
            tokens: -order.tokens,
            meta: JSON.stringify({ restoreOrderId: order.id, title: order.title }),
          })
        }
        db.prepare('UPDATE shop_orders SET status=? WHERE id=?').run(status, id)
      })()
      return { ok: true }
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })
}
