/** Админ хүснэгтийн статус шошго */
export function Pill({ label, color }: { label: string; color: 'green' | 'amber' | 'red' | 'blue' | 'gray' }) {
  const map = {
    green: { c: 'var(--nb-green)', b: 'rgba(31,165,94,.1)' },
    amber: { c: 'var(--nb-amber)', b: 'rgba(232,147,12,.12)' },
    red: { c: 'var(--nb-red)', b: 'rgba(229,72,77,.1)' },
    blue: { c: 'var(--nb-blue)', b: 'rgba(51,70,230,.1)' },
    gray: { c: 'var(--nb-ink-2)', b: 'var(--nb-fill)' },
  }[color]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        font: "700 9.5px 'JetBrains Mono'",
        letterSpacing: '.04em',
        color: map.c,
        background: map.b,
        padding: '3px 8px',
        borderRadius: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
