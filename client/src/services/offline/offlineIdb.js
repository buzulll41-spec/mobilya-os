import {
  OFFLINE_IDB_NAME,
  OFFLINE_IDB_STORES,
  OFFLINE_IDB_VERSION,
} from '../../contracts/v1/offlineFirstErp.js'

/** @type {Promise<IDBDatabase> | null} */
let dbPromise = null

/**
 * @param {IDBDatabase} db
 */
function ensureStores(db) {
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.ORDERS)) {
    db.createObjectStore(OFFLINE_IDB_STORES.ORDERS, { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.COLLECTIONS)) {
    db.createObjectStore(OFFLINE_IDB_STORES.COLLECTIONS, { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.SHIPMENTS)) {
    db.createObjectStore(OFFLINE_IDB_STORES.SHIPMENTS, { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.CUSTOMER_SEARCH)) {
    db.createObjectStore(OFFLINE_IDB_STORES.CUSTOMER_SEARCH, { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.PRODUCT_SEARCH)) {
    db.createObjectStore(OFFLINE_IDB_STORES.PRODUCT_SEARCH, { keyPath: 'key' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.PHOTOS)) {
    db.createObjectStore(OFFLINE_IDB_STORES.PHOTOS, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.SYNC_QUEUE)) {
    db.createObjectStore(OFFLINE_IDB_STORES.SYNC_QUEUE, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.SYNC_LOG)) {
    db.createObjectStore(OFFLINE_IDB_STORES.SYNC_LOG, { keyPath: 'id' })
  }
  if (!db.objectStoreNames.contains(OFFLINE_IDB_STORES.CONFLICTS)) {
    db.createObjectStore(OFFLINE_IDB_STORES.CONFLICTS, { keyPath: 'id' })
  }
}

/** @returns {Promise<IDBDatabase | null>} */
export function openOfflineDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(OFFLINE_IDB_NAME, OFFLINE_IDB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        ensureStores(db)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    })
  }
  return dbPromise
}

/** Test helper — closes and resets DB handle. */
export function resetOfflineDbForTests() {
  dbPromise = null
}

/**
 * @template T
 * @param {string} storeName
 * @param {string} key
 * @param {T} value
 */
export async function idbPut(storeName, key, value) {
  const db = await openOfflineDb()
  if (!db) return
  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
    tx.objectStore(storeName).put({ key, ...value, updatedAt: new Date().toISOString() })
  })
}

/**
 * @param {string} storeName
 * @param {string} key
 */
export async function idbGet(storeName, key) {
  const db = await openOfflineDb()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

/** @param {string} storeName */
export async function idbGetAll(storeName) {
  const db = await openOfflineDb()
  if (!db) return []
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result ?? [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * @param {string} storeName
 * @param {string} key
 */
export async function idbDelete(storeName, key) {
  const db = await openOfflineDb()
  if (!db) return
  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
    tx.objectStore(storeName).delete(key)
  })
}

/** @param {string} storeName */
export async function idbClearStore(storeName) {
  const db = await openOfflineDb()
  if (!db) return
  await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.oncomplete = () => resolve(undefined)
    tx.onerror = () => reject(tx.error)
    tx.objectStore(storeName).clear()
  })
}

/** @param {string} storeName */
export async function estimateStoreBytes(storeName) {
  const rows = await idbGetAll(storeName)
  try {
    return new Blob([JSON.stringify(rows)]).size
  } catch {
    return rows.length * 512
  }
}
