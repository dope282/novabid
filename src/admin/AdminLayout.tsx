import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAdminAuth } from './auth'
import { ThemeToggle } from '../components/ThemeToggle'

const nav: { to: string; label: string; end?: boolean; icon: React.ReactNode }[] = [
  {
    to: '/admin',
    label: 'Тойм',
    end: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    to: '/admin/auctions',
    label: 'Аукцион',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="m14 6-8 8M9 3l6 6M4 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m10 10 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/admin/users',
    label: 'Хэрэглэгчид',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 20c.8-3 3-4.5 5.5-4.5S13.7 17 14.5 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 5.5a3 3 0 0 1 0 5.6M17.5 20c-.3-2-1-3.4-2-4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: '/admin/payments',
    label: 'Төлбөр',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
]

export function AdminLayout() {
  const { email, logout } = useAdminAuth()

  return (
    <div className="nb-admin">
      {/* Sidebar */}
      <aside className="nb-admin-sidebar">
        <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--nb-ink)', padding: '4px 8px 20px' }}>
          <span
            style={{
              width: 30,
              height: 30,
              background: 'var(--nb-blue)',
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              font: "800 15px 'Rubik', sans-serif",
            }}
          >
            N
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ font: "800 14px 'Rubik', sans-serif", letterSpacing: '.03em' }}>NOVABID</span>
            <span style={{ font: "700 8px 'JetBrains Mono'", letterSpacing: '.16em', color: 'var(--nb-ink-2)' }}>
              ADMIN
            </span>
          </span>
        </Link>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '11px 12px',
                borderRadius: 10,
                font: "600 13.5px 'Golos Text'",
                color: isActive ? 'var(--nb-blue)' : 'var(--nb-ink-2)',
                background: isActive ? 'rgba(51,70,230,.1)' : 'transparent',
              })}
            >
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 20 }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              font: "500 12.5px 'Golos Text'",
              color: 'var(--nb-ink-2)',
              padding: '8px 12px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 4 7 12l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Сайт руу буцах
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="nb-admin-main">
        <header className="nb-admin-topbar">
          <span style={{ font: "700 10px 'JetBrains Mono'", letterSpacing: '.14em', color: 'var(--nb-ink-2)' }}>
            УДИРДЛАГЫН ПАНЕЛ
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThemeToggle />
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: 'var(--nb-ink)',
                  color: 'var(--nb-bg)',
                  display: 'grid',
                  placeItems: 'center',
                  font: "800 13px 'Rubik', sans-serif",
                }}
              >
                {(email ?? 'A')[0].toUpperCase()}
              </div>
              <div className="nb-admin-user" style={{ lineHeight: 1.2 }}>
                <div style={{ font: "600 12.5px 'Golos Text'" }}>{email ?? 'admin'}</div>
                <button
                  onClick={logout}
                  style={{ font: "600 11px 'Golos Text'", color: 'var(--nb-red)', background: 'none', border: 'none', padding: 0 }}
                >
                  Гарах
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="nb-admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
