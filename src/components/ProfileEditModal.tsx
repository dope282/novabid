import { useState } from 'react'
import { api, ApiError, type ApiUser } from '../lib/api'
import { ColorPicker } from './ColorPicker'

/** Нэр болон дүрсний өнгө засах modal */
export function ProfileEditModal({
  user,
  onSaved,
  onClose,
}: {
  user: ApiUser
  onSaved: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(user.name)
  const [color, setColor] = useState(user.avatarColor)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.updateMe({ name: name.trim(), avatarColor: color })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Хадгалж чадсангүй')
      setSaving(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(14,16,20,.55)',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--nb-bg)',
          borderRadius: 20,
          border: '0.5px solid var(--nb-line)',
          padding: '26px 24px 28px',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
        }}
      >
        <div style={{ font: "700 10px 'JetBrains Mono'", letterSpacing: '.14em', color: 'var(--nb-blue)', marginBottom: 8 }}>
          ПРОФАЙЛ
        </div>
        <div style={{ font: "800 22px/1.25 'Golos Text'", letterSpacing: '-.01em', marginBottom: 20 }}>
          Нэр болон өнгө
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <div style={{ font: "700 9px 'JetBrains Mono'", letterSpacing: '.12em', color: 'var(--nb-ink-2)', marginBottom: 6 }}>
            НЭР
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            style={{
              width: '100%',
              background: 'var(--nb-surface)',
              border: '0.5px solid var(--nb-line)',
              borderRadius: 8,
              padding: '13px 14px',
              font: "500 14px 'Golos Text'",
              color: 'var(--nb-ink)',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ font: "500 10.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)', marginTop: 5 }}>
            Bid хийхэд бусдад энэ нэр харагдана
          </div>
        </label>

        <div style={{ marginBottom: 8 }}>
          <div style={{ font: "700 9px 'JetBrains Mono'", letterSpacing: '.12em', color: 'var(--nb-ink-2)', marginBottom: 8 }}>
            ДҮРСНИЙ ӨНГӨ
          </div>
          <ColorPicker value={color} onChange={setColor} initial={name.trim()[0] || user.email[0]} />
        </div>

        {error && (
          <div style={{ marginTop: 14, font: "500 12.5px 'Golos Text'", color: 'var(--nb-red)', background: 'rgba(229,72,77,.1)', padding: '10px 12px', borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button type="button" onClick={onClose} className="nb-btn nb-btn-ghost" style={{ flex: 1, padding: '13px 0' }}>
            Болих
          </button>
          <button
            type="submit"
            disabled={saving}
            className="nb-btn nb-btn-primary"
            style={{ flex: 2, padding: '13px 0', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Хадгалж байна…' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </div>
  )
}
