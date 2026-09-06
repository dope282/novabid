import { useState } from 'react'
import { api, ApiError, type CreditPack } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'
import { formatTugrik } from '../../lib/format'

/** Хоосон мөр — шинэ багц нэмэхэд */
const BLANK = { credits: '', priceMnt: '' }
/** "Шинээр нэмэх" үйлдлийн зохиомол id */
const NEW = -1

export function AdminPacks() {
  const { data, loading, error, refetch } = useAdminData(api.adminPacks)
  const packs = data?.packs ?? []

  // busyId: тухайн мөрийн id, шинээр нэмэх үед NEW
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [draft, setDraft] = useState(BLANK)

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

  /** Тоон талбарыг дарж засах */
  async function edit(p: CreditPack, field: 'credits' | 'priceMnt') {
    const label = field === 'credits' ? 'Кредитийн тоо' : 'Үнэ (₮)'
    const raw = window.prompt(`${label}:`, String(p[field]))
    if (raw === null) return
    const next = Number(raw)
    if (!Number.isInteger(next) || next < 1) {
      setActionError(`${label}: 1-ээс дээш бүхэл тоо байна`)
      return
    }
    await run(p.id, () => api.adminUpdatePack(p.id, { [field]: next }))
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    const credits = Number(draft.credits)
    const priceMnt = Number(draft.priceMnt)
    if (!Number.isInteger(credits) || credits < 1 || !Number.isInteger(priceMnt) || priceMnt < 1) {
      setActionError('Кредит болон үнэ 1-ээс дээш бүхэл тоо байна')
      return
    }
    await run(NEW, async () => {
      await api.adminCreatePack({ credits, priceMnt })
      setDraft(BLANK)
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Кредит багц</h1>
        <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
          {loading ? 'Ачаалж байна…' : error ? error : `${packs.length} багц · Хэтэвч хуудсанд эндээс харагдана`}
        </p>
      </div>

      {actionError && (
        <div style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      <div className="nb-card nb-table-wrap" style={{ marginBottom: 16 }}>
        <table className="nb-table">
          <thead>
            <tr>
              <th>Кредит</th>
              <th>Үнэ</th>
              <th>Нэгж үнэ</th>
              <th>Зарагдсан</th>
              <th>Төлөв</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {packs.map((p) => (
              <tr key={p.id} style={{ opacity: p.status === 'hidden' ? 0.55 : 1 }}>
                <td>
                  <Editable value={String(p.credits)} onClick={() => void edit(p, 'credits')} disabled={busyId === p.id} />
                </td>
                <td>
                  <Editable value={formatTugrik(p.priceMnt)} onClick={() => void edit(p, 'priceMnt')} disabled={busyId === p.id} />
                </td>
                <td className="nb-tnum" style={{ color: 'var(--nb-ink-2)' }}>
                  {formatTugrik(p.perCredit)}
                </td>
                <td className="nb-tnum">{p.sold ?? 0}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Pill label={p.status === 'active' ? 'ИДЭВХТЭЙ' : 'НУУСАН'} color={p.status === 'active' ? 'green' : 'gray'} />
                    {p.best && <Pill label="АШИГТАЙ" color="blue" />}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 12, whiteSpace: 'nowrap' }}>
                    <Act
                      disabled={busyId === p.id || p.best}
                      onClick={() => void run(p.id, () => api.adminUpdatePack(p.id, { best: true }))}
                    >
                      Ашигтай болгох
                    </Act>
                    <Act
                      color="var(--nb-amber)"
                      disabled={busyId === p.id}
                      onClick={() =>
                        void run(p.id, () =>
                          api.adminUpdatePack(p.id, { status: p.status === 'active' ? 'hidden' : 'active' }),
                        )
                      }
                    >
                      {p.status === 'active' ? 'Нуух' : 'Гаргах'}
                    </Act>
                    {!p.sold && (
                      <Act
                        color="var(--nb-red)"
                        disabled={busyId === p.id}
                        onClick={() => void run(p.id, () => api.adminDeletePack(p.id), 'Энэ багцыг устгах уу?')}
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
        {!loading && !packs.length && (
          <div style={{ padding: '32px 0', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
            Багц алга — доороос нэмнэ үү
          </div>
        )}
      </div>

      <form onSubmit={create} className="nb-card" style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ font: "600 10px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-2)', marginBottom: 5 }}>
            КРЕДИТ
          </div>
          <input
            style={input}
            type="number"
            min={1}
            value={draft.credits}
            onChange={(e) => setDraft((d) => ({ ...d, credits: e.target.value }))}
            required
          />
        </label>
        <label style={{ flex: '1 1 140px', minWidth: 0 }}>
          <div style={{ font: "600 10px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-2)', marginBottom: 5 }}>
            ҮНЭ (₮)
          </div>
          <input
            style={input}
            type="number"
            min={1}
            value={draft.priceMnt}
            onChange={(e) => setDraft((d) => ({ ...d, priceMnt: e.target.value }))}
            required
          />
        </label>
        <button
          type="submit"
          className="nb-btn nb-btn-primary"
          disabled={busyId === NEW}
          style={{ padding: '11px 18px', opacity: busyId === NEW ? 0.6 : 1 }}
        >
          {busyId === NEW ? 'Нэмж байна…' : 'Багц нэмэх'}
        </button>
      </form>
    </div>
  )
}

function Editable({ value, onClick, disabled }: { value: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title="Дарж засах"
      className="nb-tnum"
      style={{
        font: "700 13px 'JetBrains Mono'",
        color: 'var(--nb-ink)',
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

const input: React.CSSProperties = {
  width: '100%',
  font: "500 13.5px 'Golos Text'",
  color: 'var(--nb-ink)',
  background: 'var(--nb-surface)',
  border: '0.5px solid var(--nb-line)',
  borderRadius: 8,
  padding: '10px 12px',
  boxSizing: 'border-box',
}
