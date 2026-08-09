/** NovaBid API client — token хадгалалт + fetch wrapper */

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'
export const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000/ws'

const TOKEN_KEY = 'novabid-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Ерөнхий хүсэлт — амжилтгүй бол ApiError шиднэ */
export async function apiFetch<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth !== false) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(API_URL + path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? `Алдаа (${res.status})`)
  }
  return data as T
}

// --- Серверийн буцаадаг төрлүүд ---
export interface ApiUser {
  id: number
  email: string
  name: string
  verified: boolean
  credits: number
  tokens: number
  wins: number
  referralCode: string | null
  isAdmin: boolean
}

export type Gating =
  | { canBid: true }
  | { canBid: false; lockedAtStage?: number; rejoinCost?: number }

export interface ApiLot {
  id: number
  code: string
  title: string
  subtitle: string | null
  price: number
  status: 'scheduled' | 'live' | 'closed'
  currentStage: number
  totalStages: number
  softCloseSec: number
  endsAt: number | null
  bidCount: number
  winnerUserId: number | null
  gating?: Gating
}

export interface ApiBid {
  user: string
  inc: number
  priceAfter: number
  at: number
}

// --- Endpoint-ууд ---
export const api = {
  health: () => apiFetch<{ ok: boolean; serverNow: number }>('/api/health', { auth: false }),

  register: (body: { email: string; password: string; name?: string; referralCode?: string }) =>
    apiFetch<{ ok: boolean; userId: number; devVerifyCode?: string }>('/api/auth/register', {
      body,
      auth: false,
    }),
  verify: (body: { email: string; code: string }) =>
    apiFetch<{ ok: boolean; token: string; user: ApiUser }>('/api/auth/verify', {
      body,
      auth: false,
    }),
  login: (body: { email: string; password: string }) =>
    apiFetch<{ token: string; user: ApiUser }>('/api/auth/login', { body, auth: false }),
  me: () => apiFetch<{ user: ApiUser }>('/api/me'),

  lots: () => apiFetch<{ serverNow: number; lots: ApiLot[] }>('/api/lots'),
  lot: (id: number | string) =>
    apiFetch<{ serverNow: number; lot: ApiLot; gating: Gating; bids: ApiBid[] }>(`/api/lots/${id}`),
  bid: (id: number | string, inc: number) =>
    apiFetch<{ lot: ApiLot; credits: number }>(`/api/lots/${id}/bid`, { body: { inc } }),
  rejoin: (id: number | string) =>
    apiFetch<{ credits: number }>(`/api/lots/${id}/rejoin`, { body: {} }),

  packs: () =>
    apiFetch<{ packs: { id: string; credits: number; priceMnt: number }[] }>('/api/wallet/packs', {
      auth: false,
    }),
  topup: (packId: string) =>
    apiFetch<{ ok: boolean; user: ApiUser }>('/api/wallet/topup', { body: { packId } }),
  transactions: () =>
    apiFetch<{
      transactions: {
        id: number
        type: string
        credits: number
        tokens: number
        meta: string | null
        created_at: number
      }[]
    }>('/api/wallet/transactions'),

  // --- Admin ---
  adminOverview: () =>
    apiFetch<{
      metrics: { label: string; value: string; delta: string; positive: boolean; hint: string }[]
      bidsByDay: { day: string; bids: number }[]
      recentActivity: { text: string; time: string; kind: string }[]
    }>('/api/admin/overview'),
  adminAuctions: () =>
    apiFetch<{
      auctions: {
        id: number
        lot: string
        title: string
        price: string
        bids: number
        stage: string
        status: string
        winner?: string
      }[]
    }>('/api/admin/auctions'),
  adminUsers: () =>
    apiFetch<{
      users: {
        name: string
        email: string
        credits: number
        tokens: number
        wins: number
        verified: boolean
        joined: string
      }[]
    }>('/api/admin/users'),
  adminPayments: () =>
    apiFetch<{
      payments: {
        id: string
        user: string
        item: string
        method: string
        amount: string
        status: string
        date: string
      }[]
    }>('/api/admin/payments'),
}
