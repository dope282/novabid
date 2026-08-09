import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { api, type ApiLot } from '../lib/api'
import { formatTugrik } from '../lib/format'
import { useUser } from '../user'

/** Аукцион дууссаны дараах үр дүн — Ялалт эсвэл Consolation (Token буцаалт) */
export function AuctionResult({ outcome }: { outcome: 'win' | 'consolation' }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { tokens } = useUser()
  const [lot, setLot] = useState<ApiLot | null>(null)

  useEffect(() => {
    api
      .lot(id)
      .then(({ lot }) => setLot(lot))
      .catch(() => setLot(null))
  }, [id])

  const title = lot?.subtitle ?? lot?.title ?? 'Лот'
  const lotLabel = lot?.code ?? 'LOT'

  if (outcome === 'win') {
    return (
      <PageShell>
        <div className="nb-container" style={{ padding: '48px 24px 64px', maxWidth: 560 }}>
          <div
            style={{
              background: 'var(--nb-dark)',
              backgroundImage:
                'repeating-linear-gradient(0deg,rgba(255,255,255,.02) 0 1px,transparent 1px 5px)',
              borderRadius: 24,
              padding: '36px 28px 30px',
              color: '#F5F4F0',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                font: "700 9.5px 'JetBrains Mono'",
                letterSpacing: '.2em',
                color: 'var(--nb-gold)',
                marginBottom: 16,
              }}
            >
              {lotLabel} · ХААГДЛАА
            </div>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 24,
                background: 'var(--nb-green)',
                margin: '0 auto 20px',
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 0 0 10px rgba(31,165,94,.12), 0 0 0 24px rgba(31,165,94,.05)',
              }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <path
                  d="m5 12.5 4.5 4.5L19 7.5"
                  stroke="#fff"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ font: "800 30px/1.15 'Golos Text'", letterSpacing: '-.01em' }}>
              Та яллаа!
            </div>
            <div style={{ font: "400 14px/1.5 'Golos Text'", color: '#9BA1AE', marginTop: 10 }}>
              {title}
              <br />
              Эцсийн үнэ — таны сүүлийн bid
            </div>
            <div
              className="nb-tnum"
              style={{ font: "800 38px 'Rubik', sans-serif", color: 'var(--nb-green-bright)', marginTop: 14 }}
            >
              {lot ? formatTugrik(lot.price) : '—'}
            </div>

            <div
              style={{
                margin: '22px 0',
                background: 'rgba(245,244,240,.05)',
                border: '0.5px solid rgba(245,244,240,.14)',
                borderRadius: 14,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                textAlign: 'left',
              }}
            >
              {[
                <>
                  <b style={{ color: '#fff' }}>7 хоногийн дотор</b> хүргэлтийн мэдээллээ баталгаажуулна
                  уу — эс бөгөөс эрх цуцлагдана.
                </>,
                <>Төлбөр = эцсийн үнэ. Bid-д зарцуулсан кредит тооцогдохгүй.</>,
                <>Хүргэлт УБ хотод 1–3 хоног, орон нутагт 3–7 хоног.</>,
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      font: "700 10px 'JetBrains Mono'",
                      color: 'var(--nb-gold)',
                      flex: 'none',
                      marginTop: 1,
                    }}
                  >
                    0{i + 1}
                  </span>
                  <span style={{ font: "500 12px/1.5 'Golos Text'", color: '#D9D8D2' }}>{t}</span>
                </div>
              ))}
            </div>

            <button
              className="nb-btn"
              style={{
                width: '100%',
                background: 'var(--nb-green)',
                color: '#fff',
                boxShadow: '0 2px 0 var(--nb-green-shadow)',
                padding: '15px 0',
              }}
            >
              Хүргэлтийн мэдээлэл оруулах
            </button>
            <button
              onClick={() => navigate('/')}
              style={{
                width: '100%',
                marginTop: 10,
                background: 'transparent',
                color: '#9BA1AE',
                border: '0.5px solid rgba(245,244,240,.2)',
                borderRadius: 8,
                padding: '13px 0',
                font: "600 13px 'Golos Text'",
              }}
            >
              Дараа хийе
            </button>
          </div>
        </div>
      </PageShell>
    )
  }

  // --- Consolation ---
  const gained = 12
  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '48px 24px 64px', maxWidth: 520 }}>
        <div
          style={{
            background: 'var(--nb-surface)',
            border: '0.5px solid var(--nb-line)',
            borderRadius: 24,
            padding: '36px 28px 30px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              font: "700 9.5px 'JetBrains Mono'",
              letterSpacing: '.2em',
              color: 'var(--nb-ink-2)',
              marginBottom: 16,
            }}
          >
            {lotLabel} · ХААГДЛАА
          </div>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 24,
              background: '#0C3B24',
              margin: '0 auto 20px',
              display: 'grid',
              placeItems: 'center',
              font: "800 32px 'Rubik', sans-serif",
              color: 'var(--nb-green-bright)',
            }}
          >
            T
          </div>
          <div style={{ font: "800 24px/1.2 'Golos Text'", letterSpacing: '-.01em' }}>
            Та {gained} Token авлаа
          </div>
          <div style={{ font: "400 14px/1.55 'Golos Text'", color: 'var(--nb-ink-2)', marginTop: 10 }}>
            Энэ удаад яласангүй ч таны зарцуулсан {gained} кредит бүр Token болж буцлаа.
          </div>

          <div
            style={{
              margin: '20px 0',
              background: 'var(--nb-bg)',
              border: '0.5px solid var(--nb-line)',
              borderRadius: 14,
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ font: "600 13px 'Golos Text'", color: 'var(--nb-ink-2)' }}>
              Шинэ үлдэгдэл
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  background: 'var(--nb-green)',
                  color: '#fff',
                  font: "800 9px 'Rubik', sans-serif",
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                T
              </span>
              <span className="nb-tnum" style={{ font: "800 18px 'Rubik', sans-serif" }}>
                {tokens}
              </span>
            </span>
          </div>

          <Link
            to="/shop"
            className="nb-btn"
            style={{
              display: 'block',
              width: '100%',
              background: 'var(--nb-ink)',
              color: 'var(--nb-bg)',
              padding: '15px 0',
              textAlign: 'center',
            }}
          >
            Token дэлгүүр үзэх
          </Link>
          <button
            onClick={() => navigate('/')}
            className="nb-btn nb-btn-ghost"
            style={{ width: '100%', marginTop: 10, padding: '13px 0', color: 'var(--nb-blue)' }}
          >
            Дараагийн лот руу →
          </button>
        </div>
      </div>
    </PageShell>
  )
}
