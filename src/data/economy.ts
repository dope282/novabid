/** Кредит багц, гүйлгээ, Token, дэлгүүр, referral-ийн mock дата */

export interface CreditPack {
  id: string
  credits: number
  price: string
  perCredit: string
  best?: boolean
}

export interface Txn {
  title: string
  meta: string
  amount: string
  positive?: boolean
}

export interface TokenEntry {
  title: string
  meta: string
  amount: string
  positive: boolean
  icon: string
}

export interface ShopItem {
  id: string
  title: string
  tokens: number
  category: 'tech' | 'home' | 'travel'
}

export interface Referral {
  name: string
  status: string
  reward: string
  ok: boolean
  initial: string
}

export const balances = {
  credits: 24,
  tokens: 132,
  wins: 2,
}

export const creditPacks: CreditPack[] = [
  { id: 'p1', credits: 10, price: '10,000₮', perCredit: '1,000₮ / кредит' },
  { id: 'p2', credits: 25, price: '20,000₮', perCredit: '800₮ / кредит' },
  { id: 'p3', credits: 50, price: '35,000₮', perCredit: '700₮ / кредит' },
  { id: 'p4', credits: 100, price: '60,000₮', perCredit: '600₮ / кредит', best: true },
]

export const transactions: Txn[] = [
  { title: 'Кредит багц · 25', meta: 'QPAY · 07.12 14:32', amount: '−20,000₮' },
  { title: 'Кредит багц · 10', meta: 'QPAY · 07.08 19:10', amount: '−10,000₮' },
  { title: 'Урилгын урамшуулал', meta: 'REFERRAL · 07.05', amount: '+2 кредит', positive: true },
]

export const tokenHistory: TokenEntry[] = [
  { title: 'LOT 038 · Dyson Airwrap', meta: 'AUCTION ДУУССАН · 07.11', amount: '+12', positive: true, icon: '↑' },
  { title: 'LOT 031 · AirPods Pro', meta: 'AUCTION ДУУССАН · 07.06', amount: '+7', positive: true, icon: '↑' },
  { title: 'Дэлгүүр · JBL Go 4', meta: 'ХУДАЛДАН АВАЛТ · 07.02', amount: '−180', positive: false, icon: '↓' },
  { title: 'LOT 024 · Nintendo Switch', meta: 'AUCTION ДУУССАН · 06.28', amount: '+9', positive: true, icon: '↑' },
]

export const shopItems: ShopItem[] = [
  { id: 's1', title: 'JBL Go 4 чанга яригч', tokens: 180, category: 'tech' },
  { id: 's2', title: 'Xiaomi Smart Band 9', tokens: 220, category: 'tech' },
  { id: 's3', title: 'Stanley термос 0.6л', tokens: 140, category: 'home' },
  { id: 's4', title: 'Anker 10,000mAh цэнэглэгч', tokens: 200, category: 'tech' },
  { id: 's5', title: 'Хэрэглэгчийн иж бүрдэл', tokens: 160, category: 'home' },
  { id: 's6', title: 'Аяллын гэрэл', tokens: 120, category: 'travel' },
]

export const shopCategories: { id: ShopItem['category'] | 'all'; label: string }[] = [
  { id: 'all', label: 'Бүгд' },
  { id: 'tech', label: 'Техник' },
  { id: 'home', label: 'Гэр ахуй' },
  { id: 'travel', label: 'Аялал' },
]

export const referralCode = 'BAT-24KH'

export const referralStats = [
  { value: '3', label: 'Урьсан', color: 'var(--nb-ink)' },
  { value: '+4', label: 'Олсон кредит', color: 'var(--nb-green)' },
  { value: '1', label: 'Хүлээгдэж буй', color: 'var(--nb-amber)' },
]

export const referrals: Referral[] = [
  { name: 'Тэмүүлэн Б.', status: 'КРЕДИТ АВСАН · 07.10', reward: '+2 кредит', ok: true, initial: 'Т' },
  { name: 'Сараа Д.', status: 'БҮРТГҮҮЛСЭН · КРЕДИТ АВААГҮЙ', reward: 'Хүлээгдэж буй', ok: false, initial: 'С' },
  { name: 'Анужин О.', status: 'КРЕДИТ АВСАН · 07.02', reward: '+2 кредит', ok: true, initial: 'А' },
]
