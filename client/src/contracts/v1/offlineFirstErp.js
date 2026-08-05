/** FAZ 114 — Offline First ERP contracts. */

export const OFFLINE_FIRST_ERP = {
  PHASE: 'FAZ 114',
  NAME: 'Offline First ERP',
  PRODUCT: 'MOBILYA OS Enterprise 1.0',
  VERSION: '1.0.0-offline-first',
}

export const OFFLINE_IDB_NAME = 'mobilya-os-offline-v1'
export const OFFLINE_IDB_VERSION = 1

/** @typedef {'SYNC_WAITING' | 'SYNCING' | 'SYNC_OK' | 'SYNC_ERROR'} OfflineSyncStatus */

export const OFFLINE_SYNC_STATUS = /** @type {const} */ ({
  WAITING: 'SYNC_WAITING',
  SYNCING: 'SYNCING',
  OK: 'SYNC_OK',
  ERROR: 'SYNC_ERROR',
})

/** @typedef {'CREATE_ORDER' | 'POST_PAYMENT' | 'UPSERT_SHIPMENT' | 'POST_SHIPMENT' | 'PATCH_SHIPMENT_STATUS' | 'PHOTO_CAPTURE' | 'CUSTOMER_SEARCH' | 'PRODUCT_SEARCH'} OfflineMutationType */

export const OFFLINE_MUTATION_TYPE = /** @type {const} */ ({
  CREATE_ORDER: 'CREATE_ORDER',
  POST_PAYMENT: 'POST_PAYMENT',
  UPSERT_SHIPMENT: 'UPSERT_SHIPMENT',
  POST_SHIPMENT: 'POST_SHIPMENT',
  PATCH_SHIPMENT_STATUS: 'PATCH_SHIPMENT_STATUS',
  PHOTO_CAPTURE: 'PHOTO_CAPTURE',
  CUSTOMER_SEARCH: 'CUSTOMER_SEARCH',
  PRODUCT_SEARCH: 'PRODUCT_SEARCH',
})

export const OFFLINE_IDB_STORES = {
  ORDERS: 'orders_cache',
  COLLECTIONS: 'collections_cache',
  SHIPMENTS: 'shipments_cache',
  CUSTOMER_SEARCH: 'customer_search_cache',
  PRODUCT_SEARCH: 'product_search_cache',
  PHOTOS: 'photos_cache',
  SYNC_QUEUE: 'sync_queue',
  SYNC_LOG: 'sync_log',
  CONFLICTS: 'conflicts',
}

export const OFFLINE_SYNC_LOG_MAX = 100

export const OFFLINE_SYNC_RETRY_MAX = 5

export const OFFLINE_SYNC_RETRY_BASE_MS = 2000

/** @typedef {'OFFLINE' | 'ONLINE' | 'SYNCING'} OfflineBannerMode */

export const OFFLINE_BANNER_MODE = /** @type {const} */ ({
  OFFLINE: 'OFFLINE',
  ONLINE: 'ONLINE',
  SYNCING: 'SYNCING',
})

export const OFFLINE_TEST_SCENARIOS = [
  'offline',
  'online',
  'network-drop',
  'slow-3g',
  'reconnect',
]

export {}
