/** FAZ 112 — test viewport boyutları. */



export const MOBILE_EDITION_TEST_VIEWPORTS = {

  phone: { width: 390, height: 844, label: 'iPhone 12/13/14' },

  phoneLarge: { width: 430, height: 932, label: 'iPhone Pro Max' },

  tablet: { width: 768, height: 1024, label: 'iPad portrait' },

  tabletLarge: { width: 1024, height: 1366, label: 'iPad Pro landscape' },

  desktop: { width: 1440, height: 900, label: 'Desktop' },

}



/** @deprecated FAZ 111 Sprint 3 alias */

export const PHONE_TABLET_TEST_VIEWPORTS = {

  phone: MOBILE_EDITION_TEST_VIEWPORTS.phone,

  tablet: MOBILE_EDITION_TEST_VIEWPORTS.tablet,

  desktop: MOBILE_EDITION_TEST_VIEWPORTS.desktop,

}



/** Ana ekranlar — responsive audit listesi. */

export const RESPONSIVE_AUDIT_PAGES = [

  'enterprise-ceo-dashboard',

  'dashboard',

  'orders',

  'shipment-ops',

  'collection',

  'supply-incoming',

  'product-master-center',

]


