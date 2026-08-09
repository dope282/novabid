import { Link } from 'react-router-dom'

const cols: { title: string; links: string[] }[] = [
  { title: 'Платформ', links: ['Дуудлага худалдаа', 'Дэлгүүр', 'Хэрхэн ажилладаг', 'Token'] },
  { title: 'Тусламж', links: ['Түгээмэл асуулт', 'Дүрэм журам', 'Холбоо барих', 'Хүргэлт'] },
  { title: 'Хууль', links: ['Үйлчилгээний нөхцөл', 'Нууцлалын бодлого'] },
]

/** Вэб сайтын хөл хэсэг */
export function SiteFooter() {
  return (
    <footer
      style={{
        marginTop: 'auto',
        background: 'var(--nb-dark)',
        color: '#F5F4F0',
        borderTop: '0.5px solid var(--nb-line)',
        paddingTop: 48,
        paddingBottom: 32,
      }}
    >
      <div className="nb-container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr repeat(3, 1fr)',
            gap: 32,
          }}
          className="nb-footer-grid"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  background: 'var(--nb-blue)',
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  font: "800 15px 'Rubik', sans-serif",
                }}
              >
                N
              </span>
              <span style={{ font: "700 17px 'Rubik', sans-serif", letterSpacing: '.04em' }}>
                NOVABID
              </span>
            </div>
            <p style={{ font: "400 13px/1.6 'Golos Text'", color: '#9BA1AE', maxWidth: 280 }}>
              1₮-өөс эхлэх шударга аукцион. Bid бүр 1 кредит — зарцуулсан кредит бүр Token болж буцна.
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <div
                style={{
                  font: "700 10px 'JetBrains Mono'",
                  letterSpacing: '.14em',
                  color: '#6B6F7B',
                  marginBottom: 14,
                }}
              >
                {c.title.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {c.links.map((l) => (
                  <Link key={l} to="#" style={{ font: "500 13.5px 'Golos Text'", color: '#D9D8D2' }}>
                    {l}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 40,
            paddingTop: 20,
            borderTop: '0.5px solid rgba(245,244,240,.12)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            font: "500 12px 'JetBrains Mono'",
            color: '#6B6F7B',
          }}
        >
          <span>© 2026 NOVABID. Бүх эрх хуулиар хамгаалагдсан.</span>
          <span>Улаанбаатар, Монгол</span>
        </div>
      </div>
    </footer>
  )
}
