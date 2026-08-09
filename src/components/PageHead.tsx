/** Дотоод хуудсуудын нэгдсэн гарчиг блок */
export function PageHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="nb-eyebrow">{eyebrow}</div>
      <h1
        style={{
          font: "800 clamp(26px, 4vw, 36px) 'Golos Text'",
          letterSpacing: '-.01em',
          margin: '6px 0 0',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p style={{ font: "400 15px/1.6 'Golos Text'", color: 'var(--nb-ink-2)', margin: '10px 0 0', maxWidth: 560 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
