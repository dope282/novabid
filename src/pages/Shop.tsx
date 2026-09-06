import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { PageHead } from '../components/PageHead'
import { ImageSlot } from '../components/ImageSlot'
import { TokenBadge } from '../components/Badges'
import { api, ApiError, imageSrc, type ShopItem } from '../lib/api'
import { useUser } from '../user'

export function Shop() {
  const navigate = useNavigate()
  const { tokens, isAuthed, refresh } = useUser()

  const [items, setItems] = useState<ShopItem[]>([])
  const [cat, setCat] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { items } = await api.shopItems()
      setItems(items)
      setError(null)
    } catch {
      setError('Дэлгүүр ачаалж чадсангүй. Сервер асаалттай юу?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Ангиллыг бараануудаас гаргана — админ дурын ангилал бичиж болно
  const categories = useMemo(() => {
    const seen = new Set(items.map((i) => i.category).filter(Boolean))
    return ['all', ...[...seen].sort()]
  }, [items])

  const shown = cat === 'all' ? items : items.filter((i) => i.category === cat)

  async function redeem(item: ShopItem) {
    if (!isAuthed) {
      navigate('/login')
      return
    }
    if (!window.confirm(`"${item.title}"-г ${item.tokens} Token-оор солих уу?`)) return
    setBusyId(item.id)
    setError(null)
    setDone(null)
    try {
      await api.shopRedeem(item.id)
      await refresh()
      await load()
      setDone(`"${item.title}" захиалагдлаа. Админ баталгаажуулсны дараа хүргэнэ.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Солиж чадсангүй')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '40px 24px 64px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
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

        {done && (
          <div style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-green)', background: 'rgba(31,165,94,.1)', padding: '11px 14px', borderRadius: 10, marginBottom: 16 }}>
            {done}
          </div>
        )}
        {error && (
          <div style={{ font: "500 13px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '11px 14px', borderRadius: 10, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* Category filters */}
        {categories.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {categories.map((c) => {
              const active = cat === c
              return (
                <button
                  key={c}
                  onClick={() => setCat(c)}
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
                  {(c === 'all' ? 'Бүгд' : c).toUpperCase()}
                </button>
              )
            })}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--nb-ink-2)' }}>Ачаалж байна…</div>
        ) : !shown.length ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--nb-ink-3)', font: "500 14px 'Golos Text'" }}>
            Одоогоор бараа алга. Удахгүй нэмэгдэнэ.
          </div>
        ) : (
          <div className="nb-grid">
            {shown.map((s) => {
              const affordable = tokens >= s.tokens
              const disabled = s.soldOut || busyId === s.id || (isAuthed && !affordable)
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
                  <div style={{ height: 150, margin: 8, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                    <ImageSlot height={150} label={s.title} src={imageSrc(s.image)} />
                    {s.soldOut && (
                      <span style={{ position: 'absolute', top: 8, left: 8, font: "700 9px 'JetBrains Mono'", letterSpacing: '.08em', color: '#fff', background: 'rgba(21,23,30,.75)', borderRadius: 6, padding: '4px 8px' }}>
                        ДУУССАН
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                    <div>
                      <div style={{ font: "600 14px/1.3 'Golos Text'", minHeight: 38 }}>{s.title}</div>
                      {s.stock !== null && !s.soldOut && (
                        <div style={{ font: "500 9.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 2 }}>
                          ҮЛДЭГДЭЛ {s.stock}
                        </div>
                      )}
                    </div>
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
                        onClick={() => void redeem(s)}
                        disabled={disabled}
                        className="nb-btn nb-btn-primary"
                        style={{
                          padding: '9px 16px',
                          fontSize: 13,
                          opacity: disabled ? 0.4 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {busyId === s.id
                          ? 'Түр хүлээнэ үү…'
                          : s.soldOut
                            ? 'Дууссан'
                            : !isAuthed
                              ? 'Нэвтрэх'
                              : affordable
                                ? 'Солих'
                                : 'Хүрэлцэхгүй'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </PageShell>
  )
}
