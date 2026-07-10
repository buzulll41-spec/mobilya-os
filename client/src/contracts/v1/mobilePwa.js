/** FAZ 111 / FAZ 112 — Mobile & Tablet / Mobile Edition UX contracts. */

export const MOBILE_PWA_EDITION = {
  PHASE: 'FAZ 111',
  NAME: 'Mobile & Tablet Test Edition',
  PRODUCT: 'MOBILYA OS Enterprise 1.0',
  VERSION: '1.0.0-mobile',
}

export const MOBILE_EDITION_UX = {
  PHASE: 'FAZ 112',
  NAME: 'Mobile Edition UX',
  PRODUCT: 'MOBILYA OS Enterprise 1.0',
  VERSION: '1.0.0-mobile-ux',
}

export const TOUCH_FIRST_ERP = {
  PHASE: 'FAZ 113',
  NAME: 'Touch First ERP',
  PRODUCT: 'MOBILYA OS Enterprise 1.0',
  VERSION: '1.0.0-touch-first',
}

/** Desteklenen viewport aralıkları (px). */
export const MOBILE_BREAKPOINTS = {
  PHONE_MAX: 767,
  TABLET_MIN: 768,
  TABLET_MAX: 1024,
  LAPTOP_MIN: 1280,
  DESKTOP_MIN: 1440,
}

/** WCAG / Apple HIG minimum dokunma alanı. */
export const MOBILE_MIN_TOUCH_PX = 44

/** FAZ 112 — telefon büyük dokunma modu. */
export const MOBILE_LARGE_TOUCH_PX = 48

export const MOBILE_API_UNAVAILABLE_MESSAGE =
  'Sunucuya ulaşılamıyor. Backend çalışıyor mu?'

export const MOBILE_OFFLINE_WARNING =
  'Çevrimdışı moddasınız. Değişiklikler kaydedilemeyebilir; bağlantıyı kontrol edin.'

export const PWA_MANIFEST_PATH = '/manifest.webmanifest'
export const PWA_SERVICE_WORKER_PATH = '/sw.js'

/**
 * @typedef {'create-order' | 'deposit' | 'supply' | 'incoming' | 'ship-plan' | 'deliver' | 'collection' | 'ceo' | 'ai-workforce'} MobileTestFlowStepId
 */

/**
 * @typedef {Object} MobileTestFlowStepDto
 * @property {MobileTestFlowStepId} id
 * @property {string} label
 * @property {string} page
 * @property {string} hint
 * @property {number} order
 */

export {}
