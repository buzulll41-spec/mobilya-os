/** @typedef {{ hub: string, tab: string }} HubAliasTarget */

/** @type {Record<string, HubAliasTarget>} */
export const HUB_PAGE_ALIASES = {
  products: { hub: 'product-master-center', tab: 'cards' },
  'media-center': { hub: 'commerce-publishing', tab: 'media' },
  'woocommerce-connector': { hub: 'commerce-publishing', tab: 'woo' },
  'executive-war-room': { hub: 'ceo-control-center', tab: 'war-room' },
  'cash-radar': { hub: 'ceo-control-center', tab: 'cash-radar' },
  'automation-center': { hub: 'operation-cases', tab: 'automation' },
  'action-center': { hub: 'operation-cases', tab: 'actions' },
  'supplier-ledger-center': { hub: 'supply-incoming', tab: 'cari' },
}

/**
 * @param {string} hash
 */
export function parseHashRoute(hash) {
  const trimmed = hash.replace(/^#/, '') || '/dashboard'
  const [pathPart, queryPart] = trimmed.split('?')
  const pageId = pathPart.replace(/^\//, '') || 'dashboard'
  const params = new URLSearchParams(queryPart ?? '')
  return { pageId, tab: params.get('tab') }
}

/**
 * @param {string} hash
 */
export function resolvePageFromHash(hash) {
  if (hash === '#/shipment-calendar' || hash === '#/shipment' || hash.startsWith('#/shipment-ops')) {
    return 'shipment-ops'
  }
  if (hash === '#/ssh-service') return 'ssh-service'
  if (hash === '#/operation-cases' || hash.startsWith('#/operation-cases')) return 'operation-cases'
  if (hash === '#/automation-center' || hash.startsWith('#/automation-center')) return 'operation-cases'
  if (hash === '#/action-center' || hash.startsWith('#/action-center')) return 'operation-cases'
  if (hash === '#/executive-war-room' || hash.startsWith('#/executive-war-room')) return 'ceo-control-center'
  if (hash === '#/cash-radar' || hash.startsWith('#/cash-radar')) return 'ceo-control-center'
  if (hash === '#/ceo-control-center' || hash.startsWith('#/ceo-control-center')) return 'ceo-control-center'
  if (hash === '#/product-master-center' || hash.startsWith('#/product-master-center')) {
    return 'product-master-center'
  }
  if (hash === '#/products' || hash.startsWith('#/products')) return 'product-master-center'
  if (hash === '#/media-center' || hash.startsWith('#/media-center')) return 'commerce-publishing'
  if (hash === '#/commerce-publishing' || hash.startsWith('#/commerce-publishing')) {
    return 'commerce-publishing'
  }
  if (hash === '#/woocommerce-connector' || hash.startsWith('#/woocommerce-connector')) {
    return 'commerce-publishing'
  }
  if (hash === '#/manager-cockpit' || hash.startsWith('#/manager-cockpit')) return 'manager-cockpit'
  if (hash === '#/supply-incoming' || hash.startsWith('#/supply-incoming')) return 'supply-incoming'
  if (hash === '#/supplier-ledger-center' || hash.startsWith('#/supplier-ledger-center')) {
    return 'supply-incoming'
  }
  if (hash === '#/business-rules' || hash.startsWith('#/business-rules')) return 'business-rules'
  if (hash === '#/users-admin' || hash.startsWith('#/users-admin')) return 'users-admin'
  const { pageId } = parseHashRoute(hash)
  if (HUB_PAGE_ALIASES[pageId]) return HUB_PAGE_ALIASES[pageId].hub
  if (pageId && pageId !== 'dashboard') return pageId
  return 'dashboard'
}

/**
 * @param {string} hubPageId
 * @param {string} tab
 */
export function buildHubHash(hubPageId, tab) {
  return tab ? `#/${hubPageId}?tab=${encodeURIComponent(tab)}` : `#/${hubPageId}`
}

/**
 * @param {string} target
 * @param {string} [tab]
 */
export function resolveNavigateHash(target, tab) {
  const alias = HUB_PAGE_ALIASES[target]
  if (alias) {
    return buildHubHash(alias.hub, tab ?? alias.tab)
  }
  if (
    target === 'product-master-center' ||
    target === 'commerce-publishing' ||
    target === 'ceo-control-center' ||
    target === 'operation-cases'
  ) {
    return buildHubHash(target, tab)
  }
  if (target === 'shipment-ops') return '#/shipment-ops'
  if (target === 'ssh-service') return '#/ssh-service'
  if (target === 'supplier-ledger-center') return '#/supply-incoming?tab=cari'
  if (target === 'dashboard') return window.location.pathname
  return `#/${target}`
}
