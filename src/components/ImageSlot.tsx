import type { CSSProperties } from 'react'

/**
 * Барааны зураг. `src` өгвөл жинхэнэ зургийг, эс бөгөөс судалтай placeholder-ыг харуулна.
 * Зураг ачаалагдахгүй бол (файл устсан гэх мэт) placeholder руу буцна.
 */
export function ImageSlot({
  label = 'Зураг',
  src,
  height,
  style,
  eager = false,
}: {
  label?: string
  src?: string | null
  height: number | string
  style?: CSSProperties
  /** Дэлгэц дээр шууд харагдах гол зурагт (detail хуудас) — lazy болгохгүй */
  eager?: boolean
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        loading={eager ? 'eager' : 'lazy'}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
        style={{ width: '100%', height, objectFit: 'cover', display: 'block', ...style }}
      />
    )
  }

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
