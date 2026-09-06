import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { ProfileEditModal } from '../components/ProfileEditModal'
import { useTheme } from '../theme'
import { useUser } from '../user'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        background: on ? 'var(--nb-blue)' : 'var(--nb-fill)',
        position: 'relative',
        transition: 'background .15s ease',
        flex: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          transition: 'left .15s ease',
        }}
      />
    </button>
  )
}

export function Profile() {
  const { theme, toggle } = useTheme()
  const { user, loading, logout, refresh } = useUser()
  const navigate = useNavigate()
  const [push, setPush] = useState(true)
  const [haptic, setHaptic] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [loading, user, navigate])

  if (!user) {
    return (
      <PageShell>
        <div className="nb-container" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--nb-ink-2)' }}>
          Ачаалж байна…
        </div>
      </PageShell>
    )
  }

  const stats = [
    { value: user.credits, label: 'КРЕДИТ', color: 'var(--nb-ink)' },
    { value: user.tokens, label: 'TOKEN', color: 'var(--nb-green)' },
    { value: user.wins, label: 'ЯЛАЛТ', color: 'var(--nb-blue)' },
  ]

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '40px 24px 64px', maxWidth: 760 }}>
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: user.avatarColor,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              font: "800 26px 'Rubik', sans-serif",
              flex: 'none',
            }}
          >
            {(user.name || user.email)[0].toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ font: "800 22px 'Golos Text'" }}>{user.name || 'Хэрэглэгч'}</span>
              <button
                onClick={() => setEditing(true)}
                style={{ font: "600 12px 'Golos Text'", color: 'var(--nb-blue)', background: 'none', border: 'none', padding: 0 }}
              >
                Засах
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              <span style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-ink-2)' }}>{user.email}</span>
              {user.verified ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    font: "700 8px 'JetBrains Mono'",
                    letterSpacing: '.06em',
                    color: 'var(--nb-green)',
                    background: 'rgba(31,165,94,.1)',
                    borderRadius: 5,
                    padding: '3px 6px',
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <path d="m5 12.5 4.5 4.5L19 7.5" stroke="#1FA55E" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  БАТАЛГААЖСАН
                </span>
              ) : (
                <span style={{ font: "700 8px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-amber)', background: 'rgba(232,147,12,.12)', borderRadius: 5, padding: '3px 6px' }}>
                  БАТАЛГААЖААГҮЙ
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {stats.map((s) => (
            <div
              key={s.label}
              style={{
                background: 'var(--nb-surface)',
                border: '0.5px solid var(--nb-line)',
                borderRadius: 14,
                padding: '16px 18px',
              }}
            >
              <div className="nb-tnum" style={{ font: "800 24px 'Rubik', sans-serif", color: s.color }}>
                {s.value}
              </div>
              <div style={{ font: "600 9px 'JetBrains Mono'", letterSpacing: '.08em', color: 'var(--nb-ink-2)', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="nb-eyebrow" style={{ marginBottom: 10 }}>
          Тохиргоо
        </div>
        <div
          style={{
            background: 'var(--nb-surface)',
            border: '0.5px solid var(--nb-line)',
            borderRadius: 14,
            padding: '4px 18px',
          }}
        >
          {[
            { label: 'Push мэдэгдэл', el: <Toggle on={push} onClick={() => setPush((v) => !v)} /> },
            { label: 'Soft close дохио (haptic)', el: <Toggle on={haptic} onClick={() => setHaptic((v) => !v)} /> },
            { label: 'Харанхуй горим', el: <Toggle on={theme === 'dark'} onClick={toggle} /> },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 0',
                borderBottom: '0.5px solid var(--nb-line-soft)',
              }}
            >
              <span style={{ font: "600 14px 'Golos Text'" }}>{row.label}</span>
              {row.el}
            </div>
          ))}

          {[
            { label: 'Найзаа урих', to: '/referral' },
            { label: 'Аукцион дүрэм', to: '/how' },
            { label: 'Тусламж / Холбоо барих', to: '/how' },
          ].map((row, i, arr) => (
            <Link
              key={i}
              to={row.to}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 0',
                borderBottom: i < arr.length - 1 ? '0.5px solid var(--nb-line-soft)' : 'none',
                color: 'var(--nb-ink)',
              }}
            >
              <span style={{ font: "600 14px 'Golos Text'" }}>{row.label}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="m9 5 7 7-7 7" stroke="var(--nb-ink-3)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </Link>
          ))}
        </div>

        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="nb-btn"
          style={{
            width: '100%',
            marginTop: 18,
            background: 'transparent',
            color: 'var(--nb-red)',
            border: '0.5px solid rgba(229,72,77,.3)',
          }}
        >
          Гарах
        </button>
      </div>

      {editing && (
        <ProfileEditModal
          user={user}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            void refresh()
          }}
        />
      )}
    </PageShell>
  )
}
