import { useNavigate } from 'react-router-dom'
import { imageSrc, type ClosedLot } from '../lib/api'
import { formatTugrik } from '../lib/format'
import { ImageSlot } from './ImageSlot'

/** "MM.DD" — хаагдсан огноо */
function shortDate(ms: number | null): string {
  if (!ms) return '—'
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/**
 * Дууссан аукционы карт. Countdown, bid товч байхгүй — эцсийн үнэ, ялагчийг харуулна.
 * Зургийг саарал болгож идэвхтэй лотуудаас нүдээр ялгана.
 */
export function ClosedLotCard({ lot }: { lot: ClosedLot }) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/lot/${lot.id}`)}
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
      }}
    >
      <div style={{ position: 'relative', height: 132, overflow: 'hidden' }}>
        <div style={{ filter: 'grayscale(1)', opacity: 0.6 }}>
          <ImageSlot height={132} label={lot.title} src={imageSrc(lot.image)} />
        </div>
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
            font: "700 9px 'JetBrains Mono'",
            letterSpacing: '.1em',
            color: '#fff',
            background: 'rgba(21,23,30,.72)',
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          ДУУССАН · {shortDate(lot.closedAt)}
        </div>
      </div>

      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ font: "600 13.5px/1.3 'Golos Text'", minHeight: 35 }}>{lot.title}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
          <div>
            <div style={{ font: "600 8.5px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--nb-ink-3)' }}>
              ЭЦСИЙН ҮНЭ
            </div>
            <div className="nb-tnum" style={{ font: "800 17px 'Rubik', sans-serif" }}>
              {formatTugrik(lot.finalPrice)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: "600 8.5px 'JetBrains Mono'", letterSpacing: '.1em', color: 'var(--nb-ink-3)' }}>
              ЯЛАГЧ
            </div>
            <div
              style={{
                font: "700 12px 'Golos Text'",
                color: lot.winner ? 'var(--nb-green)' : 'var(--nb-ink-3)',
                maxWidth: 110,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {lot.winner ?? 'Bid ороогүй'}
            </div>
          </div>
        </div>

        <div style={{ font: "500 9.5px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>
          {lot.bidCount} BID
        </div>
      </div>
    </button>
  )
}
