import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError, WS_URL, type ApiLot, type Gating } from '../lib/api'

export interface FeedItem {
  user: string
  inc: number
  priceAfter: number
  at: number
}

interface LiveState {
  lot: ApiLot | null
  gating: Gating
  feed: FeedItem[]
  loading: boolean
  error: string | null
  /** Сервертэй харьцуулсан цагийн зөрүү (serverNow - clientNow) */
  offset: number
  /** Одоогийн countdown секунд */
  seconds: number
  pulse: boolean
  closed: boolean
}

/** Лотыг сервер + WebSocket-оор live хөтлөх */
export function useLiveAuction(lotId: string) {
  const [state, setState] = useState<LiveState>({
    lot: null,
    gating: { canBid: true },
    feed: [],
    loading: true,
    error: null,
    offset: 0,
    seconds: 0,
    pulse: false,
    closed: false,
  })
  const pulseTimer = useRef<ReturnType<typeof setTimeout>>()

  // Анхны ачаалалт
  const load = useCallback(async () => {
    try {
      const { lot, gating, bids, serverNow } = await api.lot(lotId)
      setState((s) => ({
        ...s,
        lot,
        gating,
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

  // WebSocket — энэ лотын bid/хаалтыг сонсоно
  useEffect(() => {
    const ws = new WebSocket(WS_URL)
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data as string)
      if (msg.serverNow) setState((s) => ({ ...s, offset: msg.serverNow - Date.now() }))
      if (String(msg.lotId) !== String(lotId)) return

      if (msg.type === 'bid') {
        setState((s) => {
          if (!s.lot) return s
          const feed: FeedItem[] = [
            { user: msg.bid.user, inc: msg.bid.inc, priceAfter: msg.price, at: msg.serverNow },
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
      } else if (msg.type === 'lot_closed') {
        setState((s) => ({ ...s, closed: true, lot: s.lot ? { ...s.lot, status: 'closed' } : s.lot }))
      }
    }
    return () => {
      ws.close()
      clearTimeout(pulseTimer.current)
    }
  }, [lotId])

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
        await api.bid(lotId, inc)
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
    urgent: t < 5,
    softClose: state.lot?.softCloseSec ?? 15,
    placeBid,
    rejoin,
    reload: load,
  }
}
