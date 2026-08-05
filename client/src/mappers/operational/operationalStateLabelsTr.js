/** Türkçe etiketler — drawer salt okunur gösterim */

/** @type {Record<string, string>} */
export const COMMERCIAL_STATE_LABELS = {
  DRAFT: 'Taslak',
  CONFIRMED: 'Onaylı',
  CANCELLED: 'İptal',
  CLOSED: 'Kapalı',
}

/** @type {Record<string, string>} */
export const FINANCIAL_STATE_LABELS = {
  NOT_DUE: 'Tahsilat gerekmez',
  PARTIAL: 'Kısmi tahsilat',
  PAID: 'Ödendi',
  OVERDUE: 'Gecikmiş bakiye',
}

/** @type {Record<string, string>} */
export const PRODUCTION_STATE_LABELS = {
  NOT_STARTED: 'Başlamadı',
  WAITING_FACTORY: 'Fabrika bekliyor',
  IN_PRODUCTION: 'Üretimde',
  READY: 'Hazır',
  ISSUE: 'Eksik / sorun',
}

/** @type {Record<string, string>} */
export const FULFILLMENT_STATE_LABELS = {
  NOT_PLANNED: 'Sevk planı yok',
  PLANNED: 'Sevk planlandı',
  PARTIAL: 'Kısmi sevk',
  SHIPPED: 'Sevk edildi',
  DELIVERED: 'Teslim edildi',
}

/** @type {Record<string, string>} */
export const INSTALLATION_STATE_LABELS = {
  NOT_REQUIRED: 'Montaj yok',
  PENDING: 'Montaj bekliyor',
  DONE: 'Montaj tamam',
  ISSUE: 'Montaj sorunu',
}

/** @type {Record<string, string>} */
export const OPERATIONAL_RISK_STATE_LABELS = {
  NONE: 'Yok',
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  CRITICAL: 'Kritik',
}

/** @param {Record<string, string>} map @param {string} value */
export function labelFor(map, value) {
  return map[value] ?? value
}
