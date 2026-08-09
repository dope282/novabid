/** Кредит ба Token badge-ууд (header дээр харагддаг) */

function Bolt({ fill }: { fill: string }) {
  return (
    <svg width="9" height="12" viewBox="0 0 9 12">
      <path d="M5.5 0 0 7h3.2L2.5 12 9 4.6H5L5.5 0Z" fill={fill} />
    </svg>
  )
}

export function CreditBadge({ value, empty = false }: { value: number; empty?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: empty ? 'var(--nb-red)' : 'var(--nb-ink)',
        borderRadius: 8,
        padding: '6px 10px',
      }}
    >
      <Bolt fill={empty ? '#fff' : 'var(--nb-gold)'} />
      <span style={{ font: "700 12px 'JetBrains Mono'", color: empty ? '#fff' : 'var(--nb-bg)' }}>
        {value}
      </span>
    </div>
  )
}

export function TokenBadge({ value }: { value: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'var(--nb-surface)',
        border: '0.5px solid var(--nb-line)',
        borderRadius: 8,
        padding: '6px 10px',
      }}
    >
      <span
        style={{
          width: 13,
          height: 13,
          borderRadius: 4,
          background: 'var(--nb-green)',
          color: '#fff',
          font: "800 8px 'Rubik', sans-serif",
          display: 'grid',
          placeItems: 'center',
        }}
      >
        T
      </span>
      <span style={{ font: "700 12px 'JetBrains Mono'", color: 'var(--nb-ink)' }}>{value}</span>
    </div>
  )
}
