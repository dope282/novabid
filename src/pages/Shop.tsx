import { useState } from 'react'
import { PageShell } from '../components/PageShell'
import { PageHead } from '../components/PageHead'
import { ImageSlot } from '../components/ImageSlot'
import { TokenBadge } from '../components/Badges'
import { shopCategories, shopItems, type ShopItem } from '../data/economy'
import { useUser } from '../user'

export function Shop() {
  const { tokens } = useUser()
  const [cat, setCat] = useState<ShopItem['category'] | 'all'>('all')
  const items = cat === 'all' ? shopItems : shopItems.filter((s) => s.category === cat)

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '40px 24px 64px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <PageHead
            eyebrow="Дэлгүүр"
            title="Token дэлгүүр"
            subtitle="Цуглуулсан Token-оороо бараа сольж авна. Хугацаагүй, шатахгүй."
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
            <span style={{ font: "500 12px 'Golos Text'", color: 'var(--nb-ink-2)' }}>Үлдэгдэл</span>
            <TokenBadge value={tokens} />
          </div>
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {shopCategories.map((c) => {
            const active = cat === c.id
            return (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                style={{
                  font: "600 12px 'JetBrains Mono'",
                  letterSpacing: '.06em',
                  background: active ? 'var(--nb-ink)' : 'var(--nb-surface)',
                  color: active ? 'var(--nb-bg)' : 'var(--nb-ink-2)',
                  border: active ? 'none' : '0.5px solid var(--nb-line)',
                  borderRadius: 8,
                  padding: '9px 16px',
                }}
              >
                {c.label.toUpperCase()}
              </button>
            )
          })}
        </div>

        {/* Grid */}
        <div className="nb-grid">
          {items.map((s) => {
            const affordable = tokens >= s.tokens
            return (
              <div
                key={s.id}
                style={{
                  background: 'var(--nb-surface)',
                  border: '0.5px solid var(--nb-line)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 2px 0 var(--nb-line)',
                }}
              >
                <div style={{ height: 150, margin: 8, borderRadius: 12, overflow: 'hidden' }}>
                  <ImageSlot height={150} label={s.title} />
                </div>
                <div style={{ padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div style={{ font: "600 14px/1.3 'Golos Text'", minHeight: 38 }}>{s.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 5,
                          background: 'var(--nb-green)',
                          color: '#fff',
                          font: "800 9px 'Rubik', sans-serif",
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        T
                      </span>
                      <span className="nb-tnum" style={{ font: "800 18px 'Rubik', sans-serif" }}>
                        {s.tokens}
                      </span>
                    </div>
                    <button
                      disabled={!affordable}
                      className="nb-btn nb-btn-primary"
                      style={{
                        padding: '9px 16px',
                        fontSize: 13,
                        opacity: affordable ? 1 : 0.4,
                        cursor: affordable ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {affordable ? 'Солих' : 'Хүрэлцэхгүй'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
