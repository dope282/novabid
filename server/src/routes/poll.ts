import type { FastifyInstance } from 'fastify'
import { db } from '../db.js'
import { getUid, requireAdmin, requireUser } from '../auth.js'
import { ApiError } from '../auction.js'
import { posInt, str } from '../validate.js'

interface PollRow {
  id: number
  title: string
  subtitle: string | null
  max_picks: number
  closes_at: number | null
  status: 'draft' | 'open' | 'closed'
  created_at: number
}

interface CandidateRow {
  id: number
  poll_id: number
  title: string
  tag: string | null
  base_votes: number
  sort_order: number
  votes: number
}

const STATUSES = ['draft', 'open', 'closed'] as const
type PollStatus = (typeof STATUSES)[number]

/** Нэр дэвшигчид + бодит саналын тоо (суурь + өгсөн санал) */
function candidates(pollId: number): CandidateRow[] {
  return db
    .prepare(
      `SELECT c.*, c.base_votes + (SELECT COUNT(*) FROM poll_votes v WHERE v.candidate_id = c.id) AS votes
       FROM poll_candidates c WHERE c.poll_id = ? ORDER BY c.sort_order, c.id`,
    )
    .all(pollId) as CandidateRow[]
}

function pollSnapshot(poll: PollRow) {
  const cands = candidates(poll.id)
  return {
    id: poll.id,
    title: poll.title,
    subtitle: poll.subtitle,
    maxPicks: poll.max_picks,
    closesAt: poll.closes_at,
    status: poll.status,
    totalVotes: cands.reduce((s, c) => s + c.votes, 0),
    candidates: cands.map((c) => ({
      id: c.id,
      title: c.title,
      tag: c.tag,
      votes: c.votes,
      baseVotes: c.base_votes,
    })),
  }
}

/** Хэрэглэгчийн энэ санал хураалтад өгсөн саналууд */
function myPicks(pollId: number, uid: number | null): number[] {
  if (!uid) return []
  return (
    db.prepare('SELECT candidate_id FROM poll_votes WHERE poll_id=? AND user_id=?').all(pollId, uid) as {
      candidate_id: number
    }[]
  ).map((r) => r.candidate_id)
}

function getPoll(id: number): PollRow | undefined {
  return db.prepare('SELECT * FROM polls WHERE id=?').get(id) as PollRow | undefined
}

/** Идэвхтэй (open) санал хураалт — нэг зэрэг зөвхөн нэг байна */
function openPoll(): PollRow | undefined {
  return db.prepare("SELECT * FROM polls WHERE status='open' ORDER BY id DESC LIMIT 1").get() as
    | PollRow
    | undefined
}

export function pollRoutes(app: FastifyInstance) {
  /** Нийтэд харагдах идэвхтэй санал хураалт. Байхгүй бол `poll: null`. */
  app.get('/api/poll', async (req) => {
    const poll = openPoll()
    if (!poll) return { poll: null, myPicks: [] }
    return { poll: pollSnapshot(poll), myPicks: myPicks(poll.id, getUid(req)) }
  })

  /**
   * Санал өгөх / буцаах (toggle).
   * maxPicks=1 үед өөр нэр дэвшигч сонговол саналыг шилжүүлнэ.
   */
  app.post('/api/poll/vote', async (req, reply) => {
    const user = requireUser(req, reply)
    if (!user) return
    const { candidateId } = (req.body ?? {}) as { candidateId?: number }

    try {
      const poll = openPoll()
      if (!poll) throw new ApiError(400, 'Идэвхтэй санал хураалт алга')
      if (poll.closes_at !== null && poll.closes_at <= Date.now())
        throw new ApiError(400, 'Санал хураалт дууссан байна')

      const cid = posInt(candidateId, 'Нэр дэвшигч', { min: 1, max: 2 ** 31 })
      const cand = db
        .prepare('SELECT id FROM poll_candidates WHERE id=? AND poll_id=?')
        .get(cid, poll.id) as { id: number } | undefined
      if (!cand) throw new ApiError(404, 'Нэр дэвшигч олдсонгүй')

      db.transaction(() => {
        const mine = myPicks(poll.id, user.id)
        if (mine.includes(cid)) {
          // Дахин дарвал саналаа буцаана
          db.prepare('DELETE FROM poll_votes WHERE poll_id=? AND candidate_id=? AND user_id=?').run(
            poll.id,
            cid,
            user.id,
          )
          return
        }
        if (mine.length >= poll.max_picks) {
          if (poll.max_picks !== 1)
            throw new ApiError(400, `Хамгийн ихдээ ${poll.max_picks} бараанд санал өгнө`)
          // Ганц сонголттой үед сольж өгнө
          db.prepare('DELETE FROM poll_votes WHERE poll_id=? AND user_id=?').run(poll.id, user.id)
        }
        db.prepare(
          'INSERT INTO poll_votes (poll_id, candidate_id, user_id, created_at) VALUES (?,?,?,?)',
        ).run(poll.id, cid, user.id, Date.now())
      })()

      const fresh = getPoll(poll.id)!
      return { poll: pollSnapshot(fresh), myPicks: myPicks(poll.id, user.id) }
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  // --- Админ ---

  app.get('/api/admin/polls', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const rows = db.prepare('SELECT * FROM polls ORDER BY id DESC').all() as PollRow[]
    return { polls: rows.map(pollSnapshot) }
  })

  app.post('/api/admin/polls', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    try {
      const b = (req.body ?? {}) as Record<string, unknown>
      const info = db
        .prepare(
          `INSERT INTO polls (title, subtitle, max_picks, closes_at, status, created_at)
           VALUES (?,?,?,?, 'draft', ?)`,
        )
        .run(
          str(b.title ?? 'Дараагийн лотыг та сонго', 'Гарчиг'),
          str(b.subtitle, 'Тайлбар', { required: false, max: 400 }) || null,
          posInt(b.maxPicks ?? 1, 'Сонголтын тоо', { min: 1, max: 20 }),
          Date.now() + posInt(b.closesInMin ?? 1440, 'Хугацаа', { min: 1, max: 60 * 24 * 90 }) * 60_000,
          Date.now(),
        )
      return reply.code(201).send({ poll: pollSnapshot(getPoll(Number(info.lastInsertRowid))!) })
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  /**
   * Санал хураалтыг нэр дэвшигчидтэй нь хамт хадгална.
   * `candidates` дэх `id`-тай нь шинэчилж, `id`-гүйг нь шинээр үүсгэж,
   * жагсаалтад байхгүй болсныг нь (саналын хамт) устгана.
   */
  app.put('/api/admin/polls/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    const poll = getPoll(id)
    if (!poll) return reply.code(404).send({ error: 'Санал хураалт олдсонгүй' })

    try {
      const b = (req.body ?? {}) as {
        title?: unknown
        subtitle?: unknown
        maxPicks?: unknown
        closesInMin?: unknown
        status?: unknown
        candidates?: { id?: number; title?: unknown; tag?: unknown; baseVotes?: unknown }[]
      }

      const title = str(b.title ?? poll.title, 'Гарчиг')
      const subtitle = str(b.subtitle, 'Тайлбар', { required: false, max: 400 }) || null
      const maxPicks = posInt(b.maxPicks ?? poll.max_picks, 'Сонголтын тоо', { min: 1, max: 20 })
      const status: PollStatus = STATUSES.includes(b.status as PollStatus)
        ? (b.status as PollStatus)
        : poll.status
      const closesAt =
        b.closesInMin !== undefined
          ? Date.now() + posInt(b.closesInMin, 'Хугацаа', { min: 1, max: 60 * 24 * 90 }) * 60_000
          : poll.closes_at

      const list = Array.isArray(b.candidates) ? b.candidates : null
      if (list && !list.length) throw new ApiError(400, 'Дор хаяж нэг нэр дэвшигч оруулна')

      db.transaction(() => {
        // Нэг зэрэг зөвхөн нэг санал хураалт нээлттэй байна
        if (status === 'open')
          db.prepare("UPDATE polls SET status='closed' WHERE status='open' AND id<>?").run(id)

        db.prepare(
          'UPDATE polls SET title=?, subtitle=?, max_picks=?, closes_at=?, status=? WHERE id=?',
        ).run(title, subtitle, maxPicks, closesAt, status, id)

        if (!list) return
        const keep = new Set<number>()
        list.forEach((c, i) => {
          const cTitle = str(c.title, 'Нэр дэвшигчийн нэр')
          const cTag = str(c.tag, 'Ангилал', { required: false, max: 60 }) || null
          const cBase = posInt(c.baseVotes ?? 0, 'Суурь санал', { min: 0, max: 1_000_000 })
          const existing =
            c.id && (db.prepare('SELECT id FROM poll_candidates WHERE id=? AND poll_id=?').get(c.id, id) as
              | { id: number }
              | undefined)
          if (existing) {
            db.prepare(
              'UPDATE poll_candidates SET title=?, tag=?, base_votes=?, sort_order=? WHERE id=?',
            ).run(cTitle, cTag, cBase, i, existing.id)
            keep.add(existing.id)
          } else {
            const info = db
              .prepare(
                'INSERT INTO poll_candidates (poll_id, title, tag, base_votes, sort_order) VALUES (?,?,?,?,?)',
              )
              .run(id, cTitle, cTag, cBase, i)
            keep.add(Number(info.lastInsertRowid))
          }
        })
        // Жагсаалтаас хасагдсаныг саналын хамт устгана (FK-г зөрчихгүйн тулд эхлээд санал)
        const all = db.prepare('SELECT id FROM poll_candidates WHERE poll_id=?').all(id) as {
          id: number
        }[]
        for (const c of all) {
          if (keep.has(c.id)) continue
          db.prepare('DELETE FROM poll_votes WHERE candidate_id=?').run(c.id)
          db.prepare('DELETE FROM poll_candidates WHERE id=?').run(c.id)
        }
      })()

      return { poll: pollSnapshot(getPoll(id)!) }
    } catch (e) {
      if (e instanceof ApiError) return reply.code(e.status).send({ error: e.message })
      throw e
    }
  })

  app.delete('/api/admin/polls/:id', async (req, reply) => {
    if (!requireAdmin(req, reply)) return
    const id = Number((req.params as { id: string }).id)
    if (!getPoll(id)) return reply.code(404).send({ error: 'Санал хураалт олдсонгүй' })
    db.transaction(() => {
      db.prepare('DELETE FROM poll_votes WHERE poll_id=?').run(id)
      db.prepare('DELETE FROM poll_candidates WHERE poll_id=?').run(id)
      db.prepare('DELETE FROM polls WHERE id=?').run(id)
    })()
    return { ok: true }
  })
}
