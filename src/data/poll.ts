/** "Дараагийн лот"-ын санал хураалтын нэр дэвшигчид */

export interface PollCandidate {
  id: string
  title: string
  /** Богино ангилал/тайлбар */
  tag: string
  /** Эхний (суурь) саналын тоо */
  votes: number
}

export const pollCandidates: PollCandidate[] = [
  { id: 'c1', title: 'Samsung 55" QLED TV', tag: 'Техник', votes: 412 },
  { id: 'c2', title: 'Apple Watch Series 10', tag: 'Гаджет', votes: 508 },
  { id: 'c3', title: 'Nintendo Switch 2', tag: 'Тоглоом', votes: 356 },
]

/** Хэдэн барааг сонгож санал өгөх боломжтой */
export const POLL_MAX_PICKS = 1

/** Санал хураалт дуусах хүртэл (жишээ) */
export const pollClosesIn = '18 цаг 24 мин'
