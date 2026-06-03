/** 时间戳 → HH:MM:SS.mmm */
export function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${h}:${m}:${s}.${ms}`
}

/** 毫秒数 → 人类可读时长 (<1s 用 ms，<60s 用 s，<60m 用 m，否则用 h) */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) {
    const min = Math.floor(ms / 60000)
    const sec = ((ms % 60000) / 1000).toFixed(0)
    return `${min}m ${sec.toString().padStart(2, '0')}s`
  }
  const h = Math.floor(ms / 3600000)
  const min = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${min}m`
}
