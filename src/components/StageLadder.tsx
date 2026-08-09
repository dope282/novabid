import { pad2 } from '../lib/format'

/** Шатны явц харуулах шат (ladder) — done/current/upcoming */
export function StageLadder({
  current,
  total,
  urgent = false,
}: {
  current: number
  total: number
  urgent?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done = n < current
        const isCurrent = n === current
        const bg = done
          ? 'var(--nb-blue)'
          : isCurrent
            ? urgent
              ? 'var(--nb-red)'
              : 'var(--nb-amber)'
            : 'var(--nb-fill)'
        const numColor = done || isCurrent ? '#fff' : 'var(--nb-ink-3)'
        return (
          <div
            key={n}
            style={{
              flex: 1,
              height: 18,
              borderRadius: 4,
              background: bg,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <span style={{ font: "700 7px 'JetBrains Mono'", color: numColor }}>{pad2(n)}</span>
          </div>
        )
      })}
    </div>
  )
}
