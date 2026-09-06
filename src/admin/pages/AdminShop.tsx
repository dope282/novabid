import { useState } from 'react'
import { api, ApiError, imageSrc, type AdminShopOrder, type ShopItem, type ShopOrder } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'
import { ShopItemModal } from '../ShopItemModal'

const ORDER_STATUS: Record<string, { label: string; color: 'green' | 'amber' | 'blue' | 'gray' | 'red' }> = {
  pending: { label: 'ХҮЛЭЭГДЭЖ БУЙ', color: 'amber' },
  shipped: { label: 'ИЛГЭЭСЭН', color: 'blue' },
  done: { label: 'ДУУССАН', color: 'green' },
  cancelled: { label: 'ЦУЦЛАГДСАН', color: 'red' },
}

const NEXT: { to: ShopOrder['status']; label: string }[] = [
  { to: 'shipped', label: 'Илгээсэн' },
  { to: 'done', label: 'Дууссан' },
  { to: 'cancelled', label: 'Цуцлах' },
]

export function AdminShop() {
  const [tab, setTab] = useState<'items' | 'orders'>('items')
  const items = useAdminData(api.adminShopItems)
  const orders = useAdminData(api.adminShopOrders)

  const [editing, setEditing] = useState<ShopItem | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>, refetch: () => Promise<void>) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      await refetch()
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Үйлдэл амжилтгүй')
    } finally {
      setBusy(false)
    }
  }

  const list = items.data?.items ?? []
  const orderList = orders.data?.orders ?? []
  const pending = orderList.filter((o) => o.status === 'pending').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Token дэлгүүр</h1>
          <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
            {items.loading ? 'Ачаалж байна…' : `${list.length} бараа · ${pending} шинэ захиалга`}
          </p>
        </div>
        {tab === 'items' && (
          <button className="nb-btn nb-btn-primary" onClick={() => setEditing(null)}>
            Шинэ бараа нэмэх
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['items', 'Бараа'], ['orders', `Захиалга${pending ? ` (${pending})` : ''}`]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              font: "600 12px 'JetBrains Mono'",
              background: tab === id ? 'var(--nb-ink)' : 'var(--nb-surface)',
              color: tab === id ? 'var(--nb-bg)' : 'var(--nb-ink-2)',
              border: tab === id ? 'none' : '0.5px solid var(--nb-line)',
              borderRadius: 8,
              padding: '8px 14px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <div style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      {tab === 'items' ? (
        <div className="nb-card nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th></th>
                <th>Бараа</th>
                <th>Ангилал</th>
                <th>Token</th>
                <th>Нөөц</th>
                <th>Солигдсон</th>
                <th>Төлөв</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td style={{ width: 52 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--nb-fill)' }}>
                      {i.image ? (
                        <img src={imageSrc(i.image)!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{i.title}</td>
                  <td style={{ color: 'var(--nb-ink-2)' }}>{i.category || '—'}</td>
                  <td className="nb-tnum" style={{ font: "700 13px 'JetBrains Mono'" }}>{i.tokens} T</td>
                  <td className="nb-tnum" style={{ color: i.soldOut ? 'var(--nb-red)' : 'var(--nb-ink)' }}>
                    {i.stock === null ? '∞' : i.stock}
                  </td>
                  <td className="nb-tnum">{i.redeemed ?? 0}</td>
                  <td>
                    <Pill label={i.status === 'active' ? 'ИДЭВХТЭЙ' : 'НУУСАН'} color={i.status === 'active' ? 'green' : 'gray'} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                      <Act onClick={() => setEditing(i)} disabled={busy}>Засах</Act>
                      <Act
                        color="var(--nb-amber)"
                        disabled={busy}
                        onClick={() =>
                          run(() => api.adminUpdateShopItem(i.id, { status: i.status === 'active' ? 'hidden' : 'active' }), items.refetch)
                        }
                      >
                        {i.status === 'active' ? 'Нуух' : 'Гаргах'}
                      </Act>
                      {!i.redeemed && (
                        <Act
                          color="var(--nb-red)"
                          disabled={busy}
                          onClick={() => {
                            if (!window.confirm(`"${i.title}"-г устгах уу?`)) return
                            void run(() => api.adminDeleteShopItem(i.id), items.refetch)
                          }}
                        >
                          Устгах
                        </Act>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.loading && !list.length && (
            <div style={{ padding: '32px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
              Бараа алга
            </div>
          )}
        </div>
      ) : (
        <div className="nb-card nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Хэрэглэгч</th>
                <th>Бараа</th>
                <th>Token</th>
                <th>Огноо</th>
                <th>Төлөв</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orderList.map((o: AdminShopOrder) => (
                <tr key={o.id}>
                  <td style={{ font: "700 11px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>#{o.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.user}</div>
                    <div style={{ font: "500 10.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>{o.email}</div>
                  </td>
                  <td>{o.title}</td>
                  <td className="nb-tnum" style={{ font: "700 13px 'JetBrains Mono'" }}>{o.tokens} T</td>
                  <td style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>
                    {new Date(o.createdAt).toLocaleDateString('en-CA')}
                  </td>
                  <td>
                    <Pill label={(ORDER_STATUS[o.status] ?? { label: o.status }).label} color={(ORDER_STATUS[o.status] ?? { color: 'gray' as const }).color} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                      {NEXT.filter((n) => n.to !== o.status).map((n) => (
                        <Act
                          key={n.to}
                          disabled={busy}
                          color={n.to === 'cancelled' ? 'var(--nb-red)' : 'var(--nb-blue)'}
                          onClick={() => {
                            if (n.to === 'cancelled' && !window.confirm(`#${o.id}-г цуцалж ${o.tokens} Token буцаах уу?`)) return
                            void run(() => api.adminUpdateShopOrder(o.id, n.to), async () => {
                              await orders.refetch()
                              await items.refetch()
                            })
                          }}
                        >
                          {n.label}
                        </Act>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.loading && !orderList.length && (
            <div style={{ padding: '32px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
              Захиалга алга
            </div>
          )}
        </div>
      )}

      {editing !== undefined && (
        <ShopItemModal
          item={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined)
            void items.refetch()
          }}
        />
      )}
    </div>
  )
}

function Act({
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
