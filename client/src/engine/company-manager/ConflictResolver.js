import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiProcurementSpecialist.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiShipmentSpecialist.js'
import { DIGITAL_WORKER_STATUS } from '../../contracts/v1/digitalWorker.js'

/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTask} WorkerTask */

/**
 * @typedef {Object} WorkerConflict
 * @property {string} id
 * @property {'ORDER_OVERLAP' | 'QUEUE_OVERLOAD' | 'WORKER_PAUSED_CONFLICT'} kind
 * @property {string} message
 * @property {string} [orderId]
 * @property {string} [workerId]
 * @property {string[]} [workerIds]
 */

const PIPELINE_WORKERS = [
  AI_SALES_FOLLOW_UP_WORKER_ID,
  AI_SHIPMENT_SPECIALIST_WORKER_ID,
  AI_COLLECTION_SPECIALIST_WORKER_ID,
  AI_PROCUREMENT_SPECIALIST_WORKER_ID,
]

/**
 * @param {WorkerTask[]} tasks
 * @param {import('../../contracts/v1/digitalWorker.js').DigitalWorker[]} workers
 */
export function detectOperationalConflicts(tasks, workers) {
  /** @type {WorkerConflict[]} */
  const conflicts = []

  const activeTasks = tasks.filter(
    (t) =>
      t.status === DIGITAL_WORKER_STATUS.WAITING ||
      t.status === DIGITAL_WORKER_STATUS.RUNNING ||
      t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL,
  )

  const byOrder = new Map()
  for (const task of activeTasks) {
    if (!task.relatedEntityId) continue
    const list = byOrder.get(task.relatedEntityId) ?? []
    list.push(task)
    byOrder.set(task.relatedEntityId, list)
  }

  for (const [orderId, orderTasks] of byOrder.entries()) {
    const workerSet = new Set(orderTasks.map((t) => t.workerId))
    if (workerSet.size > 2) {
      conflicts.push({
        id: `conf-order-${orderId}`,
        kind: 'ORDER_OVERLAP',
        orderId,
        workerIds: [...workerSet],
        message: `${orderId} üzerinde ${workerSet.size} AI çakışması`,
      })
    }
  }

  for (const workerId of PIPELINE_WORKERS) {
    const pending = activeTasks.filter((t) => t.workerId === workerId).length
    const worker = workers.find((w) => w.id === workerId)
    if (pending >= 6) {
      conflicts.push({
        id: `conf-queue-${workerId}`,
        kind: 'QUEUE_OVERLOAD',
        workerId,
        message: `${worker?.name ?? workerId} kuyruğu yoğun (${pending})`,
      })
    }
    if (worker?.status === DIGITAL_WORKER_STATUS.PAUSED && pending > 0) {
      conflicts.push({
        id: `conf-paused-${workerId}`,
        kind: 'WORKER_PAUSED_CONFLICT',
        workerId,
        message: `${worker.name} duraklatılmış ama bekleyen görev var`,
      })
    }
  }

  return conflicts
}

/**
 * @param {WorkerConflict[]} conflicts
 * @param {string} dominantDomain
 */
export function resolveConflictStrategy(conflicts, dominantDomain) {
  const overload = conflicts.find((c) => c.kind === 'QUEUE_OVERLOAD')
  const overlap = conflicts.find((c) => c.kind === 'ORDER_OVERLAP')

  return {
    shouldPauseCollection:
      dominantDomain === 'shipment' &&
      (overload?.workerId === AI_SHIPMENT_SPECIALIST_WORKER_ID || dominantDomain === 'shipment'),
    shouldStopProcurement:
      dominantDomain === 'shipment' &&
      Boolean(conflicts.find((c) => c.workerId === AI_PROCUREMENT_SPECIALIST_WORKER_ID)),
    shouldBoostShipment: dominantDomain === 'shipment',
    shouldRunSales: dominantDomain === 'sales',
    overlapOrderId: overlap?.orderId ?? null,
    cancelLowestPriority: Boolean(overload),
  }
}

export { PIPELINE_WORKERS }
