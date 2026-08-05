import { idbClearStore } from './offlineIdb.js'
import { OFFLINE_IDB_STORES } from '../../contracts/v1/offlineFirstErp.js'
import { getOfflineCacheStatus } from './offlineCacheStore.js'
import { listOpenConflicts } from './offlineConflictResolver.js'
import { drainOfflineSyncQueue, getOfflineSyncQueueStats, isOfflineSyncDraining } from './offlineSyncEngine.js'
import { listPendingSyncItems, listSyncLogs } from './offlineSyncQueueStore.js'

export async function clearOfflineCaches() {
  await Promise.all([
    idbClearStore(OFFLINE_IDB_STORES.ORDERS),
    idbClearStore(OFFLINE_IDB_STORES.COLLECTIONS),
    idbClearStore(OFFLINE_IDB_STORES.SHIPMENTS),
    idbClearStore(OFFLINE_IDB_STORES.CUSTOMER_SEARCH),
    idbClearStore(OFFLINE_IDB_STORES.PRODUCT_SEARCH),
    idbClearStore(OFFLINE_IDB_STORES.PHOTOS),
  ])
}

export async function forceOfflineSync() {
  await drainOfflineSyncQueue()
}

export async function getOfflineFirstSnapshot() {
  const [cache, queue, conflicts, pending, logs] = await Promise.all([
    getOfflineCacheStatus(),
    getOfflineSyncQueueStats(),
    listOpenConflicts(),
    listPendingSyncItems(),
    listSyncLogs(),
  ])
  return {
    cache,
    queue,
    conflicts: conflicts.length,
    pending: pending.length,
    syncing: isOfflineSyncDraining(),
    logs,
  }
}

export {
  drainOfflineSyncQueue,
  getOfflineCacheStatus,
  getOfflineSyncQueueStats,
  isOfflineSyncDraining,
  listOpenConflicts,
  listPendingSyncItems,
  listSyncLogs,
}
