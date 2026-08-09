import { Link } from 'react-router-dom'
import { PageShell } from '../components/PageShell'

/** Дараа хийгдэх хуудсуудын түр placeholder */
export function Placeholder({ title }: { title: string }) {
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
        <span className="nb-eyebrow">Удахгүй</span>
        <div style={{ font: "800 34px 'Golos Text'", letterSpacing: '-.01em' }}>{title}</div>
        <div style={{ font: "500 15px 'Golos Text'", color: 'var(--nb-ink-2)', maxWidth: 420 }}>
          Энэ хуудас бүтээгдэж байна. Тун удахгүй нэмэгдэнэ.
        </div>
        <Link to="/" className="nb-btn nb-btn-primary" style={{ marginTop: 8 }}>
          Аукцион руу буцах
        </Link>
      </div>
    </PageShell>
  )
}
