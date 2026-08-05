/** FAZ 112 — telefon alt navigasyon (4 sekme). */

/** @typedef {{ id: string; label: string; shortLabel: string; icon: string; action?: 'menu' | 'customers' }} MobileTabItem */

/** @type {MobileTabItem[]} */
export const MOBILE_TAB_ITEMS = [
  { id: 'dashboard', label: 'Bugün', shortLabel: 'Bugün', icon: '🏠' },
  { id: 'orders', label: 'Siparişler', shortLabel: 'Sipariş', icon: '🧾' },
  { id: 'shipment-ops', label: 'Sevk', shortLabel: 'Sevk', icon: '🚚' },
  { id: 'collection', label: 'Tahsilat', shortLabel: 'Tahsilat', icon: '💳' },
]

/** @param {string} pageId */
export function isMobileTabPage(pageId) {
  return MOBILE_TAB_ITEMS.some((item) => item.id === pageId && item.action !== 'menu')
}

/** Menü sekmesi aktif mi (sidebar açık). */
export function isMobileMenuTabActive(sidebarOpen) {
  return sidebarOpen
}


