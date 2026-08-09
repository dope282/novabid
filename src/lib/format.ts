/** Тоо форматлах туслах функцууд */

/** 41254 -> "41,254₮" */
export function formatTugrik(n: number): string {
  return n.toLocaleString('en-US') + '₮'
}

/** Секундыг "M:SS" болгох (жишээ: 125 -> "2:05") */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, '0')}`
}

/** 9 -> "09" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** "ШАТ 09/11" */
export function stageLabel(current: number, total: number): string {
  return `ШАТ ${pad2(current)}/${pad2(total)}`
}
