/**
 * @param {string} occurredAt ISO instant
 * @param {string} todayIso YYYY-MM-DD (referans gün)
 */
export function relativeTimeLabelTr(occurredAt, todayIso) {
  const a = new Date(occurredAt)
  const t = new Date(`${todayIso}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(t.getTime())) return ''
  const dayMs = 86400000
  const diff = Math.round((t.getTime() - a.getTime()) / dayMs)
  if (diff === 0) return 'Bugün'
  if (diff === 1) return 'Dün'
  if (diff > 1) return `${diff} gün önce`
  if (diff === -1) return 'Yarın'
  if (diff < -1) return `${-diff} gün sonra`
  return ''
}
