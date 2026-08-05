/** FAZ 115 — Mobile Store Operation (client-only UX). */

export const MOBILE_STORE_OPS = {
  PHASE: 'FAZ 115',
  NAME: 'Mobile Store Operation',
  MAX_TAPS: 3,
}

/** Mağaza operasyonu hızlı erişim sayfaları. */
export const MOBILE_STORE_OPS_PAGES = [
  'dashboard',
  'orders',
  'collection',
  'shipment-ops',
]

/** @typedef {'new-order' | 'collection' | 'shipment' | 'customer-search'} MobileStoreQuickActionId */

export const MOBILE_STORE_QUICK_ACTION_IDS = /** @type {const} */ ([
  'new-order',
  'collection',
  'shipment',
  'customer-search',
])
