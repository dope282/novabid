/** Анхны bid хийхээс өмнө дүрэм тайлбарлах modal (нэг л удаа) */
export function FirstBidModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const rules = [
    <>
      Bid бүр <b>1 кредит</b> зарцуулна — кредит <b>буцаагдахгүй</b>.
    </>,
    <>
      Bid тус бүр үнийг зөвхөн <b>1, 2, 3₮</b>-өөр өсгөнө. Сүүлийн bid хийсэн хүн ялна.
    </>,
    <>
      Ялаагүй ч зарцуулсан кредит бүр <b style={{ color: 'var(--nb-green)' }}>1 Token</b> болж буцна.
    </>,
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(14,16,20,.55)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--nb-bg)',
          borderRadius: 20,
          border: '0.5px solid var(--nb-line)',
          padding: '26px 24px 28px',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
        }}
      >
        <div
          style={{
            font: "700 10px 'JetBrains Mono'",
            letterSpacing: '.14em',
            color: 'var(--nb-amber)',
            marginBottom: 8,
          }}
        >
          АНХНЫ BID — НЭГ Л УДАА
        </div>
        <div style={{ font: "800 22px/1.25 'Golos Text'", letterSpacing: '-.01em', marginBottom: 18 }}>
          Bid хийхээсээ өмнө
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
          {rules.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: 'var(--nb-ink)',
                  color: 'var(--nb-gold)',
                  font: "800 11px 'Rubik', sans-serif",
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                }}
              >
                {i + 1}
              </div>
              <div style={{ font: "500 13.5px/1.5 'Golos Text'", color: 'var(--nb-ink)' }}>{r}</div>
            </div>
          ))}
        </div>

        <button
          onClick={onConfirm}
          className="nb-btn nb-btn-primary"
          style={{ width: '100%', padding: '15px 0' }}
        >
          Ойлголоо, bid хийе
        </button>
        <div
          style={{
            textAlign: 'center',
            font: "500 11px 'Golos Text'",
            color: 'var(--nb-ink-2)',
            marginTop: 12,
          }}
        >
          Энэ мэдэгдэл дахин харагдахгүй
        </div>
      </div>
    </div>
  )
}
