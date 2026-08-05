import {
  OFFLINE_IDB_STORES,
  OFFLINE_SYNC_LOG_MAX,
  OFFLINE_SYNC_STATUS,
} from '../../contracts/v1/offlineFirstErp.js'
import { idbDelete, idbGetAll, idbPut } from './offlineIdb.js'

/**
 * @typedef {Object} OfflineSyncQueueItem
 * @property {string} id
 * @property {import('../../contracts/v1/offlineFirstErp.js').OfflineMutationType} type
 * @property {unknown} payload
 * @property {import('../../contracts/v1/offlineFirstErp.js').OfflineSyncStatus} status
 * @property {number} retryCount
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {string} [lastError]
 * @property {string} [entityKey]
 * @property {number} [localVersion]
 * @property {number} [serverVersion]
 */

function newId() {
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * @param {Omit<OfflineSyncQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'retryCount' | 'status'> & { status?: import('../../contracts/v1/offlineFirstErp.js').OfflineSyncStatus }} input
 * @returns {Promise<OfflineSyncQueueItem>}
 */
export async function enqueueSyncItem(input) {
  const now = new Date().toISOString()
  /** @type {OfflineSyncQueueItem} */
  const item = {
    id: newId(),
    type: input.type,
    payload: input.payload,
    status: input.status ?? OFFLINE_SYNC_STATUS.WAITING,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
    lastError: input.lastError,
    entityKey: input.entityKey,
    localVersion: input.localVersion,
    serverVersion: input.serverVersion,
  }
  await idbPut(OFFLINE_IDB_STORES.SYNC_QUEUE, item.id, item)
  return item
}

/** @returns {Promise<OfflineSyncQueueItem[]>} */
export async function listSyncQueueItems() {
  const rows = await idbGetAll(OFFLINE_IDB_STORES.SYNC_QUEUE)
  return rows.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

/** @returns {Promise<OfflineSyncQueueItem[]>} */
export async function listPendingSyncItems() {
  const items = await listSyncQueueItems()
  return items.filter(
    (item) =>
      item.status === OFFLINE_SYNC_STATUS.WAITING ||
      item.status === OFFLINE_SYNC_STATUS.ERROR ||
      item.status === OFFLINE_SYNC_STATUS.SYNCING,
  )
}

/**
 * @param {OfflineSyncQueueItem} item
 */
export async function updateSyncQueueItem(item) {
  await idbPut(OFFLINE_IDB_STORES.SYNC_QUEUE, item.id, {
    ...item,
    updatedAt: new Date().toISOString(),
  })
}

/** @param {string} id */
export async function removeSyncQueueItem(id) {
  await idbDelete(OFFLINE_IDB_STORES.SYNC_QUEUE, id)
}

/**
 * @param {{ level: 'info' | 'error' | 'success'; message: string; itemId?: string }} entry
 */
export async function appendSyncLog(entry) {
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  await idbPut(OFFLINE_IDB_STORES.SYNC_LOG, id, {
    id,
    ...entry,
    at: new Date().toISOString(),
  })
  const logs = await idbGetAll(OFFLINE_IDB_STORES.SYNC_LOG)
  if (logs.length <= OFFLINE_SYNC_LOG_MAX) return
  const sorted = logs.sort((a, b) => String(a.at).localeCompare(String(b.at)))
  const overflow = sorted.slice(0, logs.length - OFFLINE_SYNC_LOG_MAX)
  await Promise.all(overflow.map((row) => idbDelete(OFFLINE_IDB_STORES.SYNC_LOG, row.id)))
}

/** @returns {Promise<Array<{ id: string; level: string; message: string; at: string; itemId?: string }>>} */
export async function listSyncLogs() {
  const rows = await idbGetAll(OFFLINE_IDB_STORES.SYNC_LOG)
  return rows.sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, OFFLINE_SYNC_LOG_MAX)
}

/** @returns {Promise<number>} */
export async function countPendingSyncItems() {
  const pending = await listPendingSyncItems()
  return pending.filter((item) => item.status !== OFFLINE_SYNC_STATUS.OK).length
}
