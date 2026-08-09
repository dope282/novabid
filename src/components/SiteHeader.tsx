import { Link, NavLink } from 'react-router-dom'
import { CreditBadge, TokenBadge } from './Badges'
import { ThemeToggle } from './ThemeToggle'
import { useUser } from '../user'

const navItems = [
  { to: '/', label: 'Дуудлага худалдаа', end: true },
  { to: '/shop', label: 'Дэлгүүр', end: false },
  { to: '/wallet', label: 'Хэтэвч', end: false },
  { to: '/tokens', label: 'Token', end: false },
  { to: '/how', label: 'Хэрхэн ажилладаг', end: false },
]

/** Вэб сайтын дээд навигаци */
export function SiteHeader() {
  const { credits, tokens, isAuthed } = useUser()
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'color-mix(in srgb, var(--nb-bg) 88%, transparent)',
        backdropFilter: 'saturate(140%) blur(12px)',
        borderBottom: '0.5px solid var(--nb-line)',
      }}
    >
      <div
        className="nb-container"
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, color: 'var(--nb-ink)' }}>
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
          <span style={{ font: "700 17px 'Rubik', sans-serif", letterSpacing: '.04em' }}>
            NOVABID
          </span>
        </Link>

        {/* Nav links (desktop) */}
        <nav className="nb-nav" style={{ display: 'flex', gap: 28, marginRight: 'auto', marginLeft: 16 }}>
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              style={({ isActive }) => ({
                font: "600 14px 'Golos Text'",
                color: isActive ? 'var(--nb-ink)' : 'var(--nb-ink-2)',
              })}
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Balances + auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isAuthed && (
            <span className="nb-balances" style={{ display: 'flex', gap: 8 }}>
              <CreditBadge value={credits} empty={credits === 0} />
              <TokenBadge value={tokens} />
            </span>
          )}
          <ThemeToggle />
          {isAuthed ? (
            <Link to="/profile" className="nb-btn nb-btn-primary" style={{ padding: '9px 16px' }}>
              Профайл
            </Link>
          ) : (
            <Link to="/login" className="nb-btn nb-btn-primary" style={{ padding: '9px 16px' }}>
              Нэвтрэх
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
