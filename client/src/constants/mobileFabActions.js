/** FAZ 112 — telefon FAB sayfa eşlemesi. */



/** @typedef {{ id: string; label: string; intent: string }} MobileFabAction */



/** @type {Record<string, MobileFabAction>} */

export const MOBILE_FAB_BY_PAGE = {

  dashboard: { id: 'fab-new-order', label: 'Yeni Sipariş', intent: 'new-order' },

  orders: { id: 'fab-new-order', label: 'Yeni Sipariş', intent: 'new-order' },

  collection: { id: 'fab-new-collection', label: 'Yeni Tahsilat', intent: 'new-collection' },

  'shipment-ops': { id: 'fab-new-shipment', label: 'Yeni Sevk', intent: 'new-shipment' },

}



export const MOBILE_FAB_EVENT = 'mos:mobile-fab-intent'



/** @param {string} page */

export function resolveMobileFabAction(page) {

  return MOBILE_FAB_BY_PAGE[page] ?? null

}



/** @param {string} intent */

export function dispatchMobileFabIntent(intent) {

  if (typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(MOBILE_FAB_EVENT, { detail: { intent } }))

}


