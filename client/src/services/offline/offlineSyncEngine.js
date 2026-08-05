import { executeCreateOrderFlow } from '../../application/orderMutationOrchestration.js'
import {
  executePatchShipmentStatusFlow,
  executePostOrderShipmentFlow,
  executePostPaymentFlow,
} from '../../application/orderOperationsOrchestration.js'
import {
  OFFLINE_MUTATION_TYPE,
  OFFLINE_SYNC_RETRY_BASE_MS,
  OFFLINE_SYNC_RETRY_MAX,
  OFFLINE_SYNC_STATUS,
} from '../../contracts/v1/offlineFirstErp.js'
import { readCachedOrders } from './offlineCacheStore.js'
import { detectOfflineConflict, registerOfflineConflict } from './offlineConflictResolver.js'
import {
  appendSyncLog,
  listPendingSyncItems,
  listSyncQueueItems,
  removeSyncQueueItem,
  updateSyncQueueItem,
} from './offlineSyncQueueStore.js'

/** @type {boolean} */
let draining = false

/** @type {(() => void) | null} */
let onDrainComplete = null

/**
 * @param {import('./offlineSyncQueueStore.js').OfflineSyncQueueItem} item
 */
async function executeQueueItem(item) {
  if (item.type === OFFLINE_MUTATION_TYPE.CREATE_ORDER) {
    return executeCreateOrderFlow(item.payload)
  }
  if (item.type === OFFLINE_MUTATION_TYPE.POST_PAYMENT) {
    const payload = /** @type {{ orderId: string; body: { amount: number; method: string; note?: string } }} */ (
      item.payload
    )
    return executePostPaymentFlow(payload.orderId, payload.body)
  }
  if (item.type === OFFLINE_MUTATION_TYPE.UPSERT_SHIPMENT) {
    const { saveShipmentPlan } = await import('../../state/shipmentPlanStore.js')
    const plan = /** @type {import('../../state/shipmentPlanStore.js').ShipmentPlan} */ (item.payload)
    saveShipmentPlan(plan)
    return { plan }
  }
  if (item.type === OFFLINE_MUTATION_TYPE.POST_SHIPMENT) {
    const payload = /** @type {{ orderId: string; body: { plannedDate: string; crewName?: string; vehicleNote?: string; note?: string } }} */ (
      item.payload
    )
    return executePostOrderShipmentFlow(payload.orderId, payload.body)
  }
  if (item.type === OFFLINE_MUTATION_TYPE.PATCH_SHIPMENT_STATUS) {
    const payload = /** @type {{ orderId: string; shipmentId: string; body: { status: string; issueNote?: string } }} */ (
      item.payload
    )
    return executePatchShipmentStatusFlow(payload.orderId, payload.shipmentId, payload.body)
  }
  if (item.type === OFFLINE_MUTATION_TYPE.PHOTO_CAPTURE) {
    return { stored: true }
  }
  if (
    item.type === OFFLINE_MUTATION_TYPE.CUSTOMER_SEARCH ||
    item.type === OFFLINE_MUTATION_TYPE.PRODUCT_SEARCH
  ) {
    return { cached: true }
  }
  throw new Error(`Desteklenmeyen offline işlem: ${item.type}`)
}

/**
 * @param {import('./offlineSyncQueueStore.js').OfflineSyncQueueItem} item
 */
async function maybeDetectConflict(item) {
  if (!item.entityKey) return
  const cached = await readCachedOrders()
  const local = cached.find((row) => row.id === item.entityKey)
  if (!local) return
  const serverRows = cached
  const server = serverRows.find((row) => row.id === item.entityKey)
  if (server && detectOfflineConflict(local, server)) {
    await registerOfflineConflict({
      entityType: item.type,
      entityKey: item.entityKey,
      localSnapshot: local,
      serverSnapshot: server,
    })
  }
}

/**
 * @param {import('./offlineSyncQueueStore.js').OfflineSyncQueueItem} item
 */
async function processQueueItem(item) {
  item.status = OFFLINE_SYNC_STATUS.SYNCING
  await updateSyncQueueItem(item)
  await appendSyncLog({ level: 'info', message: `Senkron başladı: ${item.type}`, itemId: item.id })

  try {
    await executeQueueItem(item)
    await maybeDetectConflict(item)
    item.status = OFFLINE_SYNC_STATUS.OK
    item.lastError = undefined
    await updateSyncQueueItem(item)
    await appendSyncLog({ level: 'success', message: `Senkron tamam: ${item.type}`, itemId: item.id })
    await removeSyncQueueItem(item.id)
  } catch (error) {
    item.retryCount += 1
    item.status = OFFLINE_SYNC_STATUS.ERROR
    item.lastError = error instanceof Error ? error.message : String(error)
    await updateSyncQueueItem(item)
    await appendSyncLog({
      level: 'error',
      message: `Senkron hata (${item.retryCount}/${OFFLINE_SYNC_RETRY_MAX}): ${item.lastError}`,
      itemId: item.id,
    })
    if (item.retryCount >= OFFLINE_SYNC_RETRY_MAX) {
      await appendSyncLog({ level: 'error', message: `Kalıcı hata: ${item.type}`, itemId: item.id })
    }
  }
}

/** @returns {Promise<{ processed: number; failed: number }>} */
export async function drainOfflineSyncQueue() {
  if (draining) return { processed: 0, failed: 0 }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, failed: 0 }
  }

  draining = true
  let processed = 0
  let failed = 0

  try {
    const pending = await listPendingSyncItems()
    for (const item of pending) {
      if (item.status === OFFLINE_SYNC_STATUS.OK) continue
      if (item.status === OFFLINE_SYNC_STATUS.ERROR && item.retryCount >= OFFLINE_SYNC_RETRY_MAX) {
        failed += 1
        continue
      }
      if (item.status === OFFLINE_SYNC_STATUS.ERROR && item.retryCount > 0) {
        const delay = OFFLINE_SYNC_RETRY_BASE_MS * 2 ** (item.retryCount - 1)
        await sleep(Math.min(delay, 30000))
      }
      await processQueueItem(item)
      if (item.status === OFFLINE_SYNC_STATUS.OK) processed += 1
      else failed += 1
    }
  } finally {
    draining = false
    onDrainComplete?.()
  }

  return { processed, failed }
}

export function isOfflineSyncDraining() {
  return draining
}

/** @param {() => void} cb */
export function onOfflineSyncDrainComplete(cb) {
  onDrainComplete = cb
}

/** @returns {Promise<{ waiting: number; syncing: number; error: number; ok: number }>} */
export async function getOfflineSyncQueueStats() {
  const items = await listSyncQueueItems()
  return {
    waiting: items.filter((i) => i.status === OFFLINE_SYNC_STATUS.WAITING).length,
    syncing: items.filter((i) => i.status === OFFLINE_SYNC_STATUS.SYNCING).length,
    error: items.filter((i) => i.status === OFFLINE_SYNC_STATUS.ERROR).length,
    ok: items.filter((i) => i.status === OFFLINE_SYNC_STATUS.OK).length,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export { OFFLINE_SYNC_STATUS }
