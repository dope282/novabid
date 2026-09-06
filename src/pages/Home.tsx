import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { Ticker } from '../components/Ticker'
import { LotCard } from '../components/LotCard'
import { ClosedLotCard } from '../components/ClosedLotCard'
import { VotingPoll } from '../components/VotingPoll'
import { api, type ApiLot, type ClosedLot } from '../lib/api'

const stats = [
  { value: '1₮', label: 'Эхлэх үнэ' },
  { value: '+1/2/3₮', label: 'Bid тутамд' },
  { value: '100%', label: 'Кредит → Token' },
  { value: 'Round', label: 'бүр өөр хугацаатай' },
]

export function Home() {
  const [lots, setLots] = useState<ApiLot[]>([])
  const [closed, setClosed] = useState<ClosedLot[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function fetchLots() {
      try {
        const { lots, closed, serverNow } = await api.lots()
        if (!alive) return
        setLots(lots)
        setClosed(closed)
        setOffset(serverNow - Date.now())
        setError(null)
      } catch {
        if (alive) setError('Сервертэй холбогдож чадсангүй. Backend (port 4000) асаалттай юу?')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void fetchLots()
    const iv = setInterval(fetchLots, 5000)
    return () => {
      alive = false
      clearInterval(iv)
    }
  }, [])

  const liveLots = lots.filter((l) => l.status === 'live')

  return (
    <PageShell>
      {/* Hero */}
      <section
        style={{
          background:
            'radial-gradient(120% 120% at 80% 0%, rgba(51,70,230,.12) 0%, transparent 55%), var(--nb-bg)',
        }}
      >
        <div className="nb-container" style={{ padding: '64px 24px 40px' }}>
          <div className="nb-hero-grid">
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                font: "700 11px 'JetBrains Mono'",
                letterSpacing: '.1em',
                color: liveLots.length ? 'var(--nb-blue-ink)' : 'var(--nb-ink-2)',
                background: liveLots.length ? 'rgba(51,70,230,.09)' : 'var(--nb-fill)',
                border: `0.5px solid ${liveLots.length ? 'rgba(51,70,230,.2)' : 'var(--nb-line)'}`,
                borderRadius: 20,
                padding: '6px 12px',
              }}
            >
              {/* Идэвхтэй лот байхгүй үед "live" цэг анивчих нь төөрөгдүүлнэ */}
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: liveLots.length ? 'var(--nb-green-bright)' : 'var(--nb-ink-3)',
                  animation: liveLots.length ? 'nb-live-dot 1.4s infinite' : 'none',
                }}
              />
              {liveLots.length
                ? `${liveLots.length} ДУУДЛАГА ХУДАЛДАА ЯГ ОДОО ИДЭВХТЭЙ`
                : 'ИДЭВХТЭЙ ЛОТ АЛГА — УДАХГҮЙ НЭЭГДЭНЭ'}
            </span>

            <h1
              style={{
                font: "800 clamp(34px, 6vw, 60px)/1.05 'Rubik', sans-serif",
                letterSpacing: '-.02em',
                margin: '20px 0 0',
              }}
            >
              Бүх зүйл <span style={{ color: 'var(--nb-blue)' }}>1₮</span>-өөс
              <br />
              эхэлдэг дуудлага худалдаа
            </h1>

            <p
              style={{
                font: "400 17px/1.6 'Golos Text'",
                color: 'var(--nb-ink-2)',
                margin: '18px 0 0',
                maxWidth: 560,
              }}
            >
              Bid бүр ердөө 1 кредит. Үнэ 1, 2, 3₮-өөр л өснө. Хамгийн сүүлд bid хийсэн хүн ялна —
              зарцуулсан кредит бүр Token болж эргэж ирнэ.
            </p>

            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <a href="#lots" className="nb-btn nb-btn-primary" style={{ padding: '14px 24px', fontSize: 15 }}>
                Идэвхтэй лот үзэх
              </a>
              <Link
                to="/how"
                className="nb-btn nb-btn-ghost"
                style={{ padding: '14px 24px', fontSize: 15 }}
              >
                Хэрхэн ажилладаг вэ?
              </Link>
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                gap: 40,
                marginTop: 40,
                flexWrap: 'wrap',
              }}
            >
              {stats.map((s) => (
                <div key={s.label}>
                  <div
                    className="nb-tnum"
                    style={{ font: "700 26px 'Rubik', sans-serif", letterSpacing: '-.01em' }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      font: "600 11px 'JetBrains Mono'",
                      letterSpacing: '.06em',
                      color: 'var(--nb-ink-2)',
                      marginTop: 4,
                    }}
                  >
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <VotingPoll />
          </div>
        </div>
      </section>

      {/* Full-width live ticker */}
      <Ticker />

      {/* Marketplace grid */}
      <section id="lots" className="nb-section">
        <div className="nb-container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: 24,
            }}
          >
            <div>
              <div className="nb-eyebrow">Идэвхтэй дуудлага худалдаа</div>
              <h2
                style={{
                  font: "800 28px 'Golos Text'",
                  letterSpacing: '-.01em',
                  margin: '6px 0 0',
                }}
              >
                Яг одоо явагдаж буй дуудлага худалдаа
              </h2>
            </div>
            <Link to="#" style={{ font: "600 14px 'Golos Text'", color: 'var(--nb-blue)' }}>
              Бүгдийг үзэх →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '40px 0', color: 'var(--nb-ink-2)', font: "500 14px 'Golos Text'" }}>
              Ачаалж байна…
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                borderRadius: 12,
                background: 'rgba(229,72,77,.1)',
                border: '0.5px solid rgba(229,72,77,.3)',
                color: 'var(--nb-red)',
                font: "500 14px 'Golos Text'",
              }}
            >
              {error}
            </div>
          ) : !liveLots.length ? (
            <div
              style={{
                padding: '48px 24px',
                borderRadius: 16,
                border: '1px dashed var(--nb-line)',
                background: 'var(--nb-surface)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  margin: '0 auto 14px',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(232,147,12,.12)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="8.5" stroke="var(--nb-amber)" strokeWidth="1.8" />
                  <path d="M12 7.5V12l3 2" stroke="var(--nb-amber)" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div style={{ font: "800 19px 'Golos Text'", letterSpacing: '-.01em', marginBottom: 6 }}>
                Идэвхтэй дуудлага худалдаа алга
              </div>
              <div style={{ font: "400 14px/1.6 'Golos Text'", color: 'var(--nb-ink-2)', maxWidth: 420, margin: '0 auto' }}>
                Одоогоор явагдаж буй лот байхгүй байна. Дараагийн лот удахгүй нээгдэнэ — доорх
                санал хураалтад оролцвол дараагийн барааг та сонгоно.
              </div>
              {!!closed.length && (
                <a
                  href="#closed"
                  className="nb-btn nb-btn-ghost"
                  style={{ marginTop: 18, display: 'inline-flex' }}
                >
                  Өмнөх дуудлага худалдаа үзэх
                </a>
              )}
            </div>
          ) : (
            <div className="nb-grid">
              {liveLots.map((lot) => (
                <LotCard key={lot.id} lot={lot} serverOffset={offset} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Дууссан аукционууд */}
      {!!closed.length && (
        <section id="closed" className="nb-section" style={{ background: 'var(--nb-fill)' }}>
          <div className="nb-container">
            <div style={{ marginBottom: 24 }}>
              <div className="nb-eyebrow">Архив</div>
              <h2 style={{ font: "800 28px 'Golos Text'", letterSpacing: '-.01em', margin: '6px 0 0' }}>
                Өмнөх дуудлага худалдаа
              </h2>
              <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: '6px 0 0' }}>
                Сүүлд хаагдсан {closed.length} лот — эцсийн үнэ, ялагчийн хамт.
              </p>
            </div>
            <div className="nb-grid">
              {closed.map((lot) => (
                <ClosedLotCard key={lot.id} lot={lot} />
              ))}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  )
}
