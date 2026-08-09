import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { PageHead } from '../components/PageHead'
import { creditPacks } from '../data/economy'
import { api } from '../lib/api'
import { useUser } from '../user'

interface ServerTxn {
  id: number
  type: string
  credits: number
  tokens: number
  meta: string | null
  created_at: number
}

/** Сервер гүйлгээг дэлгэцийн мөр болгож хөрвүүлнэ */
function mapTxn(t: ServerTxn): { title: string; meta: string; amount: string; positive: boolean } {
  const date = new Date(t.created_at).toLocaleDateString('en-CA', { month: '2-digit', day: '2-digit' })
  const map: Record<string, string> = {
    purchase: 'Кредит багц авсан',
    bid: 'Bid хийсэн',
    rejoin_fee: 'Шатанд дахин орсон',
    token_earn: 'Token авсан (consolation)',
    token_spend: 'Token зарцуулсан',
    referral: 'Урилгын урамшуулал',
  }
  const positive = t.credits > 0 || t.tokens > 0
  const amount =
    t.tokens !== 0 ? `${t.tokens > 0 ? '+' : ''}${t.tokens} T` : `${t.credits > 0 ? '+' : ''}${t.credits} кредит`
  return { title: map[t.type] ?? t.type, meta: `${t.type.toUpperCase()} · ${date}`, amount, positive }
}

export function Wallet() {
  const navigate = useNavigate()
  const { credits, isAuthed, refresh } = useUser()
  const [selected, setSelected] = useState('p4')
  const [txns, setTxns] = useState<ServerTxn[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  async function loadTxns() {
    if (!isAuthed) return
    try {
      const { transactions } = await api.transactions()
      setTxns(transactions)
    } catch {
      /* чимээгүй */
    }
  }

  useEffect(() => {
    void loadTxns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed])

  async function handleTopup() {
    if (!isAuthed) {
      navigate('/login')
      return
    }
    setBusy(true)
    setToast(null)
    try {
      await api.topup(selected)
      await refresh()
      await loadTxns()
      const pack = creditPacks.find((p) => p.id === selected)
      setToast(`${pack?.credits ?? ''} кредит амжилттай нэмэгдлээ ✓`)
    } catch {
      setToast('Төлбөр амжилтгүй боллоо')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '40px 24px 64px' }}>
        <PageHead
          eyebrow="Хэтэвч"
          title="Кредит цэнэглэх"
          subtitle="1 bid = 1 кредит. Зарцуулсан кредит бүр Token болж эргэж ирнэ. QPay-ээр хормын дотор цэнэглэ."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)',
            gap: 28,
            alignItems: 'start',
          }}
          className="nb-two-col"
        >
          {/* Left: packs */}
          <div>
            <div className="nb-eyebrow" style={{ marginBottom: 14 }}>
              Кредит багц
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: 12,
              }}
            >
              {creditPacks.map((p) => {
                const active = selected === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    style={{
                      textAlign: 'left',
                      background: 'var(--nb-surface)',
                      border: active
                        ? '1.5px solid var(--nb-blue)'
                        : p.best
                          ? '1.5px solid var(--nb-green)'
                          : '0.5px solid var(--nb-line)',
                      borderRadius: 16,
                      padding: '18px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      position: 'relative',
                      color: 'var(--nb-ink)',
                    }}
                  >
                    {p.best && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          font: "700 8px 'JetBrains Mono'",
                          letterSpacing: '.08em',
                          color: 'var(--nb-green)',
                        }}
                      >
                        ХАМГИЙН АШИГТАЙ
                      </span>
                    )}
                    <div
                      className="nb-tnum"
                      style={{ font: "800 30px 'Rubik', sans-serif", letterSpacing: '-.01em' }}
                    >
                      {p.credits}
                    </div>
                    <div style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>
                      кредит
                    </div>
                    <div style={{ font: "700 17px 'Rubik', sans-serif", marginTop: 6 }}>{p.price}</div>
                    <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>
                      {p.perCredit}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleTopup}
              disabled={busy}
              className="nb-btn nb-btn-primary"
              style={{ width: '100%', marginTop: 18, padding: '15px 0', display: 'flex', justifyContent: 'center', gap: 8, opacity: busy ? 0.6 : 1 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#fff" strokeWidth="1.8" />
                <path d="M14 14h3v3h-3zM18 18h3v3h-3z" fill="#fff" />
              </svg>
              {busy ? 'Төлж байна…' : isAuthed ? 'QPay-ээр төлөх' : 'Нэвтэрч төлөх'}
            </button>
            {toast && (
              <div style={{ marginTop: 10, textAlign: 'center', font: "600 12px 'Golos Text'", color: 'var(--nb-green)' }}>
                {toast}
              </div>
            )}
            <div
              style={{
                textAlign: 'center',
                font: "500 12px 'Golos Text'",
                color: 'var(--nb-ink-2)',
                marginTop: 10,
              }}
            >
              QPay QR уншуулж эсвэл банкны апп-аар төлнө
            </div>
          </div>

          {/* Right: balance + history */}
          <aside>
            <div
              style={{
                background: 'var(--nb-dark)',
                borderRadius: 18,
                padding: 22,
                color: '#F5F4F0',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  right: -30,
                  top: -30,
                  width: 130,
                  height: 130,
                  borderRadius: '50%',
                  border: '22px solid rgba(255,213,66,.08)',
                }}
              />
              <div style={{ font: "700 8.5px 'JetBrains Mono'", letterSpacing: '.14em', color: '#9BA1AE' }}>
                КРЕДИТИЙН ҮЛДЭГДЭЛ
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <span className="nb-tnum" style={{ font: "800 40px 'Rubik', sans-serif" }}>
                  {credits}
                </span>
                <span style={{ font: "700 12px 'JetBrains Mono'", color: '#9BA1AE' }}>КРЕДИТ</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '0.5px solid rgba(245,244,240,.12)',
                  font: "500 10px 'JetBrains Mono'",
                }}
              >
                <span style={{ color: '#9BA1AE' }}>1 BID = 1 КРЕДИТ</span>
                <span style={{ color: '#3DDC84' }}>ЗАРЦУУЛСАН = +1 TOKEN</span>
              </div>
            </div>

            <div className="nb-eyebrow" style={{ margin: '24px 0 10px' }}>
              Гүйлгээний түүх
            </div>
            <div
              style={{
                background: 'var(--nb-surface)',
                border: '0.5px solid var(--nb-line)',
                borderRadius: 14,
                padding: '2px 16px',
              }}
            >
              {!isAuthed && (
                <div style={{ padding: '16px 0', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-2)', textAlign: 'center' }}>
                  Түүх харахын тулд нэвтэрнэ үү.
                </div>
              )}
              {isAuthed && txns.length === 0 && (
                <div style={{ padding: '16px 0', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-2)', textAlign: 'center' }}>
                  Гүйлгээ алга байна.
                </div>
              )}
              {txns.map((raw, i) => {
                const t = mapTxn(raw)
                return (
                  <div
                    key={raw.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '13px 0',
                      borderBottom: i < txns.length - 1 ? '0.5px solid var(--nb-line-soft)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ font: "600 13.5px 'Golos Text'" }}>{t.title}</div>
                      <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-2)', marginTop: 2 }}>
                        {t.meta}
                      </div>
                    </div>
                    <span style={{ font: "700 13px 'JetBrains Mono'", color: t.positive ? 'var(--nb-green)' : 'var(--nb-ink)' }}>
                      {t.amount}
                    </span>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  )
}
