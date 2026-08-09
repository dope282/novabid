/** Дээд талын live ticker — сүүлийн ялалтууд гүйнэ */

const items = [
  { dot: '#3DDC84', text: 'S.TUVSHIN ЯЛЛАА — IPHONE 16 PRO · 41,254₮' },
  { dot: '#FFD542', text: 'LOT 041 ХААГДЛАА — 128 BID' },
  { dot: '#3DDC84', text: 'B.ANAR ЯЛЛАА — DYSON V15 · 12,847₮' },
]

export function Ticker({ dark = false }: { dark?: boolean }) {
  const line = [...items, ...items]
  return (
    <div
      style={{
        overflow: 'hidden',
        background: dark ? '#000' : '#0E1014',
        padding: '7px 0',
        whiteSpace: 'nowrap',
        borderTop: dark ? '0.5px solid rgba(245,244,240,.08)' : undefined,
        borderBottom: dark ? '0.5px solid rgba(245,244,240,.08)' : undefined,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          animation: 'nb-ticker 20s linear infinite',
          font: "500 9.5px 'JetBrains Mono'",
          letterSpacing: '.08em',
          color: '#9BA1AE',
        }}
      >
        {line.map((it, i) => (
          <span key={i}>
            <span style={{ color: it.dot }}>●</span> {it.text}
            &nbsp;&nbsp;&nbsp;
          </span>
        ))}
      </div>
    </div>
  )
}
