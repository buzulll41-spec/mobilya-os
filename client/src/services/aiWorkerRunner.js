import { canUseRealAiWorkers } from '../config/aiWorkerConfig.js'
import { runAiWorkerTaskRemote } from './aiWorkerClient.js'
import { isMemoryInfrastructureReady } from './memory/mockAiWorkerMemoryStore.js'
import { BusinessEngine } from '../engine/businessEngine.js'
import { evaluateSalesFollowUp } from './aiSalesFollowUpService.js'
import { evaluateCollectionSpecialist } from './aiCollectionSpecialistService.js'
import { evaluateShipmentSpecialist } from './aiShipmentSpecialistService.js'
import { evaluateProcurementSpecialist } from './aiProcurementSpecialistService.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../contracts/v1/aiSalesFollowUp.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../contracts/v1/aiCollectionSpecialist.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiShipmentSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiProcurementSpecialist.js'

/** @typedef {import('../contracts/v1/aiWorkerRunner.js').AiWorkerRunPayload} AiWorkerRunPayload */
/** @typedef {import('../contracts/v1/aiWorkerRunner.js').AiWorkerRunResult} AiWorkerRunResult */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @type {Record<string, string>} */
const EVALUATOR_BY_WORKER = {
  [AI_SALES_FOLLOW_UP_WORKER_ID]: AI_SALES_FOLLOW_UP_WORKER_ID,
  [AI_COLLECTION_SPECIALIST_WORKER_ID]: AI_COLLECTION_SPECIALIST_WORKER_ID,
  [AI_SHIPMENT_SPECIALIST_WORKER_ID]: AI_SHIPMENT_SPECIALIST_WORKER_ID,
  [AI_PROCUREMENT_SPECIALIST_WORKER_ID]: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
}

/**
 * Rule baseline for LLM — Business Engine + specialist rules unchanged.
 * @param {string} workerId
 * @param {string} orderId
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} todayIso
 */
export function buildRuleBaselineForWorker(workerId, orderId, orders, dtos, todayIso) {
  const order = orders.find((o) => o.id === orderId)
  if (!order) return null

  if (workerId === AI_SALES_FOLLOW_UP_WORKER_ID) {
    const a = evaluateSalesFollowUp(orders, dtos, todayIso).find((x) => x.orderId === orderId)
    return a ?? null
  }
  if (workerId === AI_COLLECTION_SPECIALIST_WORKER_ID) {
    const a = evaluateCollectionSpecialist(orders, dtos, todayIso).find((x) => x.orderId === orderId)
    return a ?? null
  }
  if (workerId === AI_SHIPMENT_SPECIALIST_WORKER_ID) {
    const a = evaluateShipmentSpecialist(orders, dtos, todayIso).find((x) => x.orderId === orderId)
    return a ?? null
  }
  if (workerId === AI_PROCUREMENT_SPECIALIST_WORKER_ID) {
    const a = evaluateProcurementSpecialist(orders, dtos, todayIso).find((x) => x.orderId === orderId)
    return a ?? null
  }
  return null
}

/**
 * Real AI worker run — backend LLM + tools. Falls back to null if unavailable.
 * @param {string} workerId
 * @param {WorkerTask} task
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} todayIso
 * @param {{ executeTools?: boolean }} [options]
 * @returns {Promise<AiWorkerRunResult | null>}
 */
export async function executeRealAiWorkerTask(
  workerId,
  task,
  orders,
  dtos,
  todayIso,
  options = {},
) {
  if (!canUseRealAiWorkers()) return null
  if (!isMemoryInfrastructureReady()) return null
  if (!EVALUATOR_BY_WORKER[workerId]) return null

  const orderId = task.relatedEntityId
  if (!orderId) return null

  const order = orders.find((o) => o.id === orderId)
  const dto = dtos.find((d) => d.id === orderId)
  const snap = order ? BusinessEngine.computeOrderSnapshot({ order, dto, todayIso }) : undefined
  const ruleBaseline = buildRuleBaselineForWorker(workerId, orderId, orders, dtos, todayIso)

  /** @type {AiWorkerRunPayload} */
  const payload = {
    orderId,
    taskId: task.id,
    taskTitle: task.title,
    businessSnapshot: snap,
    orderContext: order
      ? {
          customer: order.customer,
          phone: order.phone,
          product: order.product,
          status: order.status,
        }
      : undefined,
    ruleBaseline: ruleBaseline ?? undefined,
  }

  return runAiWorkerTaskRemote(workerId, payload, {
    executeTools: options.executeTools ?? true,
  })
}
