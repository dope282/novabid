/** NovaBid API client — token хадгалалт + fetch wrapper */

/**
 * Production-д сервер frontend-ээ өөрөө үйлчилдэг тул API нь ИЖИЛ origin дээр байна —
 * тиймээс хаяг хоосон (харьцангуй зам). Dev-д Vite :5173, API :4000 тул тусад нь заана.
 * `VITE_API_URL` өгвөл түүнийг давуу эрхтэйгээр авна (жишээ нь mobile апп).
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '')

/** WS хаягийг тухайн хуудасны protocol-оос гаргана — HTTPS дээр автоматаар wss:// */
export const WS_URL: string =
  import.meta.env.VITE_WS_URL ??
  (import.meta.env.DEV
    ? 'ws://localhost:4000/ws'
    : `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`)

const TOKEN_KEY = 'novabid-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t: string | null) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

/** Серверийн харьцангуй зургийн замыг бүтэн URL болгоно (зураг API дээр сууна) */
export function imageSrc(path: string | null | undefined): string | null {
  if (!path) return null
  return path.startsWith('/') ? API_URL + path : path
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
  /** Bid feed дэх дүрсний өнгө (палитраас) */
  avatarColor: string
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
  description: string | null
  /** "/uploads/<файл>" эсвэл null — харуулахдаа `imageSrc()` ашиглана */
  image: string | null
  price: number
  status: 'scheduled' | 'live' | 'closed'
  currentStage: number
  totalStages: number
  /** ОДООГИЙН Round дуусах хугацаа */
  endsAt: number | null
  /** Одоогийн Round-ын товлосон урт (progress bar-т) */
  roundDurationSec: number
  /** Bid ирэх бүрд сэргэх цонх — төгсгөлийн уралдаан */
  roundResetSec: number
  roundStartedAt: number | null
  /** Энэ Round-д хийгдсэн bid. Босго `null` бол хязгааргүй — зөвхөн хугацаагаар дуусна */
  roundBids: number
  roundBidsRequired: number | null
  /** Ноорог лот автоматаар live болох цаг */
  startsAt: number | null
  bidCount: number
  winnerUserId: number | null
  gating?: Gating
}

/** Кредит багц — админаас удирддаг */
export interface CreditPack {
  id: number
  credits: number
  priceMnt: number
  best: boolean
  status: 'active' | 'hidden'
  /** Нэг кредитийн үнэ (сервер бодож өгнө) */
  perCredit: number
  /** Зөвхөн админы жагсаалтад */
  sold?: number
}

/** Админы хэрэглэгчийн мөр */
export interface AdminUser {
  id: number
  name: string
  email: string
  credits: number
  tokens: number
  wins: number
  verified: boolean
  isAdmin: boolean
  blocked: boolean
  avatarColor: string
  bids: number
  joined: string
  /** Түүхгүй хэрэглэгчийг л устгана */
  deletable: boolean
}

/** Урилгын хуудасны өгөгдөл */
export interface ReferralInfo {
  code: string | null
  stats: { invited: number; earned: number; pending: number }
  referrals: { name: string; initial: string; rewarded: boolean; joinedAt: number }[]
}

/** Token хөдөлгөөний нэг мөр — шошгыг сервер бэлдэж өгнө */
export interface TokenEntry {
  id: number
  title: string
  /** "AUCTION ДУУССАН" | "ХУДАЛДАН АВАЛТ" | "БУЦААЛТ" | "ЗАХИАЛГА" */
  kind: string
  tokens: number
  positive: boolean
  createdAt: number
}

/** Хаагдсан лот — нүүр хуудасны "өмнөх дуудлага худалдаа" */
export interface ClosedLot {
  id: number
  code: string
  title: string
  image: string | null
  finalPrice: number
  bidCount: number
  winner: string | null
  closedAt: number | null
}

/** Нэг Round-ын тохиргоо (админ) */
export interface LotRound {
  round: number
  /** Round-ын товлосон урт (МИНУТ) */
  durationMin: number
  /** Bid ирэх бүрд сэргэх цонх (СЕКУНД) */
  resetSec: number
  /** null = хязгааргүй (зөвхөн хугацаагаар дуусна) */
  bidsRequired: number | null
}

/** Round бүрийн товлосон эхлэх/дуусах цаг */
export interface RoundSlot {
  round: number
  startsAt: number | null
  endsAt: number | null
  done: boolean
}

export interface ApiBid {
  user: string
  /** Хэрэглэгчийн сонгосон өнгө — байрлалаас хамаарахгүй */
  color: string
  inc: number
  priceAfter: number
  at: number
}

/** Админы хүснэгтийн мөр — харуулах (форматласан) + засварын (түүхий) талбарууд хамт */
export interface AdminAuction {
  id: number
  lot: string
  title: string
  price: string
  bids: number
  stage: string
  status: string
  winner?: string
  subtitle: string | null
  description: string | null
  image: string | null
  currentPrice: number
  totalStages: number
  endsAt: number | null
  startsAt: number | null
  rounds: LotRound[]
}

export interface PollCandidate {
  id: number
  title: string
  tag: string | null
  votes: number
  /** Админы тавьсан суурь тоо (бодит саналаас тусад нь) */
  baseVotes: number
}

export interface ApiPoll {
  id: number
  title: string
  subtitle: string | null
  maxPicks: number
  closesAt: number | null
  status: 'draft' | 'open' | 'closed'
  totalVotes: number
  candidates: PollCandidate[]
}

/** Санал хураалт хадгалах бие — `candidates` өгвөл бүтнээр нь солино */
export interface PollInput {
  title?: string
  subtitle?: string
  maxPicks?: number
  closesInMin?: number
  status?: 'draft' | 'open' | 'closed'
  candidates?: { id?: number; title: string; tag?: string; baseVotes?: number }[]
}

export interface ShopItem {
  id: number
  title: string
  category: string
  tokens: number
  description: string | null
  image: string | null
  /** null = хязгааргүй */
  stock: number | null
  status: 'active' | 'hidden'
  soldOut: boolean
  /** Зөвхөн админы жагсаалтад — хэдэн ширхэг солигдсон */
  redeemed?: number
}

export interface ShopOrder {
  id: number
  title: string
  tokens: number
  status: 'pending' | 'shipped' | 'done' | 'cancelled'
  created_at: number
}

export interface AdminShopOrder {
  id: number
  user: string
  email: string
  title: string
  tokens: number
  status: ShopOrder['status']
  createdAt: number
}

export interface ShopItemInput {
  title?: string
  category?: string
  tokens?: number
  description?: string
  imageUrl?: string
  /** '' эсвэл null = хязгааргүй */
  stock?: number | null | ''
  status?: 'active' | 'hidden'
}

/** Лот үүсгэх/засах бие. Засахад өгсөн талбарууд л шинэчлэгдэнэ. */
export interface LotInput {
  code?: string
  title?: string
  subtitle?: string
  description?: string
  /** `adminUploadImage`-аас буцсан зам, эсвэл зураг авахад '' */
  imageUrl?: string
  startPrice?: number
  status?: 'scheduled' | 'live'
  /** Ноорог лот автоматаар live болох цаг (unix ms). '' = хуваарьгүй */
  startsAt?: number | ''
  /** Round бүрийн тохиргоо — өгвөл бүтнээр нь солино */
  rounds?: { durationMin: number; resetSec: number; bidsRequired?: number | null | '' }[]
}

// --- Endpoint-ууд ---
export const api = {
  health: () => apiFetch<{ ok: boolean; serverNow: number }>('/api/health', { auth: false }),

  avatarColors: () => apiFetch<{ colors: string[] }>('/api/avatar-colors', { auth: false }),
  /** Профайл засах — нэр, дүрсний өнгө */
  updateMe: (body: { name?: string; avatarColor?: string }) =>
    apiFetch<{ user: ApiUser }>('/api/me', { method: 'PATCH', body }),

  register: (body: {
    email: string
    password: string
    name?: string
    referralCode?: string
    avatarColor?: string
  }) =>
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
  /** Google ID token-оор нэвтрэх — сервер токеныг Google-ийн түлхүүрээр шалгана */
  googleLogin: (body: { credential: string; referralCode?: string }) =>
    apiFetch<{ token: string; user: ApiUser }>('/api/auth/google', { body, auth: false }),
  me: () => apiFetch<{ user: ApiUser }>('/api/me'),

  lots: () => apiFetch<{ serverNow: number; lots: ApiLot[]; closed: ClosedLot[] }>('/api/lots'),
  lot: (id: number | string) =>
    apiFetch<{
      serverNow: number
      lot: ApiLot
      gating: Gating
      bids: ApiBid[]
      schedule: RoundSlot[]
    }>(`/api/lots/${id}`),
  bid: (id: number | string, inc: number) =>
    apiFetch<{ lot: ApiLot; credits: number }>(`/api/lots/${id}/bid`, { body: { inc } }),
  rejoin: (id: number | string) =>
    apiFetch<{ credits: number }>(`/api/lots/${id}/rejoin`, { body: {} }),

  packs: () => apiFetch<{ packs: CreditPack[] }>('/api/wallet/packs', { auth: false }),
  topup: (packId: number) =>
    apiFetch<{ ok: boolean; user: ApiUser }>('/api/wallet/topup', { body: { packId } }),
  referral: () => apiFetch<ReferralInfo>('/api/referral'),
  tokenHistory: () =>
    apiFetch<{ balance: number; entries: TokenEntry[] }>('/api/wallet/tokens'),
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

  // --- Санал хураалт ---
  poll: () => apiFetch<{ poll: ApiPoll | null; myPicks: number[] }>('/api/poll'),
  pollVote: (candidateId: number) =>
    apiFetch<{ poll: ApiPoll; myPicks: number[] }>('/api/poll/vote', { body: { candidateId } }),

  // --- Дэлгүүр ---
  shopItems: () => apiFetch<{ items: ShopItem[] }>('/api/shop/items', { auth: false }),
  shopRedeem: (itemId: number) =>
    apiFetch<{ ok: boolean; orderId: number; user: ApiUser }>('/api/shop/redeem', {
      body: { itemId },
    }),
  shopOrders: () => apiFetch<{ orders: ShopOrder[] }>('/api/shop/orders'),

  // --- Admin ---
  adminShopItems: () => apiFetch<{ items: ShopItem[] }>('/api/admin/shop/items'),
  adminCreateShopItem: (body: ShopItemInput) =>
    apiFetch<{ item: ShopItem }>('/api/admin/shop/items', { body }),
  adminUpdateShopItem: (id: number, body: ShopItemInput) =>
    apiFetch<{ item: ShopItem }>(`/api/admin/shop/items/${id}`, { method: 'PATCH', body }),
  adminDeleteShopItem: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/shop/items/${id}`, { method: 'DELETE' }),
  adminShopOrders: () => apiFetch<{ orders: AdminShopOrder[] }>('/api/admin/shop/orders'),
  adminUpdateShopOrder: (id: number, status: ShopOrder['status']) =>
    apiFetch<{ ok: boolean }>(`/api/admin/shop/orders/${id}`, { method: 'PATCH', body: { status } }),

  adminPolls: () => apiFetch<{ polls: ApiPoll[] }>('/api/admin/polls'),
  adminCreatePoll: (body: PollInput = {}) =>
    apiFetch<{ poll: ApiPoll }>('/api/admin/polls', { body }),
  adminSavePoll: (id: number, body: PollInput) =>
    apiFetch<{ poll: ApiPoll }>(`/api/admin/polls/${id}`, { method: 'PUT', body }),
  adminDeletePoll: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/polls/${id}`, { method: 'DELETE' }),

  adminOverview: () =>
    apiFetch<{
      metrics: { label: string; value: string; delta: string; positive: boolean; hint: string }[]
      bidsByDay: { day: string; bids: number }[]
      recentActivity: { text: string; time: string; kind: string }[]
    }>('/api/admin/overview'),
  adminAuctions: () => apiFetch<{ auctions: AdminAuction[] }>('/api/admin/auctions'),
  /** Зураг байршуулж, лотод хадгалах замыг авна. multipart тул apiFetch ашиглахгүй. */
  adminUploadImage: async (file: File): Promise<{ url: string }> => {
    const form = new FormData()
    form.append('file', file)
    const token = getToken()
    const res = await fetch(API_URL + '/api/admin/uploads', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}
    if (!res.ok)
      throw new ApiError(res.status, (data as { error?: string }).error ?? `Алдаа (${res.status})`)
    return data as { url: string }
  },
  adminCreateLot: (body: LotInput) => apiFetch<{ lot: ApiLot }>('/api/admin/lots', { body }),
  adminUpdateLot: (id: number, body: LotInput) =>
    apiFetch<{ lot: ApiLot }>(`/api/admin/lots/${id}`, { method: 'PATCH', body }),
  adminCloseLot: (id: number) =>
    apiFetch<{ lot: ApiLot }>(`/api/admin/lots/${id}/close`, { method: 'POST', body: {} }),
  adminDeleteLot: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/lots/${id}`, { method: 'DELETE' }),
  adminUsers: () => apiFetch<{ users: AdminUser[] }>('/api/admin/users'),
  adminUpdateUser: (
    id: number,
    body: { credits?: number; tokens?: number; blocked?: boolean; isAdmin?: boolean },
  ) => apiFetch<{ user: ApiUser }>(`/api/admin/users/${id}`, { method: 'PATCH', body }),
  adminDeleteUser: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  adminPacks: () => apiFetch<{ packs: CreditPack[] }>('/api/admin/packs'),
  adminCreatePack: (body: { credits: number; priceMnt: number; best?: boolean }) =>
    apiFetch<{ pack: CreditPack }>('/api/admin/packs', { body }),
  adminUpdatePack: (
    id: number,
    body: { credits?: number; priceMnt?: number; best?: boolean; status?: 'active' | 'hidden' },
  ) => apiFetch<{ pack: CreditPack }>(`/api/admin/packs/${id}`, { method: 'PATCH', body }),
  adminDeletePack: (id: number) =>
    apiFetch<{ ok: boolean }>(`/api/admin/packs/${id}`, { method: 'DELETE' }),
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
