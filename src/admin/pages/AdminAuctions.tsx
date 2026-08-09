import { useState } from 'react'
import { api } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'

const STATUS: Record<string, { label: string; color: 'green' | 'amber' | 'gray' }> = {
  live: { label: 'ИДЭВХТЭЙ', color: 'green' },
  scheduled: { label: 'ТӨЛӨВЛӨСӨН', color: 'amber' },
  closed: { label: 'ХААГДСАН', color: 'gray' },
}

const filters: { id: string; label: string }[] = [
  { id: 'all', label: 'Бүгд' },
  { id: 'live', label: 'Идэвхтэй' },
  { id: 'scheduled', label: 'Төлөвлөсөн' },
  { id: 'closed', label: 'Хаагдсан' },
]

export function AdminAuctions() {
  const [filter, setFilter] = useState<string>('all')
  const { data, loading, error } = useAdminData(api.adminAuctions)
  const auctions = data?.auctions ?? []
  const rows = filter === 'all' ? auctions : auctions.filter((a) => a.status === filter)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Аукцион удирдлага</h1>
          <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
            {loading ? 'Ачаалж байна…' : error ? error : `Нийт ${auctions.length} лот`}
          </p>
        </div>
        <button className="nb-btn nb-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Шинэ лот нэмэх
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {filters.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                font: "600 12px 'JetBrains Mono'",
                background: active ? 'var(--nb-ink)' : 'var(--nb-surface)',
                color: active ? 'var(--nb-bg)' : 'var(--nb-ink-2)',
                border: active ? 'none' : '0.5px solid var(--nb-line)',
                borderRadius: 8,
                padding: '8px 14px',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="nb-card nb-table-wrap">
        <table className="nb-table">
          <thead>
            <tr>
              <th>Лот</th>
              <th>Бараа</th>
              <th>Одоогийн үнэ</th>
              <th>Bid</th>
              <th>Шат</th>
              <th>Төлөв</th>
              <th>Ялагч</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.lot}>
                <td style={{ font: "700 11px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{a.lot}</td>
                <td style={{ fontWeight: 600 }}>{a.title}</td>
                <td className="nb-tnum" style={{ font: "700 13px 'JetBrains Mono'" }}>{a.price}</td>
                <td className="nb-tnum">{a.bids}</td>
                <td className="nb-tnum" style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{a.stage}</td>
                <td>
                  <Pill
                    label={(STATUS[a.status] ?? { label: a.status }).label}
                    color={(STATUS[a.status] ?? { color: 'gray' as const }).color}
                  />
                </td>
                <td style={{ color: a.winner ? 'var(--nb-ink)' : 'var(--nb-ink-3)' }}>
                  {a.winner ?? '—'}
                </td>
                <td>
                  <button
                    style={{
                      font: "600 12px 'Golos Text'",
                      color: 'var(--nb-blue)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                    }}
                  >
                    Засах
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
