import { api } from '../../lib/api'
import { useAdminData } from '../useAdminData'

const KIND_COLOR: Record<string, string> = {
  win: 'var(--nb-blue)',
  pay: 'var(--nb-green)',
  user: 'var(--nb-amber)',
  close: 'var(--nb-red)',
}

export function AdminOverview() {
  const { data, loading, error } = useAdminData(api.adminOverview)
  const metrics = data?.metrics ?? []
  const bidsByDay = data?.bidsByDay ?? []
  const recentActivity = data?.recentActivity ?? []
  const maxBids = Math.max(1, ...bidsByDay.map((d) => d.bids))

  return (
    <div>
      <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Тойм</h1>
      <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: '0 0 24px' }}>
        {loading ? 'Ачаалж байна…' : error ? error : 'Платформын өнөөдрийн ерөнхий байдал'}
      </p>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {metrics.map((m) => (
          <div key={m.label} className="nb-card" style={{ padding: 18 }}>
            <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.04em', color: 'var(--nb-ink-2)' }}>
              {m.label.toUpperCase()}
            </div>
            <div className="nb-tnum" style={{ font: "800 28px 'Rubik', sans-serif", letterSpacing: '-.01em', margin: '8px 0 6px' }}>
              {m.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  font: "700 11px 'JetBrains Mono'",
                  color: m.positive ? 'var(--nb-green)' : 'var(--nb-red)',
                  background: m.positive ? 'rgba(31,165,94,.1)' : 'rgba(229,72,77,.1)',
                  padding: '2px 7px',
                  borderRadius: 6,
                }}
              >
                {m.delta}
              </span>
              <span style={{ font: "500 11px 'Golos Text'", color: 'var(--nb-ink-3)' }}>{m.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
          gap: 14,
          marginTop: 14,
        }}
        className="nb-two-col"
      >
        {/* Bid chart */}
        <div className="nb-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
            <div style={{ font: "700 14px 'Golos Text'" }}>7 хоногийн bid</div>
            <div style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>
              НИЙТ {bidsByDay.reduce((s, d) => s + d.bids, 0).toLocaleString('en-US')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180 }}>
            {bidsByDay.map((d) => {
              const h = Math.round((d.bids / maxBids) * 150)
              const peak = d.bids === maxBids
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div className="nb-tnum" style={{ font: "700 10px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>
                    {d.bids >= 1000 ? `${(d.bids / 1000).toFixed(1)}k` : d.bids}
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: h,
                      borderRadius: '6px 6px 3px 3px',
                      background: peak ? 'var(--nb-blue)' : 'rgba(51,70,230,.28)',
                    }}
                  />
                  <div style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>{d.day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="nb-card" style={{ padding: 20 }}>
          <div style={{ font: "700 14px 'Golos Text'", marginBottom: 14 }}>Сүүлийн үйл явдал</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentActivity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, padding: '9px 0', borderBottom: i < recentActivity.length - 1 ? '0.5px solid var(--nb-line-soft)' : 'none' }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: KIND_COLOR[a.kind],
                    marginTop: 5,
                    flex: 'none',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ font: "500 12.5px/1.4 'Golos Text'" }}>{a.text}</div>
                  <div style={{ font: "600 9px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 2 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
