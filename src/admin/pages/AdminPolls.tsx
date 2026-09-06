import { useEffect, useState } from 'react'
import { api, ApiError, type ApiPoll, type PollInput } from '../../lib/api'
import { useAdminData } from '../useAdminData'
import { Pill } from '../Pill'

const STATUS: Record<string, { label: string; color: 'green' | 'amber' | 'gray' }> = {
  open: { label: 'НЭЭЛТТЭЙ', color: 'green' },
  draft: { label: 'НООРОГ', color: 'amber' },
  closed: { label: 'ХААГДСАН', color: 'gray' },
}

/** Формд засварлаж буй нэр дэвшигч — `id` байхгүй бол шинэ */
interface DraftCandidate {
  id?: number
  title: string
  tag: string
  baseVotes: string
}

export function AdminPolls() {
  const { data, loading, error, refetch } = useAdminData(api.adminPolls)
  const polls = data?.polls ?? []

  const [editing, setEditing] = useState<ApiPoll | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Сонгосон санал хураалт өөрчлөгдвөл формыг дахин дүүргэнэ
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [maxPicks, setMaxPicks] = useState('1')
  const [closesInMin, setClosesInMin] = useState('1080')
  const [cands, setCands] = useState<DraftCandidate[]>([])

  useEffect(() => {
    if (!editing) return
    setTitle(editing.title)
    setSubtitle(editing.subtitle ?? '')
    setMaxPicks(String(editing.maxPicks))
    setClosesInMin(
      String(editing.closesAt ? Math.max(1, Math.round((editing.closesAt - Date.now()) / 60_000)) : 1080),
    )
    setCands(
      editing.candidates.map((c) => ({
        id: c.id,
        title: c.title,
        tag: c.tag ?? '',
        baseVotes: String(c.baseVotes),
      })),
    )
  }, [editing])

  async function run(fn: () => Promise<unknown>) {
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

  async function save(status: ApiPoll['status']) {
    if (!editing) return
    const body: PollInput = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      maxPicks: Number(maxPicks),
      closesInMin: Number(closesInMin),
      status,
      candidates: cands.map((c) => ({
        id: c.id,
        title: c.title.trim(),
        tag: c.tag.trim(),
        baseVotes: Number(c.baseVotes) || 0,
      })),
    }
    await run(async () => {
      const { poll } = await api.adminSavePoll(editing.id, body)
      setEditing(poll)
    })
  }

  function setCand(i: number, patch: Partial<DraftCandidate>) {
    setCands((prev) => prev.map((c, x) => (x === i ? { ...c, ...patch } : c)))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ font: "800 26px 'Golos Text'", letterSpacing: '-.01em', margin: '0 0 4px' }}>Санал хураалт</h1>
          <p style={{ font: "400 14px 'Golos Text'", color: 'var(--nb-ink-2)', margin: 0 }}>
            {loading ? 'Ачаалж байна…' : error ? error : `Нийт ${polls.length} санал хураалт · нэг зэрэг нэг нь л нээлттэй байна`}
          </p>
        </div>
        <button
          className="nb-btn nb-btn-primary"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const { poll } = await api.adminCreatePoll({})
              setEditing(poll)
            })
          }
        >
          Шинэ санал хураалт
        </button>
      </div>

      {actionError && (
        <div style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {actionError}
        </div>
      )}

      <div className="nb-polls-grid" style={{ gap: 20, alignItems: 'start' }}>
        {/* Жагсаалт */}
        <div className="nb-card" style={{ padding: 8 }}>
          {!loading && !polls.length && (
            <div style={{ padding: '28px 12px', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
              Санал хураалт алга
            </div>
          )}
          {polls.map((p) => (
            <button
              key={p.id}
              onClick={() => setEditing(p)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: editing?.id === p.id ? 'var(--nb-fill)' : 'transparent',
                border: 'none',
                borderRadius: 10,
                padding: '11px 12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Pill label={(STATUS[p.status] ?? { label: p.status }).label} color={(STATUS[p.status] ?? { color: 'gray' as const }).color} />
                <span className="nb-tnum" style={{ font: "600 10px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>
                  {p.totalVotes} санал
                </span>
              </div>
              <div style={{ font: "600 13px 'Golos Text'", color: 'var(--nb-ink)' }}>{p.title}</div>
              <div style={{ font: "500 11px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 2 }}>
                {p.candidates.length} нэр дэвшигч
              </div>
            </button>
          ))}
        </div>

        {/* Засвар */}
        {editing ? (
          <div className="nb-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Field label="Гарчиг">
                <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </Field>
              <Field label="Тайлбар" hint="Заавал биш">
                <textarea style={{ ...input, minHeight: 64, resize: 'vertical' }} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={400} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Сонголтын тоо" hint="хэрэглэгч бүр">
                  <input style={input} type="number" min={1} max={20} value={maxPicks} onChange={(e) => setMaxPicks(e.target.value)} />
                </Field>
                <Field label="Хаагдах хүртэл (мин)" hint="одооноос">
                  <input style={input} type="number" min={1} value={closesInMin} onChange={(e) => setClosesInMin(e.target.value)} />
                </Field>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-2)' }}>
                    НЭР ДЭВШИГЧИД
                  </span>
                  <button
                    type="button"
                    onClick={() => setCands((p) => [...p, { title: '', tag: '', baseVotes: '0' }])}
                    style={{ font: "600 12px 'Golos Text'", color: 'var(--nb-blue)', background: 'none', border: 'none', padding: 0 }}
                  >
                    + Нэмэх
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cands.map((c, i) => {
                    const real = editing.candidates.find((x) => x.id === c.id)
                    const realVotes = real ? real.votes - real.baseVotes : 0
                    return (
                      <div key={c.id ?? `new-${i}`} className="nb-cand-row" style={{ gap: 8, alignItems: 'center' }}>
                        <input style={{ ...input, flex: 2 }} placeholder="Барааны нэр" value={c.title} onChange={(e) => setCand(i, { title: e.target.value })} maxLength={200} />
                        <input style={{ ...input, flex: 1 }} placeholder="Ангилал" value={c.tag} onChange={(e) => setCand(i, { tag: e.target.value })} maxLength={60} />
                        <input style={{ ...input, width: 84 }} type="number" min={0} title="Суурь санал" value={c.baseVotes} onChange={(e) => setCand(i, { baseVotes: e.target.value })} />
                        <span className="nb-tnum" title="Хэрэглэгчдийн өгсөн бодит санал" style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--nb-ink-3)', width: 40, textAlign: 'right' }}>
                          +{realVotes}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCands((p) => p.filter((_, x) => x !== i))}
                          style={{ font: "600 12px 'Golos Text'", color: 'var(--nb-red)', background: 'none', border: 'none', padding: '0 2px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>
                <div style={{ font: "500 10.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 8 }}>
                  Тоон талбар = суурь санал (админ тавина) · +N = хэрэглэгчдийн бодит санал
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                <button className="nb-btn nb-btn-ghost" disabled={busy} onClick={() => void save('draft')} style={{ flex: 1, minWidth: 120 }}>
                  Ноорогт хадгалах
                </button>
                <button className="nb-btn nb-btn-primary" disabled={busy} onClick={() => void save('open')} style={{ flex: 2, minWidth: 160 }}>
                  Хадгалж нээх
                </button>
                {editing.status === 'open' && (
                  <button className="nb-btn nb-btn-ghost" disabled={busy} onClick={() => void save('closed')} style={{ flex: 1, minWidth: 120 }}>
                    Хаах
                  </button>
                )}
                <button
                  className="nb-btn nb-btn-ghost"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm('Энэ санал хураалтыг бүх саналын хамт устгах уу?')) return
                    void run(async () => {
                      await api.adminDeletePoll(editing.id)
                      setEditing(null)
                    })
                  }}
                  style={{ color: 'var(--nb-red)' }}
                >
                  Устгах
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="nb-card" style={{ padding: '48px 20px', textAlign: 'center', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-3)' }}>
            Зүүн талаас сонгох эсвэл шинээр үүсгэнэ үү
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-2)', marginBottom: 6 }}>
        {label.toUpperCase()}
        {hint && <span style={{ color: 'var(--nb-ink-3)', letterSpacing: 0 }}> · {hint}</span>}
      </div>
      {children}
    </label>
  )
}

const input: React.CSSProperties = {
  width: '100%',
  font: "500 13.5px 'Golos Text'",
  color: 'var(--nb-ink)',
  background: 'var(--nb-surface)',
  border: '0.5px solid var(--nb-line)',
  borderRadius: 8,
  padding: '9px 11px',
  boxSizing: 'border-box',
}
