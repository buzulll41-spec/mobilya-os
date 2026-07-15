/** FAZ 112 — telefon alt navigasyon (Field Pilot: max 4 sekme). */



/** @typedef {{ id: string; label: string; shortLabel: string; icon: string; action?: 'menu' }} MobileTabItem */



/** @type {MobileTabItem[]} */

export const MOBILE_TAB_ITEMS = [

  { id: 'dashboard', label: 'Ana Sayfa', shortLabel: 'Ana Sayfa', icon: '🏠' },

  { id: 'orders', label: 'İşler', shortLabel: 'İşler', icon: '🧩' },

  { id: 'notifications', label: 'Bildirimler', shortLabel: 'Bildirim', icon: '🔔' },

  { id: 'profile', label: 'Profil', shortLabel: 'Profil', icon: '👤' },

]



/** @param {string} pageId */

export function isMobileTabPage(pageId) {

  return MOBILE_TAB_ITEMS.some((item) => item.id === pageId && item.action !== 'menu')

}



/** Menü sekmesi aktif mi (sidebar açık). */

export function isMobileMenuTabActive(sidebarOpen) {

  return sidebarOpen

}


