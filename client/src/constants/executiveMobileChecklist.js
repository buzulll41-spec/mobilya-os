import { MOBILE_EDITION_TEST_VIEWPORTS } from './mobileViewportTest.js'

/** FAZ 116 — executive mobile test checklist. */
export const EXECUTIVE_MOBILE_TEST_CHECKLIST = [
  {
    id: 'phone-portrait-390',
    device: 'Phone Portrait',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.phone,
    orientation: 'portrait',
    checks: [
      '6 KPI kartı tek sütun',
      'Trend okları görünür',
      'Kritik uyarılar kırmızı',
      'Yeşil fırsatlar TL ile',
      'Copilot tek cümle alt bant',
      'Timeline Bugün/Dün/Hafta',
      'Quick approval Onayla/Reddet',
      'CEO FAB menü',
    ],
  },
  {
    id: 'phone-portrait-430',
    device: 'Phone Pro Max Portrait',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.phoneLarge,
    orientation: 'portrait',
    checks: ['KPI grid taşmıyor', 'FAB tab bar ile çakışmıyor'],
  },
  {
    id: 'tablet-portrait-768',
    device: 'Tablet Portrait',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.tablet,
    orientation: 'portrait',
    checks: ['KPI 2 sütun', 'Timeline + onay yan yana'],
  },
  {
    id: 'tablet-landscape-1024',
    device: 'Tablet Landscape',
    viewport: MOBILE_EDITION_TEST_VIEWPORTS.tabletLarge,
    orientation: 'landscape',
    checks: ['2 kolon layout stabil', 'Desktop 1440+ değişmedi'],
  },
]

/** @param {string} pageId */
export function isExecutiveMobilePage(pageId) {
  return pageId === 'enterprise-ceo-dashboard'
}
