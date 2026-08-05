/** FAZ 113 — Touch First ERP sabitleri. */

export const MOBILE_LONG_PRESS_MS = 450

export const MOBILE_SWIPE_BACK_EDGE_PX = 28

export const MOBILE_SWIPE_BACK_THRESHOLD_PX = 72

/** Long press menü aksiyonları. */
export const MOBILE_LONG_PRESS_ACTIONS = [
  { id: 'detail', label: 'Detay' },
  { id: 'edit', label: 'Düzenle' },
  { id: 'quick', label: 'Hızlı işlem' },
]

/** Telefon kart seçicileri — sipariş, tahsilat, sevk. */
export const MOBILE_CARD_SELECTORS =
  '.mos-mobile-pwa.mos-viewport-phone .mos-erp-tbl tbody tr, .mos-mobile-pwa.mos-viewport-phone .coll-ops-tbl tbody tr'

/** Mobilde bottom sheet olarak açılacak overlay kökleri. */
export const MOBILE_BOTTOM_SHEET_ROOTS = [
  '.oop-panel',
  '.cc-v2-panel',
  '.now-dialog',
  '.spc-v2-panel',
  '.mos-bottom-sheet-panel',
  '.mos-modal-panel',
]

/** Swipe-back destekli detay overlay kökleri. */
export const MOBILE_SWIPE_BACK_ROOTS = [
  '.oop-root',
  '.cc-v2-root',
  '.now-root',
  '.spc-v2-root',
  '.mos-bottom-sheet-root',
]

export const MOBILE_BOTTOM_SHEET_CLASS = 'mos-bottom-sheet'
