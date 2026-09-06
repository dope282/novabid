import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

/** Танихгүй зам — router-ийн default error boundary харагдахаас сэргийлнэ */
export function NotFound() {
  return (
    <PageShell>
      <div
        className="nb-container"
        style={{
          minHeight: '52vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
          padding: '64px 24px',
        }}
      >
        <span className="nb-eyebrow" style={{ color: 'var(--nb-amber)' }}>
          Алдаа 404
        </span>
        <div style={{ font: "800 34px 'Golos Text'", letterSpacing: '-.01em' }}>Хуудас олдсонгүй</div>
        <div style={{ font: "500 15px 'Golos Text'", color: 'var(--nb-ink-2)', maxWidth: 420 }}>
          Таны хайсан хуудас байхгүй эсвэл зөөгдсөн байна. Аукцион дууссан бол лот архивлагдсан
          байж болно.
        </div>
        <Link to="/" className="nb-btn nb-btn-primary" style={{ marginTop: 8 }}>
          Аукцион руу буцах
        </Link>
      </div>
    </PageShell>
  )
}
