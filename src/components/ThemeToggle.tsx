import { useTheme } from '../theme'

/** Light/Dark горим сэлгэх товч */
export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Гэрэлтэй горим' : 'Харанхуй горим'}
      title={isDark ? 'Гэрэлтэй горим' : 'Харанхуй горим'}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        background: 'var(--nb-surface)',
        border: '0.5px solid var(--nb-line)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--nb-ink)',
        flex: 'none',
      }}
    >
      {isDark ? (
        // Sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        // Moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
