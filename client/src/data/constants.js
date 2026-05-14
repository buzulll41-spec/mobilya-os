/** @typedef {'Bekleniyor' | 'Üretimde' | 'Geldi' | 'Eksik Var' | 'Hazır' | 'Teslim Edildi'} OrderStatus */

export const ORDER_STATUSES = [
  'Bekleniyor',
  'Üretimde',
  'Geldi',
  'Eksik Var',
  'Hazır',
  'Teslim Edildi',
]

/** Demo referans tarihi */
export const DEMO_TODAY = '2026-05-14'

export function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const DEMO_TOMORROW = addDays(DEMO_TODAY, 1)

export const dashboardTodaySales = 45_200
