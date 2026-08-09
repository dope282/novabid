import type { CSSProperties } from 'react'

/** Зургийн placeholder — жинхэнэ зураг ирэх хүртэл */
export function ImageSlot({
  label = 'Зураг',
  height,
  style,
}: {
  label?: string
  height: number | string
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'grid',
        placeItems: 'center',
        background:
          'repeating-linear-gradient(135deg, var(--nb-fill) 0 10px, var(--nb-line-soft) 10px 20px)',
        color: 'var(--nb-ink-3)',
        font: "500 11px 'JetBrains Mono'",
        letterSpacing: '.06em',
        ...style,
      }}
    >
      {label}
    </div>
  )
}
