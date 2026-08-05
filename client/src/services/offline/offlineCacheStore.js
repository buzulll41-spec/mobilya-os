import {
  OFFLINE_IDB_STORES,
  OFFLINE_MUTATION_TYPE,
  OFFLINE_SYNC_STATUS,
} from '../../contracts/v1/offlineFirstErp.js'
import { idbGet, idbGetAll, idbPut } from './offlineIdb.js'

const ORDERS_KEY = 'snapshot'
const COLLECTIONS_KEY = 'snapshot'
const SHIPMENTS_KEY = 'snapshot'

/**
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} orders
 */
export async function cacheOrdersSnapshot(orders) {
  await idbPut(OFFLINE_IDB_STORES.ORDERS, ORDERS_KEY, {
    key: ORDERS_KEY,
    data: orders,
    count: orders.length,
  })
}

/** @returns {Promise<import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]>} */
export async function readCachedOrders() {
  const row = await idbGet(OFFLINE_IDB_STORES.ORDERS, ORDERS_KEY)
  return Array.isArray(row?.data) ? row.data : []
}

/**
 * @param {unknown[]} payments
 */
export async function cacheCollectionsSnapshot(payments) {
  await idbPut(OFFLINE_IDB_STORES.COLLECTIONS, COLLECTIONS_KEY, {
    key: COLLECTIONS_KEY,
    data: payments,
    count: payments.length,
  })
}

/**
 * @param {unknown[]} plans
 */
export async function cacheShipmentsSnapshot(plans) {
  await idbPut(OFFLINE_IDB_STORES.SHIPMENTS, SHIPMENTS_KEY, {
    key: SHIPMENTS_KEY,
    data: plans,
    count: plans.length,
  })
}

/**
 * @param {string} query
 * @param {unknown[]} results
 */
export async function cacheCustomerSearch(query, results) {
  const key = query.trim().toLowerCase()
  if (!key) return
  await idbPut(OFFLINE_IDB_STORES.CUSTOMER_SEARCH, key, {
    key,
    query,
    data: results,
    count: results.length,
  })
}

/** @param {string} query */
export async function readCachedCustomerSearch(query) {
  const key = query.trim().toLowerCase()
  const row = await idbGet(OFFLINE_IDB_STORES.CUSTOMER_SEARCH, key)
  return Array.isArray(row?.data) ? row.data : null
}

/**
 * @param {string} query
 * @param {unknown[]} results
 */
export async function cacheProductSearch(query, results) {
  const key = query.trim().toLowerCase()
  if (!key) return
  await idbPut(OFFLINE_IDB_STORES.PRODUCT_SEARCH, key, {
    key,
    query,
    data: results,
    count: results.length,
  })
}

/** @param {string} query */
export async function readCachedProductSearch(query) {
  const key = query.trim().toLowerCase()
  const row = await idbGet(OFFLINE_IDB_STORES.PRODUCT_SEARCH, key)
  return Array.isArray(row?.data) ? row.data : null
}

/**
 * @param {{ id: string; orderId?: string; fileName: string; mimeType: string; dataUrl: string }} photo
 */
export async function cachePhotoCapture(photo) {
  await idbPut(OFFLINE_IDB_STORES.PHOTOS, photo.id, photo)
}

/** @returns {Promise<unknown[]>} */
export async function readCachedPhotos() {
  return idbGetAll(OFFLINE_IDB_STORES.PHOTOS)
}

/** @returns {Promise<{ orders: number; customers: number; products: number; ordersBytes: number; customersBytes: number; productsBytes: number }>} */
export async function getOfflineCacheStatus() {
  const [ordersRow, customerRows, productRows] = await Promise.all([
    idbGet(OFFLINE_IDB_STORES.ORDERS, ORDERS_KEY),
    idbGetAll(OFFLINE_IDB_STORES.CUSTOMER_SEARCH),
    idbGetAll(OFFLINE_IDB_STORES.PRODUCT_SEARCH),
  ])
  const ordersBytes = safeSize(ordersRow)
  const customersBytes = safeSize(customerRows)
  const productsBytes = safeSize(productRows)
  return {
    orders: ordersRow?.count ?? 0,
    customers: customerRows.length,
    products: productRows.length,
    ordersBytes,
    customersBytes,
    productsBytes,
  }
}

/** @param {unknown} value */
function safeSize(value) {
  try {
    return new Blob([JSON.stringify(value ?? null)]).size
  } catch {
    return 0
  }
}

export { OFFLINE_MUTATION_TYPE, OFFLINE_SYNC_STATUS }
