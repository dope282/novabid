/** Админ dashboard-ийн mock дата */

export interface Metric {
  label: string
  value: string
  delta: string
  positive: boolean
  hint: string
}

export const metrics: Metric[] = [
  { label: 'Нийт орлого (7 хоног)', value: '4.82сая₮', delta: '+12.4%', positive: true, hint: 'Кредит багц борлуулалт' },
  { label: 'Идэвхтэй аукцион', value: '4', delta: '+1', positive: true, hint: 'Яг одоо явагдаж буй' },
  { label: 'Бүртгэлтэй хэрэглэгч', value: '1,284', delta: '+38', positive: true, hint: 'Сүүлийн 7 хоногт' },
  { label: 'Өнөөдрийн bid', value: '3,417', delta: '−4.1%', positive: false, hint: 'Өчигдөртэй харьцуулахад' },
]

/** 7 хоногийн bid-ийн тоо (bar chart) */
export const bidsByDay: { day: string; bids: number }[] = [
  { day: 'Дав', bids: 2840 },
  { day: 'Мяг', bids: 3120 },
  { day: 'Лха', bids: 2960 },
  { day: 'Пүр', bids: 3580 },
  { day: 'Баа', bids: 4210 },
  { day: 'Бям', bids: 5130 },
  { day: 'Ням', bids: 4670 },
]

export type AuctionStatus = 'live' | 'scheduled' | 'closed'

export interface AdminAuction {
  lot: string
  title: string
  price: string
  bids: number
  stage: string
  status: AuctionStatus
  winner?: string
}

export const adminAuctions: AdminAuction[] = [
  { lot: 'LOT 042', title: 'iPhone 16 Pro · 256GB', price: '41,254₮', bids: 128, stage: '09/11', status: 'live' },
  { lot: 'LOT 043', title: 'Dyson V15 Detect', price: '12,847₮', bids: 63, stage: '04/11', status: 'live' },
  { lot: 'LOT 044', title: 'PlayStation 5 Pro', price: '28,103₮', bids: 91, stage: '07/11', status: 'live' },
  { lot: 'LOT 045', title: 'MacBook Air M4', price: '55,032₮', bids: 204, stage: '10/11', status: 'live' },
  { lot: 'LOT 046', title: 'Samsung 55" QLED TV', price: '0₮', bids: 0, stage: '00/11', status: 'scheduled' },
  { lot: 'LOT 041', title: 'AirPods Pro 2', price: '18,902₮', bids: 142, stage: '11/11', status: 'closed', winner: 's.tuvshin' },
  { lot: 'LOT 038', title: 'Dyson Airwrap', price: '33,410₮', bids: 176, stage: '11/11', status: 'closed', winner: 'b.anar' },
  { lot: 'LOT 031', title: 'AirPods Pro', price: '9,204₮', bids: 88, stage: '07/07', status: 'closed', winner: 'zolo.mn' },
]

export interface AdminUser {
  name: string
  email: string
  credits: number
  tokens: number
  wins: number
  verified: boolean
  joined: string
}

export const adminUsers: AdminUser[] = [
  { name: 'Бат-Эрдэнэ', email: 'bat.erdene@gmail.com', credits: 24, tokens: 132, wins: 2, verified: true, joined: '06.12' },
  { name: 'С.Түвшин', email: 's.tuvshin@yahoo.com', credits: 8, tokens: 41, wins: 5, verified: true, joined: '05.28' },
  { name: 'Б.Анар', email: 'anar99@gmail.com', credits: 0, tokens: 210, wins: 3, verified: true, joined: '06.02' },
  { name: 'Сараа Д.', email: 'saraa.d@gmail.com', credits: 12, tokens: 0, wins: 0, verified: false, joined: '07.05' },
  { name: 'Золбоо М.', email: 'zolo.mn@gmail.com', credits: 45, tokens: 96, wins: 1, verified: true, joined: '06.18' },
  { name: 'Дөлгөөн Б.', email: 'dulguun.b@gmail.com', credits: 3, tokens: 17, wins: 0, verified: false, joined: '07.11' },
  { name: 'Анужин О.', email: 'anujin.o@gmail.com', credits: 30, tokens: 58, wins: 1, verified: true, joined: '07.02' },
]

export type PaymentMethod = 'QPay' | 'Referral' | 'Refund'
export type PaymentStatus = 'success' | 'pending' | 'failed'

export interface AdminPayment {
  id: string
  user: string
  item: string
  method: PaymentMethod
  amount: string
  status: PaymentStatus
  date: string
}

export const adminPayments: AdminPayment[] = [
  { id: 'TX-90412', user: 'bat.erdene', item: 'Кредит багц · 25', method: 'QPay', amount: '20,000₮', status: 'success', date: '07.14 14:32' },
  { id: 'TX-90411', user: 's.tuvshin', item: 'Кредит багц · 100', method: 'QPay', amount: '60,000₮', status: 'success', date: '07.14 13:58' },
  { id: 'TX-90410', user: 'saraa.d', item: 'Кредит багц · 10', method: 'QPay', amount: '10,000₮', status: 'pending', date: '07.14 13:41' },
  { id: 'TX-90409', user: 'anar99', item: 'Урилгын урамшуулал', method: 'Referral', amount: '+2 кредит', status: 'success', date: '07.14 12:20' },
  { id: 'TX-90408', user: 'dulguun.b', item: 'Кредит багц · 25', method: 'QPay', amount: '20,000₮', status: 'failed', date: '07.14 11:05' },
  { id: 'TX-90407', user: 'zolo.mn', item: 'Кредит багц · 50', method: 'QPay', amount: '35,000₮', status: 'success', date: '07.14 10:47' },
  { id: 'TX-90406', user: 'anujin.o', item: 'Буцаалт · LOT 040', method: 'Refund', amount: '−12,000₮', status: 'success', date: '07.13 19:12' },
]

/** Overview дэлгэцийн сүүлийн үйл явдал */
export const recentActivity: { text: string; time: string; kind: 'win' | 'pay' | 'user' | 'close' }[] = [
  { text: 's.tuvshin — LOT 042-т bid хийв (+2₮)', time: 'ЯГ ОДОО', kind: 'win' },
  { text: 'Шинэ хэрэглэгч бүртгүүлэв — dulguun.b', time: '2 МИН', kind: 'user' },
  { text: 'QPay төлбөр амжилттай — 60,000₮ (s.tuvshin)', time: '6 МИН', kind: 'pay' },
  { text: 'LOT 041 хаагдлаа — ялагч s.tuvshin', time: '14 МИН', kind: 'close' },
  { text: 'b.anar — LOT 044-т bid хийв (+1₮)', time: '18 МИН', kind: 'win' },
]
