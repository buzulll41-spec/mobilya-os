/** FAZ 112 — telefon alt navigasyon (5 sekme). */



/** @typedef {{ id: string; label: string; shortLabel: string; icon: string; action?: 'menu' }} MobileTabItem */



/** @type {MobileTabItem[]} */

export const MOBILE_TAB_ITEMS = [

  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: '🏠' },

  { id: 'orders', label: 'Siparişler', shortLabel: 'Siparişler', icon: '📦' },

  { id: 'shipment-ops', label: 'Sevk', shortLabel: 'Sevk', icon: '🚚' },

  { id: 'collection', label: 'Tahsilat', shortLabel: 'Tahsilat', icon: '💰' },

  { id: '__menu__', label: 'Menü', shortLabel: 'Menü', icon: '👤', action: 'menu' },

]



/** @param {string} pageId */

export function isMobileTabPage(pageId) {

  return MOBILE_TAB_ITEMS.some((item) => item.id === pageId && item.action !== 'menu')

}



/** Menü sekmesi aktif mi (sidebar açık). */

export function isMobileMenuTabActive(sidebarOpen) {

  return sidebarOpen

}


