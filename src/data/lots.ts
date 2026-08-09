import type { Bid, Lot } from '../types'

/** Нүүр дэлгэцийн идэвхтэй лотууд */
export const activeLots: Lot[] = [
  {
    id: 'a1',
    lot: 'LOT 042',
    title: 'iPhone 16 Pro · 256GB',
    subtitle: 'iPhone 16 Pro · 256GB · Titanium',
    price: 41254,
    secondsLeft: 12,
    currentStage: 9,
    totalStages: 11,
    youBidThisStage: true,
    bidCount: 128,
  },
  {
    id: 'a2',
    lot: 'LOT 043',
    title: 'Dyson V15 Detect',
    subtitle: 'Dyson V15 Detect Absolute',
    price: 12847,
    secondsLeft: 125,
    currentStage: 4,
    totalStages: 11,
    youBidThisStage: false,
    bidCount: 63,
    locked: true,
    lockedAtStage: 3,
  },
]

/** Auction detail-ийн эхний bid feed */
export const initialFeed: Bid[] = [
  { user: 'tulga.x', inc: '+2₮', price: '41,252₮', time: '3С ӨМНӨ', initial: 'T' },
  { user: 'anar_99', inc: '+1₮', price: '41,250₮', time: '9С ӨМНӨ', initial: 'A' },
  { user: 'zolo.mn', inc: '+3₮', price: '41,249₮', time: '14С ӨМНӨ', initial: 'Z' },
  { user: 'saraa.d', inc: '+1₮', price: '41,246₮', time: '21С ӨМНӨ', initial: 'S' },
  { user: 'batka_7', inc: '+2₮', price: '41,245₮', time: '28С ӨМНӨ', initial: 'B' },
]

/** Bid feed-д санамсаргүй өрсөлдөгч нэр гаргах */
export const rivalUsers = ['mnkh.e', 'tulga.x', 'anar_99', 'zolo.mn', 'dulguun_b']

export function getLot(id: string): Lot | undefined {
  return activeLots.find((l) => l.id === id)
}
