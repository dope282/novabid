import { useState } from 'react'
import { api, ApiError, type AdminAuction } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'
import { LotFormModal } from '../LotFormModal'

const STATUS: Record<string, { label: string; color: 'green' | 'amber' | 'gray' }> = {
  live: { label: 'ИДЭВХТЭЙ', color: 'green' },
  scheduled: { label: 'НООРОГ', color: 'amber' },
  closed: { label: 'ХААГДСАН', color: 'gray' },
}

const filters: { id: string; label: string }[] = [
  { id: 'all', label: 'Бүгд' },
  { id: 'live', label: 'Идэвхтэй' },
  { id: 'scheduled', label: 'Ноорог' },
  { id: 'closed', label: 'Хаагдсан' },
]

export function AdminAuctions() {
  const [filter, setFilter] = useState<string>('all')
  const { data, loading, error, refetch } = useAdminData(api.adminAuctions)
  const auctions = data?.auctions ?? []
  const rows = filter === 'all' ? auctions : auctions.filter((a) => a.status === filter)

  // undefined = хаалттай, null = шинэ лот, AdminAuction = засвар
  const [editing, setEditing] = useState<AdminAuction | null | undefined>(undefined)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  /** Хаах/устгах зэрэг эргэж буцахгүй үйлдлийг баталгаажуулаад ажиллуулна */
  async function run(a: AdminAuction, confirmText: string, fn: () => Promise<unknown>) {
    if (!window.confirm(confirmText)) return
    setBusyId(a.id)
    setActionError(null)
    try {
      await fn()
      await refetch()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Үйлдэл амжилтгүй')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Аукцион удирдлага</h1>
          <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
            {loading ? 'Ачаалж байна…' : error ? error : `Нийт ${auctions.length} лот`}
          </p>
        </div>
        <button
          onClick={() => setEditing(null)}
          className="nb-btn nb-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Шинэ лот нэмэх
        </button>
      </div>

      {actionError && (
        <div
          style={{
            font: "500 13px 'Golos Text'",
            color: 'var(--nb-red)',
            background: 'rgba(229,72,77,.1)',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {actionError}
        </div>
      )}

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
              <tr key={a.id}>
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
                  <div style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                    <RowAction disabled={busyId === a.id} onClick={() => setEditing(a)}>
                      Засах
                    </RowAction>
                    {a.status === 'live' && (
                      <RowAction
                        color="var(--nb-amber)"
                        disabled={busyId === a.id}
                        onClick={() =>
                          run(
                            a,
                            `${a.lot}-г одоо хаах уу? Сүүлд bid хийсэн хүн ялагч болж, бусдад Token буцаана.`,
                            () => api.adminCloseLot(a.id),
                          )
                        }
                      >
                        Хаах
                      </RowAction>
                    )}
                    {a.bids === 0 && (
                      <RowAction
                        color="var(--nb-red)"
                        disabled={busyId === a.id}
                        onClick={() =>
                          run(a, `${a.lot}-г бүрмөсөн устгах уу?`, () => api.adminDeleteLot(a.id))
                        }
                      >
                        Устгах
                      </RowAction>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !rows.length && (
          <div style={{ padding: '32px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
            Лот алга
          </div>
        )}
      </div>

      {editing !== undefined && (
        <LotFormModal
          lot={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            void refetch()
          }}
        />
      )}
    </div>
  )
}

function RowAction({
  children,
  onClick,
  disabled,
  color = 'var(--nb-blue)',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        font: "600 12px 'Golos Text'",
        color,
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}
