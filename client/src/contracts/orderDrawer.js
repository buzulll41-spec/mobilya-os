/**
 * Order Drawer — tek açılış sözleşmesi (Spec 3).
 *
 * @typedef {'overview' | 'timeline' | 'products' | 'payments' | 'shipment' | 'ssh' | 'history'} OrderDrawerTab
 *
 * @typedef {'orders' | 'collection' | 'shipment' | 'ssh' | 'dashboard' | 'supply' | 'global-search'} OrderDrawerSource
 *
 * @typedef {Object} OrderDrawerQueueContext
 * @property {string} queueId
 * @property {Record<string, unknown>} filterSnapshot
 * @property {string} sort
 * @property {string[]} rowIds
 * @property {number} activeIndex
 * @property {OrderDrawerSource} [source]
 *
 * @typedef {Object} OpenOrderDrawerOptions
 * @property {OrderDrawerTab} [tab]
 * @property {string} [section] @deprecated → tab map
 * @property {OrderDrawerSource} [source]
 * @property {OrderDrawerQueueContext} [queue]
 * @property {boolean} [preserveTabOnNavigate]
 *
 * @typedef {Object} OrderDrawerSessionState
 * @property {string | null} orderId
 * @property {OrderDrawerTab} tab
 * @property {OrderDrawerSource | null} source
 * @property {OrderDrawerQueueContext | null} queue
 * @property {boolean} preserveTabOnNavigate
 * @property {string | null} highlightOrderId
 */

export const ORDER_DRAWER_TABS = /** @type {const} */ ([
  'overview',
  'timeline',
  'products',
  'payments',
  'shipment',
  'ssh',
  'history',
])

export {}
