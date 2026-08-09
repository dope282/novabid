import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAdminAuth } from './auth'

export function AdminLogin() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const [email, setEmail] = useState('admin@novabid.mn')
  const [password, setPassword] = useState('12345678')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Нэвтрэх амжилтгүй')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--nb-bg)',
        padding: 24,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--nb-surface)',
          border: '0.5px solid var(--nb-line)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 12px 40px rgba(21,23,30,.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 24 }}>
          <span
            style={{
              width: 34,
              height: 34,
              background: 'var(--nb-blue)',
              borderRadius: 9,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              font: "800 16px 'Rubik', sans-serif",
            }}
          >
            N
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ font: "800 16px 'Rubik', sans-serif", letterSpacing: '.03em' }}>NOVABID</span>
            <span style={{ font: "700 8px 'JetBrains Mono'", letterSpacing: '.16em', color: 'var(--nb-ink-2)' }}>
              ADMIN
            </span>
          </span>
        </div>

        <div style={{ font: "800 20px 'Golos Text'", letterSpacing: '-.01em' }}>Удирдлагын нэвтрэлт</div>
        <div style={{ font: "400 13px/1.5 'Golos Text'", color: 'var(--nb-ink-2)', margin: '8px 0 20px' }}>
          Зөвхөн эрх бүхий ажилтан нэвтэрнэ.
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <span style={{ font: "700 9px 'JetBrains Mono'", letterSpacing: '.12em', color: 'var(--nb-ink-2)' }}>
            ИМЭЙЛ
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <span style={{ font: "700 9px 'JetBrains Mono'", letterSpacing: '.12em', color: 'var(--nb-ink-2)' }}>
            НУУЦ ҮГ
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </label>

        {error && (
          <div
            style={{
              font: "500 12px 'Golos Text'",
              color: 'var(--nb-red)',
              background: 'rgba(229,72,77,.1)',
              border: '0.5px solid rgba(229,72,77,.3)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="nb-btn nb-btn-primary"
          style={{ width: '100%', padding: '14px 0', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Түр хүлээнэ үү…' : 'Нэвтрэх'}
        </button>

        <div
          style={{
            font: "500 11px/1.5 'Golos Text'",
            color: 'var(--nb-ink-3)',
            textAlign: 'center',
            marginTop: 14,
          }}
        >
          Demo: admin@novabid.mn / 12345678
        </div>
      </form>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 6,
  background: 'var(--nb-bg)',
  border: '0.5px solid var(--nb-line)',
  borderRadius: 8,
  padding: '13px 14px',
  font: "500 14px 'Golos Text'",
  color: 'var(--nb-ink)',
  outline: 'none',
}
