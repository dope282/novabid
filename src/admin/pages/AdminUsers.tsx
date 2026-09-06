import { useState } from 'react'
import { api, ApiError, type AdminUser } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'

export function AdminUsers() {
  const [q, setQ] = useState('')
  const { data, loading, error, refetch } = useAdminData(api.adminUsers)
  const adminUsers = data?.users ?? []
  const rows = adminUsers.filter(
    (u) => u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()),
  )

  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function run(id: number, fn: () => Promise<unknown>, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return
    setBusyId(id)
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

  /** Кредит/Token-ыг гараар засах — өөрчлөлт нь гүйлгээгээр бүртгэгдэнэ */
  async function editBalance(u: AdminUser, field: 'credits' | 'tokens') {
    const label = field === 'credits' ? 'Кредит' : 'Token'
    const raw = window.prompt(`${u.name} — шинэ ${label} үлдэгдэл:`, String(u[field]))
    if (raw === null) return
    const next = Number(raw)
    if (!Number.isInteger(next) || next < 0) {
      setActionError(`${label}: 0-ээс дээш бүхэл тоо байна`)
      return
    }
    await run(u.id, () => api.adminUpdateUser(u.id, { [field]: next }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Хэрэглэгчид</h1>
          <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
            {loading ? 'Ачаалж байна…' : error ? error : `${rows.length} / ${adminUsers.length} хэрэглэгч`}
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Нэр эсвэл имэйлээр хайх…"
          style={{
            width: 260,
            maxWidth: '100%',
            background: 'var(--nb-surface)',
            border: '0.5px solid var(--nb-line)',
            borderRadius: 8,
            padding: '11px 14px',
            font: "500 13px 'Golos Text'",
            color: 'var(--nb-ink)',
            outline: 'none',
          }}
        />
      </div>

      {actionError && (
        <div style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      <div className="nb-card nb-table-wrap">
        <table className="nb-table">
          <thead>
            <tr>
              <th>Хэрэглэгч</th>
              <th>Имэйл</th>
              <th>Кредит</th>
              <th>Token</th>
              <th>Ялалт</th>
              <th>Bid</th>
              <th>Төлөв</th>
              <th>Элссэн</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.email} style={{ opacity: u.blocked ? 0.55 : 1 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: u.avatarColor,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        font: "800 12px 'Rubik', sans-serif",
                        flex: 'none',
                      }}
                    >
                      {u.name[0]}
                    </span>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    {u.isAdmin && <Pill label="АДМИН" color="blue" />}
                  </div>
                </td>
                <td style={{ color: 'var(--nb-ink-2)' }}>{u.email}</td>
                <td>
                  <BalanceCell value={u.credits} onClick={() => void editBalance(u, 'credits')} disabled={busyId === u.id} />
                </td>
                <td>
                  <BalanceCell value={u.tokens} color="var(--nb-green)" onClick={() => void editBalance(u, 'tokens')} disabled={busyId === u.id} />
                </td>
                <td className="nb-tnum">{u.wins}</td>
                <td className="nb-tnum" style={{ color: 'var(--nb-ink-2)' }}>{u.bids}</td>
                <td>
                  {u.blocked ? (
                    <Pill label="ХААГДСАН" color="red" />
                  ) : u.verified ? (
                    <Pill label="БАТАЛГААЖСАН" color="green" />
                  ) : (
                    <Pill label="ХҮЛЭЭГДЭЖ БУЙ" color="amber" />
                  )}
                </td>
                <td style={{ font: "600 12px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{u.joined}</td>
                <td>
                  <div style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                    <Act
                      color={u.blocked ? 'var(--nb-green)' : 'var(--nb-amber)'}
                      disabled={busyId === u.id}
                      onClick={() =>
                        void run(
                          u.id,
                          () => api.adminUpdateUser(u.id, { blocked: !u.blocked }),
                          u.blocked ? undefined : `${u.name}-ийн бүртгэлийг хаах уу? Нэвтэрч, bid хийж чадахгүй болно.`,
                        )
                      }
                    >
                      {u.blocked ? 'Нээх' : 'Хаах'}
                    </Act>
                    <Act
                      disabled={busyId === u.id}
                      onClick={() =>
                        void run(
                          u.id,
                          () => api.adminUpdateUser(u.id, { isAdmin: !u.isAdmin }),
                          u.isAdmin ? `${u.name}-ийн админ эрхийг хасах уу?` : `${u.name}-д админ эрх өгөх үү?`,
                        )
                      }
                    >
                      {u.isAdmin ? 'Эрх хасах' : 'Админ болгох'}
                    </Act>
                    {u.deletable && (
                      <Act
                        color="var(--nb-red)"
                        disabled={busyId === u.id}
                        onClick={() =>
                          void run(u.id, () => api.adminDeleteUser(u.id), `${u.name}-ийг бүрмөсөн устгах уу?`)
                        }
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
        {!loading && !rows.length && (
          <div style={{ padding: '32px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
            Хэрэглэгч олдсонгүй
          </div>
        )}
      </div>
    </div>
  )
}

/** Дарж засах боломжтой үлдэгдэл */
function BalanceCell({
  value,
  onClick,
  disabled,
  color = 'var(--nb-ink)',
}: {
  value: number
  onClick: () => void
  disabled?: boolean
  color?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Дарж засах"
      className="nb-tnum"
      style={{
        font: "700 13px 'JetBrains Mono'",
        color,
        background: 'none',
        border: 'none',
        borderBottom: '1px dashed var(--nb-line)',
        padding: '2px 0',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {value}
    </button>
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
