import { useRef, useState, type ReactNode } from 'react'
import { api, ApiError, imageSrc, type AdminAuction, type LotInput } from '../lib/api'

/** Лот үүсгэх / засах форм. `lot` өгвөл засварын горим. */
export function LotFormModal({
  lot,
  onSaved,
  onClose,
}: {
  lot?: AdminAuction
  onSaved: () => void
  onClose: () => void
}) {
  const editing = !!lot

  const [code, setCode] = useState(lot?.lot ?? '')
  const [title, setTitle] = useState(lot?.title ?? '')
  const [subtitle, setSubtitle] = useState(lot?.subtitle ?? '')
  const [description, setDescription] = useState(lot?.description ?? '')
  const [startPrice, setStartPrice] = useState('1')

  // Зураг: серверт хадгалагдсан зам + шинээр сонгосон файлын түр preview
  const [imageUrl, setImageUrl] = useState(lot?.image ?? '')
  const [preview, setPreview] = useState<string | null>(imageSrc(lot?.image))
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'scheduled' | 'live'>(
    lot?.status === 'live' ? 'live' : 'scheduled',
  )

  /** datetime-local input-д тохирох формат (локал цагаар) */
  const toLocalInput = (ms: number | null | undefined) => {
    if (!ms) return ''
    const d = new Date(ms - new Date().getTimezoneOffset() * 60_000)
    return d.toISOString().slice(0, 16)
  }
  const [startsAt, setStartsAt] = useState(toLocalInput(lot?.startsAt))

  // Round бүрийн тохиргоо. Round дуусна: хугацаа дуусах ЭСВЭЛ bid босго хүрэх.
  // Үргэлжлэх хугацаа МИНУТААР, сэргэх цонх СЕКУНДЭЭР
  type DraftRound = { durationMin: string; resetSec: string; bidsRequired: string }
  const [rounds, setRounds] = useState<DraftRound[]>(
    lot?.rounds?.length
      ? lot.rounds.map((r) => ({
          durationMin: String(r.durationMin),
          resetSec: String(r.resetSec),
          bidsRequired: r.bidsRequired === null ? '' : String(r.bidsRequired),
        }))
      : [
          ...Array.from({ length: 10 }, () => ({
            durationMin: '30',
            resetSec: '30',
            bidsRequired: '15',
          })),
          // Сүүлийн Round — bid босгогүй: зөвхөн хугацаагаар дуусна
          { durationMin: '30', resetSec: '30', bidsRequired: '' },
        ],
  )

  function setRound(i: number, patch: Partial<DraftRound>) {
    setRounds((prev) => prev.map((r, x) => (x === i ? { ...r, ...patch } : r)))
  }

  /** Эхний Round-ын утгыг бүгдэд нь хэрэглэнэ */
  function applyToAll(field: keyof DraftRound) {
    setRounds((prev) => prev.map((r) => ({ ...r, [field]: prev[0][field] })))
  }

  /** Хуваарийн урьдчилсан тооцоо — эхлэх цагаас Round бүрийн цагийг гаргана */
  const schedulePreview = (() => {
    const base = startsAt ? new Date(startsAt).getTime() : Date.now()
    let cursor = base
    return rounds.map((r, i) => {
      const start = cursor
      cursor += (Number(r.durationMin) || 0) * 60_000
      return { round: i + 1, start, end: cursor }
    })
  })()

  const hhmm = (ms: number) => {
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getHours())}:${p(d.getMinutes())}`
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Файл сонгомогц шууд байршуулж, буцаж ирсэн замыг хадгална */
  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const { url } = await api.adminUploadImage(file)
      setImageUrl(url)
      setPreview(imageSrc(url))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Зураг байршуулж чадсангүй')
    } finally {
      setUploading(false)
      // Ижил файлыг дахин сонгоход change асаахын тулд утгыг цэвэрлэнэ
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function clearImage() {
    setImageUrl('')
    setPreview(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body: LotInput = {
        code: code.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        imageUrl,
        startsAt: startsAt ? new Date(startsAt).getTime() : '',
        rounds: rounds.map((r) => ({
          durationMin: Number(r.durationMin),
          resetSec: Number(r.resetSec),
          // Хоосон = хязгааргүй
          bidsRequired: r.bidsRequired.trim() === '' ? '' : Number(r.bidsRequired),
        })),
      }
      if (editing) {
        // Хаагдсан лотын төлвийг эндээс өөрчлөхгүй — /close тусдаа үйлдэл
        if (lot.status !== 'closed') body.status = status
        await api.adminUpdateLot(lot.id, body)
      } else {
        await api.adminCreateLot({ ...body, startPrice: Number(startPrice), status })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Хадгалж чадсангүй')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={sheet}>
        <div style={eyebrow}>{editing ? `ЗАСВАР · ${lot.lot}` : 'ШИНЭ ЛОТ'}</div>
        <div style={{ font: "800 22px/1.25 'Golos Text'", letterSpacing: '-.01em', marginBottom: 18 }}>
          {editing ? 'Лот засах' : 'Шинэ лот нэмэх'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Лотын код" hint="Давхардахгүй, ж: LOT 046">
            <input style={input} value={code} onChange={(e) => setCode(e.target.value)} required maxLength={40} />
          </Field>
          <Field label="Гарчиг">
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </Field>
          <Field label="Дэлгэрэнгүй нэр" hint="Заавал биш">
            <input style={input} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={200} />
          </Field>

          <Field label="Зураг" hint="JPG · PNG · WebP · GIF, 5MB хүртэл">
            <div className="nb-image-row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  flex: 'none',
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '0.5px solid var(--nb-line)',
                  background: preview
                    ? 'var(--nb-surface)'
                    : 'repeating-linear-gradient(135deg, var(--nb-fill) 0 10px, var(--nb-line-soft) 10px 20px)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {preview ? (
                  <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>ЗУРАГГҮЙ</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
                {/* Native file input нарийн дэлгэцэд багасдаггүй тул нууж, өөрийн товчоор дуудна */}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={pickImage}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="nb-btn nb-btn-ghost"
                  style={{ padding: '9px 14px', fontSize: 13, alignSelf: 'flex-start' }}
                >
                  {preview ? 'Зураг солих' : 'Зураг сонгох'}
                </button>
                {uploading && (
                  <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--nb-blue)' }}>
                    БАЙРШУУЛЖ БАЙНА…
                  </span>
                )}
                {preview && !uploading && (
                  <button
                    type="button"
                    onClick={clearImage}
                    style={{ font: "600 12px 'Golos Text'", color: 'var(--nb-red)', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                  >
                    Зургийг авах
                  </button>
                )}
              </div>
            </div>
          </Field>

          <Field label="Дэлгэрэнгүй тайлбар" hint="Лотын хуудсанд харагдана">
            <textarea
              style={{ ...input, minHeight: 88, resize: 'vertical', font: "500 13.5px/1.55 'Golos Text'" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              placeholder="Барааны онцлог, баталгаа, хүргэлтийн нөхцөл…"
            />
          </Field>

          {!editing && (
            <Field label="Эхлэх үнэ (₮)">
              <input style={input} type="number" min={1} value={startPrice} onChange={(e) => setStartPrice(e.target.value)} required />
            </Field>
          )}

          {/* Round тохиргоо */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ font: "600 11px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-2)' }}>
                ROUND ({rounds.length})
              </span>
              <div style={{ display: 'flex', gap: 10 }}>
                <MiniBtn onClick={() => setRounds((p) => [...p, { ...p[p.length - 1] }])}>+ Round</MiniBtn>
                {rounds.length > 1 && (
                  <MiniBtn color="var(--nb-red)" onClick={() => setRounds((p) => p.slice(0, -1))}>
                    − Round
                  </MiniBtn>
                )}
              </div>
            </div>
            <div style={{ font: "500 10.5px/1.6 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginBottom: 8 }}>
              <b style={{ color: 'var(--nb-amber)' }}>СЭРГЭХ (секунд)</b> — timer дээр гүйх
              хугацаа. Bid бүрд эхнээсээ эхэлнэ.{' '}
              <b style={{ color: 'var(--nb-ink-2)' }}>Тэглэвэл аукцион дуусаж, сүүлд bid хийсэн
              хүн ялна.</b>
              <br />
              <b style={{ color: 'var(--nb-ink-2)' }}>BID БОСГО</b> давбал дараагийн Round эхэлж
              timer шинээр эхэлнэ. Хоосон = хязгааргүй.
              <br />
              <b style={{ color: 'var(--nb-ink-2)' }}>ҮРГЭЛЖЛЭХ (минут)</b> — зөвхөн хуваарь
              тооцоолоход. Аукционы явцад нөлөөлөхгүй.
            </div>

            {/* Багануудын гарчиг — нарийн дэлгэцэд нуугдаж, мөр бүр талбарынхаа шошготой болно */}
            <div className="nb-round-head" style={{ gap: 8, marginBottom: 6, font: "600 9.5px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-3)' }}>
              <span style={{ width: 30 }}>№</span>
              <span style={{ flex: 1 }}>ҮРГЭЛЖЛЭХ (МИН)</span>
              <span style={{ flex: 1 }}>СЭРГЭХ (СЕК)</span>
              <span style={{ flex: 1 }}>BID БОСГО</span>
              <span style={{ width: 96 }}>ТОВЛОСОН ЦАГ</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
              {rounds.map((r, i) => (
                <div key={i} className="nb-round-row" style={{ gap: 8, alignItems: 'center' }}>
                  <span className="nb-tnum nb-round-no" style={{ width: 30, font: "700 12px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <RoundCell label="ҮРГЭЛЖЛЭХ (МИН)">
                    <input
                      style={{ ...input, padding: '8px 10px' }}
                      type="number"
                      min={1}
                      value={r.durationMin}
                      onChange={(e) => setRound(i, { durationMin: e.target.value })}
                      required
                    />
                  </RoundCell>
                  <RoundCell label="СЭРГЭХ (СЕК)">
                    <input
                      style={{ ...input, padding: '8px 10px' }}
                      type="number"
                      min={1}
                      value={r.resetSec}
                      onChange={(e) => setRound(i, { resetSec: e.target.value })}
                      required
                    />
                  </RoundCell>
                  <RoundCell label="BID БОСГО">
                    <input
                      style={{ ...input, padding: '8px 10px' }}
                      type="number"
                      min={1}
                      placeholder="∞"
                      value={r.bidsRequired}
                      onChange={(e) => setRound(i, { bidsRequired: e.target.value })}
                    />
                  </RoundCell>
                  {/* Товлосон цаг — эхлэх цаг + өмнөх Round-уудын үргэлжлэх хугацаа */}
                  <span className="nb-tnum nb-round-time" style={{ width: 96, font: "600 10.5px 'JetBrains Mono'", color: 'var(--nb-ink-2)', textAlign: 'right' }}>
                    {hhmm(schedulePreview[i].start)}–{hhmm(schedulePreview[i].end)}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
              <MiniBtn onClick={() => applyToAll('durationMin')}>үргэлжлэхийг бүгдэд</MiniBtn>
              <MiniBtn onClick={() => applyToAll('resetSec')}>сэргэхийг бүгдэд</MiniBtn>
              <MiniBtn onClick={() => applyToAll('bidsRequired')}>bid босгыг бүгдэд</MiniBtn>
            </div>
            {editing && (
              <div style={{ font: "500 10.5px/1.5 'JetBrains Mono'", color: 'var(--nb-amber)', marginTop: 8 }}>
                Хадгалахад одоогийн Round-ын таймер шинэ хугацаагаар дахин эхэлнэ.
              </div>
            )}
          </div>

          {(!editing || lot.status !== 'closed') && (
            <Field label="Эхлэх цаг" hint="Хоосон = гараар идэвхжүүлнэ">
              <input
                style={input}
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <div style={{ font: "500 10.5px/1.5 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 6 }}>
                Ноорог лот энэ цагт автоматаар нээгдэж Round 1 эхэлнэ.
              </div>
            </Field>
          )}

          {(!editing || lot.status !== 'closed') && (
            <Field label="Төлөв" hint="Ноорог нь сайтад харагдахгүй — гараар идэвхжүүлнэ">
              <div style={{ display: 'flex', gap: 8 }}>
                {(['scheduled', 'live'] as const).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      flex: 1,
                      font: "600 12px 'JetBrains Mono'",
                      padding: '9px 0',
                      borderRadius: 8,
                      background: status === s ? 'var(--nb-ink)' : 'var(--nb-surface)',
                      color: status === s ? 'var(--nb-bg)' : 'var(--nb-ink-2)',
                      border: status === s ? 'none' : '0.5px solid var(--nb-line)',
                    }}
                  >
                    {s === 'live' ? 'ИДЭВХТЭЙ' : 'НООРОГ'}
                  </button>
                ))}
              </div>
            </Field>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              font: "500 12.5px 'Golos Text'",
              color: 'var(--nb-red)',
              background: 'rgba(229,72,77,.1)',
              padding: '10px 12px',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onClose} className="nb-btn nb-btn-ghost" style={{ flex: 1, padding: '13px 0' }}>
            Болих
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="nb-btn nb-btn-primary"
            style={{ flex: 2, padding: '13px 0', opacity: saving || uploading ? 0.6 : 1 }}
          >
            {saving ? 'Хадгалж байна…' : editing ? 'Хадгалах' : 'Лот үүсгэх'}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Round мөрийн нэг талбар. Өргөн дэлгэцэд шошго нь нуугдаж дээд гарчиг үйлчилнэ,
 * нарийн дэлгэцэд гарчиг алга болох тул шошго нь талбар бүрийн дээр гарна.
 */
function RoundCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="nb-round-cell" style={{ flex: 1, minWidth: 0, display: 'block' }}>
      <span className="nb-round-cell-label" style={{ font: "600 8.5px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-3)' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function MiniBtn({
  children,
  onClick,
  color = 'var(--nb-blue)',
}: {
  children: ReactNode
  onClick: () => void
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ font: "600 11px 'Golos Text'", color, background: 'none', border: 'none', padding: 0 }}
    >
      {children}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
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

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(14,16,20,.55)',
  display: 'grid',
  placeItems: 'center',
  padding: 20,
  overflowY: 'auto',
}

const sheet: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  background: 'var(--nb-bg)',
  borderRadius: 20,
  border: '0.5px solid var(--nb-line)',
  padding: '26px 24px 28px',
  boxShadow: '0 24px 60px rgba(0,0,0,.35)',
  margin: 'auto',
}

const eyebrow: React.CSSProperties = {
  font: "700 10px 'JetBrains Mono'",
  letterSpacing: '.14em',
  color: 'var(--nb-blue)',
  marginBottom: 8,
}

const input: React.CSSProperties = {
  width: '100%',
  font: "500 14px 'Golos Text'",
  color: 'var(--nb-ink)',
  background: 'var(--nb-surface)',
  border: '0.5px solid var(--nb-line)',
  borderRadius: 8,
  padding: '10px 12px',
  boxSizing: 'border-box',
}
