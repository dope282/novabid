import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { PageHead } from '../components/PageHead'
import { api, type TokenEntry } from '../lib/api'
import { useUser } from '../user'

/** "08.24" */
function shortDate(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

export function Tokens() {
  const { tokens, isAuthed } = useUser()
  const [entries, setEntries] = useState<TokenEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (!isAuthed) {
      setEntries([])
      setLoading(false)
      return
    }
    api
      .tokenHistory()
      .then(({ entries }) => alive && setEntries(entries))
      .catch(() => alive && setEntries([]))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [isAuthed])

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '40px 24px 64px' }}>
        <PageHead
          eyebrow="Token"
          title="Таны Token"
          subtitle="Аукцион дээр зарцуулсан кредит бүр 1 Token болж эргэж ирнэ. Token хугацаагүй — дэлгүүрт бараа сольж авна."
        />

        <div className="nb-two-col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(300px, 380px)', gap: 28, alignItems: 'start' }}>
          {/* History */}
          <div>
            <div className="nb-eyebrow" style={{ marginBottom: 10 }}>
              Token хөдөлгөөн
            </div>
            <div
              style={{
                background: 'var(--nb-surface)',
                border: '0.5px solid var(--nb-line)',
                borderRadius: 14,
                padding: '2px 16px',
              }}
            >
              {loading ? (
                <div style={{ padding: '28px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-2)' }}>
                  Ачаалж байна…
                </div>
              ) : !isAuthed ? (
                <div style={{ padding: '28px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
                  Token хөдөлгөөнөө харахын тулд <Link to="/login" style={{ color: 'var(--nb-blue)' }}>нэвтэрнэ үү</Link>.
                </div>
              ) : !entries.length ? (
                <div style={{ padding: '28px 0', textAlign: 'center', font: "500 13px/1.6 'Golos Text'", color: 'var(--nb-ink-3)' }}>
                  Token хөдөлгөөн алга.
                  <br />
                  Аукционд оролцоод ялаагүй тохиолдолд зарцуулсан кредит бүр Token болж эргэж ирнэ.
                </div>
              ) : (
                entries.map((x, i) => (
                  <div
                    key={x.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 0',
                      borderBottom: i < entries.length - 1 ? '0.5px solid var(--nb-line-soft)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          display: 'grid',
                          placeItems: 'center',
                          font: "800 13px 'Rubik', sans-serif",
                          flex: 'none',
                          background: x.positive ? 'rgba(31,165,94,.12)' : 'rgba(229,72,77,.1)',
                          color: x.positive ? 'var(--nb-green)' : 'var(--nb-red)',
                        }}
                      >
                        {x.positive ? '↑' : '↓'}
                      </div>
                      <div>
                        <div style={{ font: "600 13.5px 'Golos Text'" }}>{x.title}</div>
                        <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-2)', marginTop: 2 }}>
                          {x.kind} · {shortDate(x.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span
                      className="nb-tnum"
                      style={{
                        font: "700 14px 'JetBrains Mono'",
                        color: x.positive ? 'var(--nb-green)' : 'var(--nb-red)',
                      }}
                    >
                      {x.positive ? '+' : ''}
                      {x.tokens}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Balance + shop CTA */}
          <aside>
            <div
              style={{
                background: '#0C3B24',
                backgroundImage:
                  'repeating-linear-gradient(-45deg,rgba(255,255,255,.03) 0 2px,transparent 2px 8px)',
                borderRadius: 18,
                padding: 22,
                color: '#EFFBF4',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ font: "700 8.5px 'JetBrains Mono'", letterSpacing: '.14em', color: '#8FD8B2' }}>
                    TOKEN ҮЛДЭГДЭЛ
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                    <span className="nb-tnum" style={{ font: "800 40px 'Rubik', sans-serif" }}>
                      {tokens}
                    </span>
                    <span style={{ font: "700 12px 'JetBrains Mono'", color: '#8FD8B2' }}>T</span>
                  </div>
                </div>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#1FA55E',
                    display: 'grid',
                    placeItems: 'center',
                    font: "800 22px 'Rubik', sans-serif",
                    color: '#fff',
                  }}
                >
                  T
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '0.5px solid rgba(239,251,244,.15)',
                  font: "500 10px 'JetBrains Mono'",
                  color: '#8FD8B2',
                }}
              >
                1 ЗАРЦУУЛСАН КРЕДИТ = 1 TOKEN · ХУГАЦААГҮЙ
              </div>
            </div>

            <Link
              to="/shop"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--nb-surface)',
                border: '0.5px solid var(--nb-line)',
                borderRadius: 14,
                padding: '15px 16px',
                marginTop: 12,
                color: 'var(--nb-ink)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(31,165,94,.1)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 8h14l-1.2 12H6.2L5 8Z" stroke="#1FA55E" strokeWidth="1.7" strokeLinejoin="round" />
                    <path d="M8.5 10V6a3.5 3.5 0 0 1 7 0v4" stroke="#1FA55E" strokeWidth="1.7" />
                  </svg>
                </div>
                <div>
                  <div style={{ font: "700 14px 'Golos Text'" }}>Token дэлгүүр</div>
                  <div style={{ font: "400 12px 'Golos Text'", color: 'var(--nb-ink-2)' }}>
                    Token-оор бараа солих
                  </div>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="m9 5 7 7-7 7" stroke="var(--nb-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
