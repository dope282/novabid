/** NovaBid домэйн төрлүүд */

export interface Lot {
  id: string
  /** "LOT 042" */
  lot: string
  title: string
  /** Дэлгэрэнгүй нэр — detail дэлгэц дээр */
  subtitle?: string
  /** Одоогийн үнэ (₮) */
  price: number
  /** Аукцион дуусахад үлдсэн секунд (soft-close) */
  secondsLeft: number
  /** Одоогийн шат (1-based) */
  currentStage: number
  /** Нийт шатны тоо (7 эсвэл 11) */
  totalStages: number
  /** Хэрэглэгч энэ шатанд bid хийсэн эсэх (gating) */
  youBidThisStage: boolean
  /** Нийт bid-ийн тоо */
  bidCount: number
  /** Өмнөх шатанд оролцоогүй тул түгжигдсэн эсэх (stage gating) */
  locked?: boolean
  /** Түгжигдсэн үеийн тайлбарт хэрэглэх "хийгээгүй" шат */
  lockedAtStage?: number
}

export interface Bid {
  /** Хэрэглэгчийн нэр */
  user: string
  /** "+2₮" */
  inc: string
  /** "41,252₮" */
  price: string
  /** "3С ӨМНӨ" */
  time: string
  /** Аватар үсэг */
  initial: string
}

export type StageStatus = 'done' | 'current' | 'upcoming'
