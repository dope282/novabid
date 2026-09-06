import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../user'
import { CreditBadge } from './Badges'

interface NavItem {
  to: string
  label: string
  end?: boolean
}

/**
 * Гар утасны навигаци. Дэлгэц нарийсахад `.nb-nav` нуугддаг тул
 * түүнийг орлох hamburger цэс — эс бөгөөс утсан дээр хаашаа ч очих боломжгүй.
 */
export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { isAuthed, credits, user } = useUser()

  // Хуудас солигдоход цэс автоматаар хаагдана
  useEffect(() => setOpen(false), [pathname])

  // Цэс нээлттэй үед арын хуудас гүйхээс сэргийлнэ
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        className="nb-burger"
        aria-label="Цэс"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'none',
          width: 38,
          height: 38,
          borderRadius: 10,
          border: '0.5px solid var(--nb-line)',
          background: 'var(--nb-surface)',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          {open ? (
            <path d="m6 6 12 12M18 6 6 18" stroke="var(--nb-ink)" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="var(--nb-ink)" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 60,
            background: 'rgba(14,16,20,.45)',
          }}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--nb-bg)',
              borderBottom: '0.5px solid var(--nb-line)',
              padding: '10px 16px 18px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100dvh - 64px)',
              overflowY: 'auto',
            }}
          >
            {isAuthed && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0 14px',
                  borderBottom: '0.5px solid var(--nb-line-soft)',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: user?.avatarColor ?? 'var(--nb-blue)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    font: "800 13px 'Rubik', sans-serif",
                    flex: 'none',
                  }}
                >
                  {(user?.name || user?.email || '?')[0].toUpperCase()}
                </span>
                <span style={{ font: "600 14px 'Golos Text'", flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || user?.email}
                </span>
                <CreditBadge value={credits} empty={credits === 0} />
              </div>
            )}

            {items.map((it) => {
              const active = it.end ? pathname === it.to : pathname.startsWith(it.to)
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  style={{
                    font: "600 15px 'Golos Text'",
                    color: active ? 'var(--nb-ink)' : 'var(--nb-ink-2)',
                    padding: '13px 0',
                    borderBottom: '0.5px solid var(--nb-line-soft)',
                  }}
                >
                  {it.label}
                </Link>
              )
            })}

            <Link
              to={isAuthed ? '/profile' : '/login'}
              className="nb-btn nb-btn-primary"
              style={{ marginTop: 14, padding: '13px 0', textAlign: 'center' }}
            >
              {isAuthed ? 'Профайл' : 'Нэвтрэх'}
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
