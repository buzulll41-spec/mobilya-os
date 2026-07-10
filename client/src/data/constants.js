/** @typedef {'Bekleniyor' | 'Kısmi Geldi' | 'Üretimde' | 'Geldi' | 'Eksik Var' | 'Hazır' | 'Sevke Hazır' | 'Teslim Edildi'} OrderStatus */

export const ORDER_STATUSES = [
  'Bekleniyor',
  'Kısmi Geldi',
  'Üretimde',
  'Geldi',
  'Eksik Var',
  'Hazır',
  'Sevke Hazır',
  'Sevk Planlandı',
  'Yola Çıktı',
  'Teslim Onayı Bekliyor',
  'Teslim Edildi',
]

/** Sipariş listesi — ürün satırlarından türetilen durum rozetleri */
export const ORDER_LIST_FULFILLMENT_STATUSES = [
  'Bekleniyor',
  'Kısmi Geldi',
  'Geldi',
  'Sevke Hazır',
  'Sevk Planlandı',
  'Yola Çıktı',
  'Teslim Onayı Bekliyor',
  'Teslim Edildi',
]

import { isProductionMode } from '../config/appMode.js'

/** Demo referans tarihi */
export const DEMO_TODAY = '2026-05-14'

/** @returns {string} YYYY-MM-DD — production'da gerçek gün, demo'da sabit referans */
export function getOperationalToday() {
  if (isProductionMode()) {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  return DEMO_TODAY
}

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
