import { useEffect, useState } from 'react'
import { api } from '../lib/api'

/**
 * Дүрсний өнгө сонгох палитр. Жагсаалтыг серверээс татна — сервер мөн
 * хадгалахдаа шалгадаг тул хоёр тал салж зөрөхгүй.
 */
export function ColorPicker({
  value,
  onChange,
  initial,
  size = 34,
}: {
  value: string
  onChange: (color: string) => void
  /** Дүрсэн дээр харагдах үсэг */
  initial?: string
  size?: number
}) {
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    let alive = true
    api
      .avatarColors()
      .then(({ colors }) => alive && setColors(colors))
      .catch(() => alive && setColors([]))
    return () => {
      alive = false
    }
  }, [])

  if (!colors.length) return null

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {colors.map((c) => {
        const picked = c.toUpperCase() === value.toUpperCase()
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={c}
            style={{
              width: size,
              height: size,
              borderRadius: 10,
              background: c,
              color: '#fff',
              font: `800 ${Math.round(size * 0.4)}px 'Rubik', sans-serif`,
              display: 'grid',
              placeItems: 'center',
              border: picked ? '2.5px solid var(--nb-ink)' : '0.5px solid var(--nb-line)',
              outline: picked ? '2px solid var(--nb-bg)' : 'none',
              outlineOffset: -4,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {(initial || '?').toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
