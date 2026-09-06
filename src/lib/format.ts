/** Тоо форматлах туслах функцууд */

/** 41254 -> "41,254₮" */
export function formatTugrik(n: number): string {
  return n.toLocaleString('en-US') + '₮'
}

/** 9 -> "09" */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Round-ын countdown. Round цагаар үргэлжилж болох тул хэмжээнд нь тааруулна:
 * 3725 -> "1:02:05", 125 -> "2:05", 9.4 -> "9.4"
 */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds)
  if (s < 60) return s.toFixed(1)
  const whole = Math.floor(s)
  const h = Math.floor(whole / 3600)
  const m = Math.floor((whole % 3600) / 60)
  const sec = whole % 60
  return h > 0
    ? `${h}:${pad2(m)}:${pad2(sec)}`
    : `${m}:${pad2(sec)}`
}

/** "ROUND 09/11" */
export function stageLabel(current: number, total: number): string {
  return `ROUND ${pad2(current)}/${pad2(total)}`
}
