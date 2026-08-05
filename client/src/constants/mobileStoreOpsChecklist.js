import { MOBILE_EDITION_TEST_VIEWPORTS } from './mobileViewportTest.js'

/** FAZ 115 — manuel test checklist cihaz profilleri. */
export const MOBILE_STORE_OPS_TEST_CHECKLIST = [
  {
    id: 'iphone-390',
    device: 'iPhone',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.phone,
    checks: [
      'Dashboard büyük kartlar görünür',
      'Hızlı aksiyonlar tek elle erişilebilir',
      'Sipariş kartında müşteri, telefon, durum, termin, bakiye, sevk',
      'Tahsilat: ara, kapora, tahsilat, bakiye',
      'Sevk: bugün, yarın, geciken, teslim',
      'Arama: telefon, müşteri, sipariş no',
      'Boş durum yönlendirme mesajı',
      'Hata mesajı anlaşılır Türkçe',
    ],
  },
  {
    id: 'iphone-pro-max-430',
    device: 'iPhone Pro Max',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.phoneLarge,
    checks: [
      'Quick actions 2x2 grid taşmıyor',
      'Tab bar + quick dock çakışmıyor',
      'Sipariş kartları tam genişlik',
    ],
  },
  {
    id: 'ipad-768',
    device: 'iPad',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.tablet,
    checks: [
      'Tablet görünümü desktop bozulmadan çalışır',
      'Mağaza kartları 2 sütun',
      'Sevk/tahsilat filtreleri erişilebilir',
    ],
  },
  {
    id: 'ipad-pro-1024',
    device: 'iPad Pro',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.tabletLarge,
    checks: [
      'Landscape tablet layout stabil',
      'Desktop 1440+ davranışı korunur',
    ],
  },
]

/** @param {string} pageId */
export function isMobileStoreOpsPage(pageId) {
  return ['dashboard', 'orders', 'collection', 'shipment-ops'].includes(pageId)
}
