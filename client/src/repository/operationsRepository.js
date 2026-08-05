import { loadLiveDataSnapshot } from '../application/live/liveDataPipeline.js'
import {
  executeCreateOrderFlow,
  executeRollbackOrdersState,
  executeUpdateOrderFlow,
} from '../application/orderMutationOrchestration.js'
import {
  executePatchTerminFlow,
  executePatchMissingItemStatusFlow,
  executePatchShipmentStatusFlow,
  executePostMissingItemFlow,
  executePostOrderShipmentFlow,
  executePostPaymentFlow,
  executeMarkMissingItemReadyForShipmentFlow,
} from '../application/orderOperationsOrchestration.js'

/**
 * UI -> ViewModel -> Service -> Repository -> API/Cache/Mock standardında
 * operasyon ekranlarının tek giriş noktası.
 */
export const operationsRepository = {
  /** @param {{ includeDomainEvents?: boolean }} [options] */
  async loadSnapshot(options) {
    return loadLiveDataSnapshot(options)
  },

  async rollbackState() {
    return executeRollbackOrdersState()
  },

  /** @param {Omit<import('../data/seedOrders.js').Order, 'id' | 'orderDate'> | import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} draft */
  async createOrder(draft) {
    return executeCreateOrderFlow(draft)
  },

  /** @param {string} id @param {Partial<import('../data/seedOrders.js').Order>} patch */
  async updateOrder(id, patch) {
    return executeUpdateOrderFlow(id, patch)
  },

  /** @param {string} orderId @param {{ amount: number, method: string, note?: string }} body */
  async postOrderPayment(orderId, body) {
    return executePostPaymentFlow(orderId, body)
  },

  /** @param {string} orderId @param {{ committedShipBy: string, reason: string }} body */
  async patchOrderTermin(orderId, body) {
    return executePatchTerminFlow(orderId, body)
  },

  /** @param {string} orderId @param {{ title: string, quantity: number, reason: string, supplierNote?: string }} body */
  async postOrderMissingItem(orderId, body) {
    return executePostMissingItemFlow(orderId, body)
  },

  /** @param {string} orderId @param {string} missingItemId @param {{ status: string, supplierNote?: string, resolutionNote?: string }} body */
  async patchMissingItemStatus(orderId, missingItemId, body) {
    return executePatchMissingItemStatusFlow(orderId, missingItemId, body)
  },

  /** @param {string} orderId @param {string} missingItemId @param {{ note?: string }} [body] */
  async markMissingItemReadyForShipment(orderId, missingItemId, body = {}) {
    return executeMarkMissingItemReadyForShipmentFlow(orderId, missingItemId, body)
  },

  /** @param {string} orderId @param {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string }} body */
  async postOrderShipment(orderId, body) {
    return executePostOrderShipmentFlow(orderId, body)
  },

  /** @param {string} orderId @param {string} shipmentId @param {{ status: string, issueNote?: string }} body */
  async patchShipmentStatus(orderId, shipmentId, body) {
    return executePatchShipmentStatusFlow(orderId, shipmentId, body)
  },
}
