import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, WS_URL, type ApiLot, type Gating, type RoundSlot } from '../lib/api'

export interface FeedItem {
  user: string
  /** Хэрэглэгчийн сонгосон дүрсний өнгө */
  color: string
  inc: number
  priceAfter: number
  at: number
}

interface LiveState {
  lot: ApiLot | null
  gating: Gating
  /** Round бүрийн товлосон эхлэх/дуусах цаг */
  schedule: RoundSlot[]
  feed: FeedItem[]
  loading: boolean
  error: string | null
  /** Сервертэй харьцуулсан цагийн зөрүү (serverNow - clientNow) */
  offset: number
  /** Одоогийн countdown секунд */
  seconds: number
  pulse: boolean
  closed: boolean
  /** WebSocket яг одоо холбогдсон эсэх (UI-д үнэн зөвөөр харуулна) */
  connected: boolean
}

/** Лотыг сервер + WebSocket-оор live хөтлөх */
export function useLiveAuction(lotId: string) {
  const [state, setState] = useState<LiveState>({
    lot: null,
    gating: { canBid: true },
    schedule: [],
    feed: [],
    loading: true,
    error: null,
    offset: 0,
    seconds: 0,
    pulse: false,
    closed: false,
    connected: false,
  })
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>()

  // Анхны ачаалалт
  const load = useCallback(async () => {
    try {
      const { lot, gating, bids, schedule, serverNow } = await api.lot(lotId)
      setState((s) => ({
        ...s,
        lot,
        gating,
        schedule,
        feed: bids,
        loading: false,
        error: null,
        offset: serverNow - Date.now(),
        closed: lot.status === 'closed',
      }))
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e instanceof ApiError ? e.message : 'Лот ачаалж чадсангүй' }))
    }
  }, [lotId])

  useEffect(() => {
    void load()
  }, [load])

  // WebSocket — энэ лотын bid/хаалтыг сонсоно. Тасарвал автоматаар дахин холбогдоно.
  useEffect(() => {
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    let disposed = false

    const onMessage = (ev: MessageEvent) => {
      const msg = JSON.parse(ev.data as string)
      if (msg.serverNow) setState((s) => ({ ...s, offset: msg.serverNow - Date.now() }))
      if (String(msg.lotId) !== String(lotId)) return

      if (msg.type === 'bid') {
        setState((s) => {
          if (!s.lot) return s
          const feed: FeedItem[] = [
            {
              user: msg.bid.user,
              color: msg.bid.color,
              inc: msg.bid.inc,
              priceAfter: msg.price,
              at: msg.serverNow,
            },
            ...s.feed,
          ].slice(0, 8)
          return {
            ...s,
            feed,
            pulse: true,
            lot: { ...s.lot, price: msg.price, endsAt: msg.endsAt, currentStage: msg.stage, bidCount: msg.bidCount },
          }
        })
        clearTimeout(pulseTimer.current)
        pulseTimer.current = setTimeout(() => setState((s) => ({ ...s, pulse: false })), 850)
      } else if (msg.type === 'round') {
        // Round солигдоход хуваарь дахин тооцоологдоно — серверээс шинэчилж авна
        void load()
        // Хариу ирэхээс өмнө таймерыг шууд зөв болгоно
        setState((s) => ({
          ...s,
          feed: s.feed,
          lot: s.lot
            ? {
                ...s.lot,
                currentStage: msg.stage,
                endsAt: msg.endsAt,
                roundResetSec: msg.roundResetSec,
                roundBids: 0,
                roundBidsRequired: msg.roundBidsRequired,
              }
            : s.lot,
        }))
      } else if (msg.type === 'lot_closed') {
        setState((s) => ({ ...s, closed: true, lot: s.lot ? { ...s.lot, status: 'closed' } : s.lot }))
      }
    }

    function connect() {
      ws = new WebSocket(WS_URL)
      ws.onmessage = onMessage
      ws.onopen = () => {
        // Салсан хугацаанд алдсан bid-үүдийг нөхөхийн тулд дахин ачаална
        if (attempts > 0) void load()
        attempts = 0
        setState((s) => ({ ...s, connected: true }))
      }
      ws.onerror = () => ws?.close()
      ws.onclose = () => {
        setState((s) => ({ ...s, connected: false }))
        if (disposed) return
        // 1с-ээс эхэлж 15с хүртэл backoff
        retry = setTimeout(connect, Math.min(15_000, 1000 * 2 ** attempts++))
      }
    }
    connect()

    return () => {
      disposed = true
      clearTimeout(retry)
      if (ws) ws.onclose = null // цэвэрлэх үед дахин холбогдохгүй
      ws?.close()
      clearTimeout(pulseTimer.current)
    }
  }, [lotId, load])

  // Локал countdown tick (сервер цагийн offset ашиглана)
  useEffect(() => {
    const iv = setInterval(() => {
      setState((s) => {
        if (!s.lot?.endsAt) return s
        const now = Date.now() + s.offset
        const seconds = Math.max(0, (s.lot.endsAt - now) / 1000)
        return { ...s, seconds }
      })
    }, 100)
    return () => clearInterval(iv)
  }, [])

  /** Bid хийх — амжилттай бол user-ийг refresh хийхийг дуудагч хариуцна */
  const placeBid = useCallback(
    async (inc: number): Promise<{ ok: boolean; error?: string }> => {
      try {
        const { lot } = await api.bid(lotId, inc)
        // Хариунд ирсэн төлвийг шууд тавина — WS тасарсан үед ч өөрийн bid харагдана
        // (WS ажиллаж байвал broadcast ижил утга авчирна).
        setState((s) => ({ ...s, lot: s.lot ? { ...s.lot, ...lot } : lot }))
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof ApiError ? e.message : 'Bid амжилтгүй' }
      }
    },
    [lotId],
  )

  /** Оролцоогүй шатанд 5 кредит төлж орох */
  const rejoin = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      await api.rejoin(lotId)
      setState((s) => ({ ...s, gating: { canBid: true } }))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof ApiError ? e.message : 'Оролцох амжилтгүй' }
    }
  }, [lotId])

  const t = state.seconds
  return {
    ...state,
    seconds: t,
    // Timer дуусах дөхөж байна — хэн ч bid хийхгүй бол аукцион хаагдана
    urgent: t < 10,
    /** Сэргэх цонх — timer болон progress bar-ын суурь */
    roundResetSec: state.lot?.roundResetSec ?? 30,
    placeBid,
    rejoin,
    reload: load,
  }
}
