import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageShell } from '../components/PageShell'
import { ImageSlot } from '../components/ImageSlot'
import { StageLadder } from '../components/StageLadder'
import { FirstBidModal } from '../components/FirstBidModal'
import { useLiveAuction } from '../hooks/useLiveAuction'
import { useUser } from '../user'
import { formatCountdown, formatTugrik, pad2, stageLabel } from '../lib/format'
import { imageSrc } from '../lib/api'

const FIRST_BID_KEY = 'novabid-first-bid-ack'

/** Timestamp → "14:05" (хуваарьт) */
function clockOf(ms: number | null): string {
  if (!ms) return '—'
  const d = new Date(ms)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** Timestamp → "Xс өмнө" */
function ago(at: number): string {
  const s = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (s < 3) return 'ЯГ ОДОО'
  if (s < 60) return `${s}С ӨМНӨ`
  return `${Math.floor(s / 60)}М ӨМНӨ`
}

export function AuctionDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, isAuthed, refresh } = useUser()
  const live = useLiveAuction(id)

  const [modalOpen, setModalOpen] = useState(false)
  const [pendingInc, setPendingInc] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const lot = live.lot
  const credits = user?.credits ?? 0
  const locked = !live.gating.canBid
  const noCredits = isAuthed && credits <= 0
  const rejoinCost = (!live.gating.canBid && live.gating.rejoinCost) || 5

  async function doBid(inc: number) {
    setActionError(null)
    const res = await live.placeBid(inc)
    if (res.ok) void refresh()
    else setActionError(res.error ?? 'Bid амжилтгүй')
  }

  function handleBid(inc: number) {
    setActionError(null)
    if (!isAuthed) {
      navigate('/login')
      return
    }
    if (locked || noCredits) return
    if (!localStorage.getItem(FIRST_BID_KEY)) {
      setPendingInc(inc)
      setModalOpen(true)
      return
    }
    void doBid(inc)
  }

  function confirmFirstBid() {
    localStorage.setItem(FIRST_BID_KEY, '1')
    setModalOpen(false)
    if (pendingInc != null) void doBid(pendingInc)
    setPendingInc(null)
  }

  async function handleRejoin() {
    setActionError(null)
    if (!isAuthed) {
      navigate('/login')
      return
    }
    const res = await live.rejoin()
    if (res.ok) void refresh()
    else setActionError(res.error ?? 'Оролцох амжилтгүй')
  }

  if (live.loading) {
    return (
      <PageShell>
        <div className="nb-container" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--nb-ink-2)' }}>
          Ачаалж байна…
        </div>
      </PageShell>
    )
  }

  if (!lot) {
    return (
      <PageShell>
        <div className="nb-container" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ font: "800 24px 'Golos Text'" }}>{live.error ?? 'Лот олдсонгүй'}</div>
          <button onClick={() => navigate('/')} className="nb-btn nb-btn-primary" style={{ marginTop: 20 }}>
            Нүүр рүү буцах
          </button>
        </div>
      </PageShell>
    )
  }

  // Сэргэх цонхны үлдэгдэл — bid ирэх бүрд 100% болж дүүрнэ
  const timePct = Math.min(100, (live.seconds / live.roundResetSec) * 100).toFixed(1)
  /** Ноорог лот (админ л хардаг) — timer ажиллаагүй, bid хийх боломжгүй */
  const notStarted = lot.status === 'scheduled'

  return (
    <PageShell>
      <div className="nb-container" style={{ padding: '28px 24px 56px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: "600 13px 'Golos Text'", color: 'var(--nb-ink-2)', marginBottom: 20 }}>
          <Link to="/" style={{ color: 'var(--nb-ink-2)' }}>
            Аукцион
          </Link>
          <span>/</span>
          <span style={{ font: "700 12px 'JetBrains Mono'", color: 'var(--nb-ink)' }}>{lot.code}</span>
        </div>

        <div className="nb-detail">
          {/* ---- Бараа: зураг, нэр, тайлбар ---- */}
          <div className="nb-detail-media">
            <div style={{ borderRadius: 20, overflow: 'hidden', border: '0.5px solid var(--nb-line)', background: 'var(--nb-surface)' }}>
              <ImageSlot label={lot.title} src={imageSrc(lot.image)} height={420} eager />
            </div>

            <h1 style={{ font: "800 30px/1.2 'Golos Text'", letterSpacing: '-.01em', margin: '28px 0 0' }}>
              {lot.subtitle ?? lot.title}
            </h1>
            <p style={{ font: "400 15px/1.65 'Golos Text'", color: 'var(--nb-ink-2)', marginTop: 12, whiteSpace: 'pre-line' }}>
              {lot.description?.trim() ||
                'Албан ёсны баталгаат бараа. Ялсан тохиолдолд эцсийн үнээр (таны сүүлийн bid) худалдан авна. Хүргэлт УБ хотод 1–3 хоног, орон нутагт 3–7 хоног.'}
            </p>
          </div>

          {/* ---- Явц, хуваарь, сүүлийн bid-үүд ----
               Гар утсанд timer-ийн ДАРАА байрлана (CSS grid-area) */}
          <div className="nb-detail-info">
            {/* Stage ladder */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span className="nb-eyebrow">Round-ын явц</span>
                <span style={{ font: "700 12px 'JetBrains Mono'", color: 'var(--nb-ink)' }}>
                  {pad2(lot.currentStage)} / {pad2(lot.totalStages)}
                </span>
              </div>
              <StageLadder current={lot.currentStage} total={lot.totalStages} urgent={live.urgent} />
            </div>

            {/* Round хуваарь — хэзээ эхлээд хэзээ дуусах */}
            {!!live.schedule.length && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span className="nb-eyebrow">Round-ын хуваарь</span>
                  <span style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-3)' }}>
                    BID БОСГО ХҮРВЭЛ ЭРТ ШИЛЖИНЭ
                  </span>
                </div>
                <div
                  style={{
                    background: 'var(--nb-surface)',
                    border: '0.5px solid var(--nb-line)',
                    borderRadius: 12,
                    padding: '4px 14px',
                  }}
                >
                  {live.schedule.map((s) => {
                    const cur = s.round === lot.currentStage
                    return (
                      <div
                        key={s.round}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '9px 0',
                          borderBottom: s.round < lot.totalStages ? '0.5px solid var(--nb-line-soft)' : 'none',
                          opacity: s.done ? 0.45 : 1,
                        }}
                      >
                        <span style={{ font: "700 11px 'JetBrains Mono'", color: cur ? 'var(--nb-amber)' : 'var(--nb-ink-2)' }}>
                          ROUND {pad2(s.round)}
                          {cur && ' · ЯВАГДАЖ БУЙ'}
                        </span>
                        <span className="nb-tnum" style={{ font: "600 11.5px 'JetBrains Mono'", color: cur ? 'var(--nb-ink)' : 'var(--nb-ink-2)' }}>
                          {s.done ? 'ДУУССАН' : `${clockOf(s.startsAt)} – ${clockOf(s.endsAt)}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent bids */}
            <div style={{ marginTop: 32 }}>
              <div className="nb-eyebrow" style={{ marginBottom: 10 }}>
                Сүүлийн bid-үүд
              </div>
              <div style={{ background: 'var(--nb-surface)', border: '0.5px solid var(--nb-line)', borderRadius: 14, padding: '4px 16px' }}>
                {live.feed.length === 0 && (
                  <div style={{ padding: '16px 0', font: "500 13px 'Golos Text'", color: 'var(--nb-ink-2)', textAlign: 'center' }}>
                    Одоохондоо bid алга — эхнийх нь бологтун!
                  </div>
                )}
                {live.feed.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < live.feed.length - 1 ? '0.5px solid var(--nb-line-soft)' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: f.color, color: '#fff', display: 'grid', placeItems: 'center', font: "800 12px 'Rubik', sans-serif", flex: 'none' }}>
                      {(f.user[0] ?? '?').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "600 14px 'Golos Text'" }}>{f.user}</div>
                      <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-2)' }}>{ago(f.at)}</div>
                    </div>
                    <span style={{ font: "700 11px 'JetBrains Mono'", color: 'var(--nb-blue)', background: 'rgba(51,70,230,.08)', padding: '4px 8px', borderRadius: 6 }}>
                      +{f.inc}₮
                    </span>
                    <span style={{ font: "700 13px 'JetBrains Mono'" }}>{formatTugrik(f.priceAfter)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---- Right: live bid panel ---- */}
          <aside className="nb-detail-sidebar">
            <div style={{ background: '#0E1014', backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 1px,transparent 1px 4px)', borderRadius: 20, padding: '22px 22px 24px', color: '#F5F4F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ font: "700 8.5px 'JetBrains Mono'", letterSpacing: '.14em', color: '#9BA1AE' }}>ОДООГИЙН ҮНЭ</div>
                  <div className="nb-tnum" style={{ font: "800 30px 'Rubik', sans-serif", letterSpacing: '-.01em', marginTop: 4 }}>
                    {formatTugrik(lot.price)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: live.closed ? 'rgba(155,161,174,.12)' : 'rgba(61,220,132,.12)', border: `0.5px solid ${live.closed ? 'rgba(155,161,174,.35)' : 'rgba(61,220,132,.35)'}`, borderRadius: 7, padding: '5px 9px' }}>
                  {!live.closed && !notStarted && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DDC84', animation: 'nb-live-dot 1.4s infinite' }} />}
                  <span style={{ font: "700 9.5px 'JetBrains Mono'", letterSpacing: '.1em', color: live.closed ? '#9BA1AE' : notStarted ? '#E8930C' : '#3DDC84' }}>
                    {live.closed ? 'ХААГДСАН' : notStarted ? 'НООРОГ' : 'LIVE'}
                  </span>
                </div>
              </div>

              {/* Countdown */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, margin: '22px 0 4px' }}>
                <span className="nb-tnum nb-countdown" style={{ letterSpacing: '-.02em', color: live.urgent && !live.closed ? '#FF6B6B' : '#F5F4F0', lineHeight: 1, borderRadius: 16, animation: live.pulse ? 'nb-soft-pulse .85s ease-out' : 'none' }}>
                  {formatCountdown(live.seconds)}
                </span>
                <span style={{ font: "700 13px 'JetBrains Mono'", color: '#9BA1AE' }}>
                  {live.seconds < 60 ? 'СЕК' : ''}
                </span>
              </div>
              <div style={{ textAlign: 'center', font: "700 9.5px 'JetBrains Mono'", letterSpacing: '.12em', color: '#9BA1AE', marginBottom: 14 }}>
                {stageLabel(lot.currentStage, lot.totalStages)} ·{' '}
                {lot.roundBidsRequired === null
                  ? `${lot.roundBids} BID`
                  : `${lot.roundBids}/${lot.roundBidsRequired} BID`}
                {!live.closed && ' · ТЭГЛЭВЭЛ СҮҮЛИЙН BID ЯЛНА'}
              </div>

              <div style={{ height: 4, background: 'rgba(245,244,240,.12)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${timePct}%`, height: 4, background: live.urgent ? '#E5484D' : '#3346E6', borderRadius: 2 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                <span style={{ font: "500 9px 'JetBrains Mono'", color: '#6B6F7B' }}>
                  <span style={{ color: live.connected ? '#3DDC84' : '#E8930C' }}>●</span>{' '}
                  {live.connected ? 'СЕРВЕР SYNC' : 'ДАХИН ХОЛБОГДОЖ БАЙНА'}
                </span>
                <span style={{ font: "500 9px 'JetBrains Mono'", color: '#6B6F7B' }}>{lot.bidCount} BID</span>
              </div>

              {/* Bid buttons / states */}
              {notStarted ? (
                /* Ноорог лот — зөвхөн админ харна. Bid товч гаргавал төөрөгдүүлнэ. */
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <div style={{ font: "600 13px 'Golos Text'", color: '#E8930C', marginBottom: 6 }}>
                    Аукцион хараахан эхлээгүй.
                  </div>
                  <div style={{ font: "500 11.5px 'JetBrains Mono'", color: '#9BA1AE' }}>
                    {lot.startsAt
                      ? `ЭХЛЭХ: ${new Date(lot.startsAt).toLocaleString('en-CA', { hour12: false }).slice(0, 16)}`
                      : 'АДМИН ГАРААР ИДЭВХЖҮҮЛНЭ'}
                  </div>
                </div>
              ) : live.closed ? (
                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <div style={{ font: "600 13px 'Golos Text'", color: '#9BA1AE', marginBottom: 12 }}>Энэ аукцион хаагдсан.</div>
                  <Link to="/" className="nb-btn nb-btn-primary" style={{ display: 'block', padding: '13px 0' }}>
                    Бусад лот үзэх
                  </Link>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 20, opacity: locked || noCredits ? 0.45 : 1 }}>
                    {[1, 2, 3].map((inc) => (
                      <button
                        key={inc}
                        onClick={() => handleBid(inc)}
                        disabled={locked || noCredits}
                        style={{ background: 'var(--nb-blue)', color: '#fff', border: 'none', borderRadius: 10, padding: '14px 0 12px', boxShadow: locked || noCredits ? 'none' : '0 2px 0 var(--nb-blue-shadow)', cursor: locked || noCredits ? 'not-allowed' : 'pointer' }}
                      >
                        <div style={{ font: "700 19px 'Rubik', sans-serif" }}>+{inc}₮</div>
                        <div style={{ font: "600 8.5px 'JetBrains Mono'", letterSpacing: '.08em', opacity: 0.75, marginTop: 3 }}>
                          {locked ? 'ТҮГЖИГДСЭН' : '1 КРЕДИТ'}
                        </div>
                      </button>
                    ))}
                  </div>

                  {actionError && (
                    <div style={{ marginTop: 10, font: "500 11.5px/1.4 'Golos Text'", color: '#FF6B6B', background: 'rgba(229,72,77,.1)', borderRadius: 8, padding: '9px 11px' }}>
                      {actionError}
                    </div>
                  )}

                  {!isAuthed ? (
                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                      <button onClick={() => navigate('/login')} className="nb-btn nb-btn-primary" style={{ width: '100%', padding: '13px 0' }}>
                        Bid хийхийн тулд нэвтэрнэ үү
                      </button>
                    </div>
                  ) : locked ? (
                    <div style={{ marginTop: 12, background: 'rgba(229,72,77,.1)', border: '0.5px solid rgba(229,72,77,.4)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ font: "700 12px/1.4 'Golos Text'", color: '#FF6B6B' }}>
                        Та {live.gating.canBid ? '' : (live.gating.lockedAtStage ?? lot.currentStage - 1)}-р шатанд оролцоогүй байна.
                      </div>
                      <div style={{ font: "400 11px/1.5 'Golos Text'", color: '#9BA1AE', marginTop: 5 }}>
                        Энэ шатанд орохын тулд {rejoinCost} кредит төлнө. Дараа нь bid үргэлжлүүлнэ.
                      </div>
                      <button onClick={handleRejoin} className="nb-btn nb-btn-primary" style={{ width: '100%', marginTop: 12, padding: '12px 0' }}>
                        {rejoinCost} кредит төлж энэ шатанд орох
                      </button>
                    </div>
                  ) : noCredits ? (
                    <div style={{ marginTop: 12, background: 'rgba(232,147,12,.12)', border: '0.5px solid rgba(232,147,12,.4)', borderRadius: 12, padding: '12px 14px' }}>
                      <div style={{ font: "700 12.5px 'Golos Text'", color: '#E8930C' }}>Кредит дууссан</div>
                      <div style={{ font: "400 11px/1.45 'Golos Text'", color: '#9BA1AE', marginTop: 3 }}>Bid хийхийн тулд кредит дүүргэнэ үү.</div>
                      <button onClick={() => navigate('/wallet')} className="nb-btn nb-btn-primary" style={{ width: '100%', marginTop: 12, padding: '13px 0' }}>
                        Кредит дүүргэх
                      </button>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', font: "500 10.5px/1.5 'Golos Text'", color: '#9BA1AE', marginTop: 10 }}>
                      1 bid = 1 кредит · буцаагдахгүй
                      <br />
                      зарцуулсан кредит бүр = 1 Token · үлдэгдэл {credits}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Trust row */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {[
                { t: 'Баталгаат', s: 'Албан ёсны' },
                { t: 'Хүргэлт', s: '1–7 хоног' },
                { t: 'QPay', s: 'Хамгаалалттай' },
              ].map((x) => (
                <div key={x.t} style={{ flex: 1, background: 'var(--nb-surface)', border: '0.5px solid var(--nb-line)', borderRadius: 12, padding: '10px 12px' }}>
                  <div style={{ font: "700 12px 'Golos Text'" }}>{x.t}</div>
                  <div style={{ font: "500 10px 'JetBrains Mono'", color: 'var(--nb-ink-2)', marginTop: 2 }}>{x.s}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {modalOpen && (
        <FirstBidModal
          onConfirm={confirmFirstBid}
          onClose={() => {
            setModalOpen(false)
            setPendingInc(null)
          }}
        />
      )}
    </PageShell>
  )
}
