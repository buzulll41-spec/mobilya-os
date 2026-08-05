import {
  buildCompanyPredictions,
  buildCustomerPredictions,
  buildOrderPredictions,
} from '../../engine/prediction/PredictionEngine.js'
import { buildKnowledgeGraphFromMock } from '../graph/KnowledgeGraphService.js'
import { customerNodeId } from '../../engine/graph/KnowledgeGraphEngine.js'
import { recordPredictionsForLearning } from '../learning/LearningEngineService.js'

/** @typedef {import('../../contracts/v1/prediction.js').OrderPredictionDto} OrderPredictionDto */
/** @typedef {import('../../contracts/v1/prediction.js').CustomerPredictionDto} CustomerPredictionDto */
/** @typedef {import('../../contracts/v1/prediction.js').CompanyPredictionDto} CompanyPredictionDto */

/** @type {Map<string, OrderPredictionDto> | null} */
let cachedOrderPreds = null
/** @type {CompanyPredictionDto | null} */
let cachedCompany = null

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
function ensurePredictions(runtimeCtx) {
  if (cachedOrderPreds && cachedCompany) return
  const graph = buildKnowledgeGraphFromMock(runtimeCtx)
  const orderPredictions = buildOrderPredictions({ ...runtimeCtx, graph })
  cachedOrderPreds = new Map(orderPredictions.map((p) => [p.orderId, p]))
  cachedCompany = buildCompanyPredictions({ ...runtimeCtx, graph })
  recordPredictionsForLearning(runtimeCtx)
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 * @param {string} orderId
 */
export function getOrderPredictionLocal(runtimeCtx, orderId) {
  ensurePredictions(runtimeCtx)
  return cachedOrderPreds?.get(orderId) ?? null
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 * @param {string} customerId
 */
export function getCustomerPredictionLocal(runtimeCtx, customerId) {
  ensurePredictions(runtimeCtx)
  if (!cachedCompany) return null
  const decoded = decodeURIComponent(customerId)
  const found = cachedCompany.riskyCustomers.find((c) => c.customerId === decoded)
  if (found) return found

  const graph = buildKnowledgeGraphFromMock(runtimeCtx)
  const orderPredictions = buildOrderPredictions({ ...runtimeCtx, graph })
  const customers = buildCustomerPredictions(runtimeCtx.orders, runtimeCtx.dtos, orderPredictions, runtimeCtx.todayIso)
  return customers.find((c) => c.customerId === decoded) ?? null
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getCompanyPredictionLocal(runtimeCtx) {
  ensurePredictions(runtimeCtx)
  return cachedCompany
}

/**
 * @param {string} orderId
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 * }} runtimeCtx
 */
export function getOrderPredictionScore(orderId, runtimeCtx) {
  return getOrderPredictionLocal(runtimeCtx, orderId)?.predictionScore ?? 0
}

/**
 * @param {import('../../data/seedOrders.js').Order} order
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 * }} runtimeCtx
 */
export function resolveCustomerIdForOrder(order, runtimeCtx) {
  return customerNodeId(order.customer, order.phone)
}

export function resetPredictionCacheForTests() {
  cachedOrderPreds = null
  cachedCompany = null
}

export {}
