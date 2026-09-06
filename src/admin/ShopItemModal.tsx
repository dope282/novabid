import { useRef, useState, type ReactNode } from 'react'
import { api, ApiError, imageSrc, type ShopItem, type ShopItemInput } from '../lib/api'

/** Дэлгүүрийн бараа үүсгэх / засах. `item` өгвөл засварын горим. */
export function ShopItemModal({
  item,
  onSaved,
  onClose,
}: {
  item?: ShopItem
  onSaved: () => void
  onClose: () => void
}) {
  const editing = !!item

  const [title, setTitle] = useState(item?.title ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [tokens, setTokens] = useState(String(item?.tokens ?? 100))
  const [description, setDescription] = useState(item?.description ?? '')
  // Хоосон = хязгааргүй нөөц
  const [stock, setStock] = useState(item?.stock === null || item === undefined ? '' : String(item.stock))
  const [status, setStatus] = useState<'active' | 'hidden'>(item?.status ?? 'active')

  const [imageUrl, setImageUrl] = useState(item?.image ?? '')
  const [preview, setPreview] = useState<string | null>(imageSrc(item?.image))
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body: ShopItemInput = {
        title: title.trim(),
        category: category.trim(),
        tokens: Number(tokens),
        description: description.trim(),
        imageUrl,
        stock: stock.trim() === '' ? '' : Number(stock),
        status,
      }
      if (editing) await api.adminUpdateShopItem(item.id, body)
      else await api.adminCreateShopItem(body)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Хадгалж чадсангүй')
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={overlay}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} style={sheet}>
        <div style={eyebrow}>{editing ? 'БАРАА ЗАСАХ' : 'ШИНЭ БАРАА'}</div>
        <div style={{ font: "800 22px/1.25 'Golos Text'", letterSpacing: '-.01em', marginBottom: 18 }}>
          {editing ? item.title : 'Дэлгүүрт бараа нэмэх'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Барааны нэр">
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Ангилал" hint="ж: Техник">
              <input style={input} value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} />
            </Field>
            <Field label="Үнэ (Token)">
              <input style={input} type="number" min={1} value={tokens} onChange={(e) => setTokens(e.target.value)} required />
            </Field>
          </div>

          <Field label="Нөөц" hint="хоосон = хязгааргүй">
            <input style={input} type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="∞" />
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
                  <span style={{ font: "600 11px 'JetBrains Mono'", color: 'var(--nb-blue)' }}>БАЙРШУУЛЖ БАЙНА…</span>
                )}
                {preview && !uploading && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('')
                      setPreview(null)
                    }}
                    style={{ font: "600 12px 'Golos Text'", color: 'var(--nb-red)', background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
                  >
                    Зургийг авах
                  </button>
                )}
              </div>
            </div>
          </Field>

          <Field label="Тайлбар" hint="Заавал биш">
            <textarea
              style={{ ...input, minHeight: 72, resize: 'vertical', font: "500 13.5px/1.55 'Golos Text'" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </Field>

          <Field label="Төлөв" hint="Нуусан бараа дэлгүүрт харагдахгүй">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['active', 'hidden'] as const).map((s) => (
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
                  {s === 'active' ? 'ИДЭВХТЭЙ' : 'НУУСАН'}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {error && (
          <div style={{ marginTop: 16, font: "500 12.5px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '10px 12px', borderRadius: 8 }}>
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
            {saving ? 'Хадгалж байна…' : editing ? 'Хадгалах' : 'Бараа нэмэх'}
          </button>
        </div>
      </form>
    </div>
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
