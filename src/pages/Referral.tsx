import { useState } from 'react'
import { PageShell } from '../components/PageShell'
import { PageHead } from '../components/PageHead'
import { referralStats, referrals } from '../data/economy'
import { useUser } from '../user'

export function Referral() {
  const { user } = useUser()
  const referralCode = user?.referralCode ?? 'BAT-24KH'
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(referralCode).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '40px 24px 64px', maxWidth: 760 }}>
        <PageHead
          eyebrow="Referral"
          title="Найзаа урих"
          subtitle="Урьсан хүн тань анхны кредитээ авмагц та 2 кредит авна. Хязгааргүй урьж болно."
        />

        {/* Invite code card */}
        <div
          style={{
            background: 'var(--nb-dark)',
            borderRadius: 18,
            padding: 24,
            color: '#F5F4F0',
            maxWidth: 460,
          }}
        >
          <div style={{ font: "700 8.5px 'JetBrains Mono'", letterSpacing: '.14em', color: '#9BA1AE', textAlign: 'center' }}>
            ТАНЫ УРИЛГЫН КОД
          </div>
          <div
            style={{
              font: "800 30px 'Rubik', sans-serif",
              letterSpacing: '.12em',
              textAlign: 'center',
              margin: '12px 0',
              padding: '16px 0',
              borderTop: '1px dashed rgba(245,244,240,.2)',
              borderBottom: '1px dashed rgba(245,244,240,.2)',
            }}
          >
            {referralCode}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={copy}
              className="nb-btn nb-btn-primary"
              style={{ flex: 1, padding: '12px 0' }}
            >
              {copied ? '✓ Хууллаа' : 'Хуулах'}
            </button>
            <button
              className="nb-btn"
              style={{
                flex: 1,
                padding: '12px 0',
                background: 'transparent',
                color: '#F5F4F0',
                border: '0.5px solid rgba(245,244,240,.25)',
              }}
            >
              Хуваалцах
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20, maxWidth: 460 }}>
          {referralStats.map((s) => (
            <div
              key={s.label}
              style={{
                background: 'var(--nb-surface)',
                border: '0.5px solid var(--nb-line)',
                borderRadius: 14,
                padding: '14px 16px',
              }}
            >
              <div className="nb-tnum" style={{ font: "800 22px 'Rubik', sans-serif", color: s.color }}>
                {s.value}
              </div>
              <div style={{ font: "600 9px 'JetBrains Mono'", letterSpacing: '.06em', color: 'var(--nb-ink-2)', marginTop: 4 }}>
                {s.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Referred people */}
        <div className="nb-eyebrow" style={{ margin: '28px 0 10px' }}>
          Урьсан хүмүүс
        </div>
        <div
          style={{
            background: 'var(--nb-surface)',
            border: '0.5px solid var(--nb-line)',
            borderRadius: 14,
            padding: '2px 16px',
            maxWidth: 560,
          }}
        >
          {referrals.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 0',
                borderBottom: i < referrals.length - 1 ? '0.5px solid var(--nb-line-soft)' : 'none',
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: 'rgba(51,70,230,.09)',
                  color: 'var(--nb-blue-ink)',
                  display: 'grid',
                  placeItems: 'center',
                  font: "800 14px 'Rubik', sans-serif",
                  flex: 'none',
                }}
              >
                {r.initial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "600 13.5px 'Golos Text'" }}>{r.name}</div>
                <div style={{ font: "500 9px 'JetBrains Mono'", color: 'var(--nb-ink-2)', marginTop: 2 }}>
                  {r.status}
                </div>
              </div>
              <span
                style={{
                  font: "700 11px 'JetBrains Mono'",
                  color: r.ok ? 'var(--nb-green)' : 'var(--nb-amber)',
                }}
              >
                {r.reward}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
