import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ApiLot } from '../lib/api'
import { formatClock, formatTugrik, stageLabel } from '../lib/format'
import { ImageSlot } from './ImageSlot'

/** Аукционы лотын карт (вэб grid) */
export function LotCard({ lot, serverOffset = 0 }: { lot: ApiLot; serverOffset?: number }) {
  const navigate = useNavigate()
  const [hover, setHover] = useState(false)

  const secondsLeft = lot.endsAt ? Math.max(0, (lot.endsAt - (Date.now() + serverOffset)) / 1000) : 0
  const urgent = lot.status === 'live' && secondsLeft < 15
  const pct = Math.round((lot.currentStage / lot.totalStages) * 100)
  const canBid = lot.gating?.canBid
  const scheduled = lot.status === 'scheduled'

  return (
    <button
      onClick={() => navigate(`/lot/${lot.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: 'var(--nb-surface)',
        border: '0.5px solid var(--nb-line)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        padding: 0,
        color: 'var(--nb-ink)',
        boxShadow: hover ? '0 12px 32px rgba(21,23,30,.12)' : '0 2px 0 var(--nb-line)',
        transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'transform .14s ease, box-shadow .14s ease',
      }}
    >
      <div style={{ position: 'relative', height: 168, overflow: 'hidden' }}>
        <ImageSlot height={168} label={lot.title} />
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            font: "700 9px 'JetBrains Mono'",
            letterSpacing: '.1em',
            color: 'var(--nb-ink-2)',
            background: 'color-mix(in srgb, var(--nb-surface) 85%, transparent)',
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          {lot.code}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            font: "700 11px 'JetBrains Mono'",
            background: scheduled ? 'var(--nb-amber)' : urgent ? 'var(--nb-red)' : 'var(--nb-ink)',
            color: scheduled || urgent ? '#fff' : 'var(--nb-bg)',
            padding: '4px 9px',
            borderRadius: 6,
          }}
        >
          {urgent && !scheduled && (
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'nb-live-dot 1.4s infinite' }} />
          )}
          {scheduled ? 'УДАХГҮЙ' : formatClock(secondsLeft)}
        </div>
      </div>

      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ font: "600 15px/1.3 'Golos Text'", minHeight: 40 }}>{lot.title}</div>

        <div>
          <div style={{ font: "700 8px 'JetBrains Mono'", letterSpacing: '.12em', color: 'var(--nb-ink-2)', marginBottom: 3 }}>
            ОДООГИЙН ҮНЭ
          </div>
          <div className="nb-tnum" style={{ font: "700 22px 'Rubik', sans-serif", letterSpacing: '-.01em' }}>
            {formatTugrik(lot.price)}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ font: "700 8px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--nb-ink-2)' }}>
              {stageLabel(lot.currentStage, lot.totalStages)}
            </span>
            <span style={{ font: "500 8px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>{lot.bidCount} BID</span>
          </div>
          <div style={{ height: 4, background: 'var(--nb-fill)', borderRadius: 2 }}>
            <div style={{ width: `${pct}%`, height: 4, background: urgent ? 'var(--nb-red)' : 'var(--nb-blue)', borderRadius: 2 }} />
          </div>
        </div>

        <div
          style={{
            font: "700 9px 'JetBrains Mono'",
            letterSpacing: '.06em',
            color: canBid ? 'var(--nb-blue-ink)' : 'var(--nb-ink-2)',
            background: canBid ? 'rgba(51,70,230,.12)' : 'var(--nb-fill)',
            borderRadius: 7,
            padding: '7px 9px',
            textAlign: 'center',
          }}
        >
          {canBid === undefined
            ? `${lot.bidCount} BID · ОРОЛЦ`
            : canBid
              ? '✓ ОРОЛЦОХ БОЛОМЖТОЙ'
              : `ТҮГЖЭЭТЭЙ · ${lot.gating && !lot.gating.canBid ? (lot.gating.rejoinCost ?? 5) : 5}КР`}
        </div>
      </div>
    </button>
  )
}
