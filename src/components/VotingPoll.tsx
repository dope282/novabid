import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError, type ApiPoll } from '../lib/api'
import { useUser } from '../user'

/** closesAt → "18 цаг 24 мин" */
function untilLabel(closesAt: number | null): string {
  if (!closesAt) return '—'
  const ms = closesAt - Date.now()
  if (ms <= 0) return 'Хаагдсан'
  const h = Math.floor(ms / 3600_000)
  const m = Math.floor((ms % 3600_000) / 60_000)
  return h > 0 ? `${h} цаг ${m} мин` : `${m} мин`
}

/**
 * Дараагийн дуудлага худалдаанд оруулах барааг санал хураах виджет.
 * Нэр дэвшигчид болон санал нь серверт хадгалагдана — админаас удирдана.
 */
export function VotingPoll() {
  const navigate = useNavigate()
  const { isAuthed } = useUser()

  const [poll, setPoll] = useState<ApiPoll | null>(null)
  const [picked, setPicked] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const { poll, myPicks } = await api.poll()
      setPoll(poll)
      setPicked(myPicks)
    } catch {
      setPoll(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const total = poll?.totalVotes ?? 0

  // Тэргүүлж буй нэр дэвшигчид (одоогийн саналаар)
  const leaders = useMemo(() => {
    if (!poll) return [] as number[]
    return [...poll.candidates]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, poll.maxPicks)
      .map((c) => c.id)
  }, [poll])

  async function vote(candidateId: number) {
    if (!isAuthed) {
      navigate('/login')
      return
    }
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.pollVote(candidateId)
      setPoll(res.poll)
      setPicked(res.myPicks)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Санал өгч чадсангүй')
    } finally {
      setBusy(false)
    }
  }

  // Ачаалж байх үед эсвэл идэвхтэй санал хураалт байхгүй бол виджет харагдахгүй
  if (loading || !poll) return null

  const closed = !!poll.closesAt && poll.closesAt <= Date.now()
  const remaining = poll.maxPicks - picked.length

  return (
    <div
      style={{
        background: 'var(--nb-surface)',
        border: '0.5px solid var(--nb-line)',
        borderRadius: 20,
        padding: 22,
        boxShadow: '0 12px 40px rgba(21,23,30,.1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            font: "700 9px 'JetBrains Mono'",
            letterSpacing: '.1em',
            color: 'var(--nb-amber)',
            background: 'rgba(232,147,12,.12)',
            borderRadius: 20,
            padding: '4px 9px',
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--nb-amber)' }} />
          САНАЛ ХУРААЛТ
        </span>
        <span style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>
          {total.toLocaleString('en-US')} санал
        </span>
      </div>

      <div style={{ font: "800 17px/1.3 'Golos Text'", letterSpacing: '-.01em', margin: '14px 0 4px' }}>
        {poll.title}
      </div>
      <div style={{ font: "400 12.5px/1.5 'Golos Text'", color: 'var(--nb-ink-2)', marginBottom: 16 }}>
        {poll.subtitle}{' '}
        {closed
          ? 'Санал хураалт хаагдсан.'
          : !isAuthed
            ? 'Санал өгөхийн тулд нэвтэрнэ үү.'
            : picked.length === 0
              ? `Та ${poll.maxPicks} бараанд санал өгнө.`
              : 'Таны санал бүртгэгдлээ ✓'}
      </div>

      {/* Candidates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {poll.candidates.map((c) => {
          const pct = total > 0 ? Math.round((c.votes / total) * 100) : 0
          const isPicked = picked.includes(c.id)
          const isLeader = leaders.includes(c.id)
          const disabled = closed || busy || (!isPicked && remaining === 0 && poll.maxPicks > 1)
          return (
            <button
              key={c.id}
              onClick={() => vote(c.id)}
              disabled={disabled}
              style={{
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'left',
                background: 'var(--nb-bg)',
                border: isPicked ? '1.5px solid var(--nb-blue)' : '0.5px solid var(--nb-line)',
                borderRadius: 12,
                padding: '11px 13px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled && !isPicked ? 0.55 : 1,
                color: 'var(--nb-ink)',
              }}
            >
              {/* Vote-share fill */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${pct}%`,
                  background: isPicked ? 'rgba(51,70,230,.12)' : 'var(--nb-fill)',
                  transition: 'width .35s ease',
                }}
              />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 11 }}>
                {/* Check circle */}
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: isPicked ? 'none' : '1.5px solid var(--nb-line)',
                    background: isPicked ? 'var(--nb-blue)' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                    flex: 'none',
                  }}
                >
                  {isPicked && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                      <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ font: "600 13px 'Golos Text'", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.title}
                    </span>
                    {isLeader && (
                      <span
                        style={{
                          font: "700 7.5px 'JetBrains Mono'",
                          letterSpacing: '.06em',
                          color: 'var(--nb-green)',
                          background: 'rgba(31,165,94,.12)',
                          borderRadius: 4,
                          padding: '2px 5px',
                          flex: 'none',
                        }}
                      >
                        ТЭРГҮҮЛЖ БУЙ
                      </span>
                    )}
                  </div>
                  {c.tag && (
                    <div style={{ font: "500 9.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 2 }}>
                      {c.tag.toUpperCase()}
                    </div>
                  )}
                </div>

                <span className="nb-tnum" style={{ font: "700 13px 'JetBrains Mono'", color: 'var(--nb-ink)', flex: 'none' }}>
                  {pct}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {error && (
        <div style={{ marginTop: 10, font: "500 11.5px 'Golos Text'", color: 'var(--nb-red)' }}>{error}</div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          font: "500 10.5px 'JetBrains Mono'",
          color: 'var(--nb-ink-3)',
        }}
      >
        <span>Хаагдах хүртэл</span>
        <span style={{ color: 'var(--nb-ink-2)' }}>{untilLabel(poll.closesAt)}</span>
      </div>
    </div>
  )
}
