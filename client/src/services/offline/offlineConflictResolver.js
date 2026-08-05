import { OFFLINE_IDB_STORES } from '../../contracts/v1/offlineFirstErp.js'
import { idbDelete, idbGetAll, idbPut } from './offlineIdb.js'

/**
 * @typedef {Object} OfflineConflictRecord
 * @property {string} id
 * @property {string} entityType
 * @property {string} entityKey
 * @property {unknown} localSnapshot
 * @property {unknown} serverSnapshot
 * @property {string} createdAt
 * @property {'open' | 'resolved'} status
 * @property {string} [resolution]
 */

function newConflictId() {
  return `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * @param {{ entityType: string; entityKey: string; localSnapshot: unknown; serverSnapshot: unknown }} input
 */
export async function registerOfflineConflict(input) {
  /** @type {OfflineConflictRecord} */
  const record = {
    id: newConflictId(),
    entityType: input.entityType,
    entityKey: input.entityKey,
    localSnapshot: input.localSnapshot,
    serverSnapshot: input.serverSnapshot,
    createdAt: new Date().toISOString(),
    status: 'open',
  }
  await idbPut(OFFLINE_IDB_STORES.CONFLICTS, record.id, record)
  return record
}

/**
 * @param {unknown} localRecord
 * @param {unknown} serverRecord
 */
export function detectOfflineConflict(localRecord, serverRecord) {
  if (!localRecord || !serverRecord) return false
  const localVersion = /** @type {{ version?: number }} */ (localRecord).version
  const serverVersion = /** @type {{ version?: number }} */ (serverRecord).version
  if (typeof localVersion === 'number' && typeof serverVersion === 'number') {
    return localVersion !== serverVersion
  }
  try {
    return JSON.stringify(localRecord) !== JSON.stringify(serverRecord)
  } catch {
    return true
  }
}

/** @returns {Promise<OfflineConflictRecord[]>} */
export async function listOpenConflicts() {
  const rows = await idbGetAll(OFFLINE_IDB_STORES.CONFLICTS)
  return rows.filter((row) => row.status === 'open')
}

/**
 * @param {string} id
 * @param {'keep-local' | 'keep-server'} resolution
 */
export async function resolveOfflineConflict(id, resolution) {
  const rows = await idbGetAll(OFFLINE_IDB_STORES.CONFLICTS)
  const record = rows.find((row) => row.id === id)
  if (!record) return null
  const updated = {
    ...record,
    status: 'resolved',
    resolution,
    resolvedAt: new Date().toISOString(),
  }
  await idbPut(OFFLINE_IDB_STORES.CONFLICTS, id, updated)
  return updated
}

/** @param {string} id */
export async function dismissOfflineConflict(id) {
  await idbDelete(OFFLINE_IDB_STORES.CONFLICTS, id)
}
