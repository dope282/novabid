import { useMemo, useState } from 'react'
import { POLL_MAX_PICKS, pollCandidates, pollClosesIn } from '../data/poll'

/**
 * Дараагийн дуудлага худалдаанд оруулах барааг санал хураах виджет.
 * Хэрэглэгч POLL_MAX_PICKS хүртэл бараа сонгож санал өгнө — live хувиар шинэчлэгдэнэ.
 */
export function VotingPoll() {
  const base = useMemo(() => Object.fromEntries(pollCandidates.map((c) => [c.id, c.votes])), [])
  const [votes, setVotes] = useState<Record<string, number>>(base)
  const [picked, setPicked] = useState<string[]>([])

  const total = Object.values(votes).reduce((s, v) => s + v, 0)
  const remaining = POLL_MAX_PICKS - picked.length

  // Тэргүүлж буй 2 нэр дэвшигч (одоогийн саналаар)
  const leaders = useMemo(
    () =>
      [...pollCandidates]
        .sort((a, b) => votes[b.id] - votes[a.id])
        .slice(0, POLL_MAX_PICKS)
        .map((c) => c.id),
    [votes],
  )

  function toggle(id: string) {
    setPicked((prev) => {
      const has = prev.includes(id)
      if (has) {
        // Дахин дарвал саналаа буцаана
        setVotes((v) => ({ ...v, [id]: v[id] - 1 }))
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= POLL_MAX_PICKS) {
        // Ганц сонголттой үед өөр бараа дарвал сонголтоо солино
        if (POLL_MAX_PICKS === 1) {
          const old = prev[0]
          setVotes((v) => ({ ...v, [old]: v[old] - 1, [id]: v[id] + 1 }))
          return [id]
        }
        return prev
      }
      setVotes((v) => ({ ...v, [id]: v[id] + 1 }))
      return [...prev, id]
    })
  }

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
        Дараагийн лотыг та сонго
      </div>
      <div style={{ font: "400 12.5px/1.5 'Golos Text'", color: 'var(--nb-ink-2)', marginBottom: 16 }}>
        Хамгийн олон санал авсан <b style={{ color: 'var(--nb-ink)' }}>1 бараа</b> дараагийн дуудлага
        худалдаанд орно. {picked.length === 0 ? 'Та ганц бараанд санал өгнө.' : 'Таны санал бүртгэгдлээ ✓'}
      </div>

      {/* Candidates */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pollCandidates.map((c) => {
          const pct = total > 0 ? Math.round((votes[c.id] / total) * 100) : 0
          const isPicked = picked.includes(c.id)
          const isLeader = leaders.includes(c.id)
          const disabled = !isPicked && remaining === 0 && POLL_MAX_PICKS > 1
          return (
            <button
              key={c.id}
              onClick={() => toggle(c.id)}
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
                opacity: disabled ? 0.55 : 1,
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
                  <div style={{ font: "500 9.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 2 }}>
                    {c.tag.toUpperCase()}
                  </div>
                </div>

                <span className="nb-tnum" style={{ font: "700 13px 'JetBrains Mono'", color: 'var(--nb-ink)', flex: 'none' }}>
                  {pct}%
                </span>
              </div>
            </button>
          )
        })}
      </div>

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
        <span style={{ color: 'var(--nb-ink-2)' }}>{pollClosesIn}</span>
      </div>
    </div>
  )
}
