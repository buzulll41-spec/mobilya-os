import {
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
  computeWarehouseEntryStatusFromQty,
} from '../constants/supplyOrderStatus.js'
import { parseQty, PRODUCT_READINESS_STATUS } from '../mappers/receiving/productReadiness.js'
import { computeReceivePendingQty } from '../mappers/receiving/orderLineReceiveAction.js'

/** @typedef {'receive' | 'add' | 'done'} LineReceiveActionVariant */

/**
 * @typedef {Object} LineReceiveAction
 * @property {string} label
 * @property {boolean} disabled
 * @property {LineReceiveActionVariant} variant
 */

/**
 * Depo girişi durumu ve kalan adet birlikte değerlendirilir.
 *
 * @param {OrderLineSupplySnapshot} snapshot
 * @param {import('../contracts/v1/incomingGoods.js').OrderLineReceivingDto | null | undefined} [receivingLine]
 * @returns {LineReceiveAction}
 */
export function resolveProductRowReceiveAction(snapshot, receivingLine) {
  if (snapshot.supplyStatus !== SUPPLY_STATUS.SENT) {
    return { label: 'Tedarik bekleniyor', disabled: true, variant: 'done' }
  }

  if (snapshot.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED) {
    return { label: 'Tamamlandı', disabled: true, variant: 'done' }
  }

  if (!canReceiveToWarehouse(snapshot)) {
    return { label: '—', disabled: true, variant: 'done' }
  }

  const pendingFromOrder = computeReceivePendingQty(snapshot.qtyOrdered, snapshot.qtyReceived)
  const pendingFromReceiving = receivingLine ? parseQty(receivingLine.qtyPending) : pendingFromOrder
  const pending = receivingLine
    ? Math.min(pendingFromOrder, pendingFromReceiving)
    : pendingFromOrder

  if (pending <= 0.0001) {
    return { label: 'Tamamlandı', disabled: true, variant: 'done' }
  }

  if (
    receivingLine &&
    receivingLine.readinessStatus === PRODUCT_READINESS_STATUS.PARTIAL &&
    pendingFromReceiving > 0.0001
  ) {
    return { label: 'Gelen ekle', disabled: false, variant: 'add' }
  }

  return { label: 'Depoya geldi işaretle', disabled: false, variant: 'receive' }
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 * @param {import('../contracts/v1/incomingGoods.js').OrderLineReceivingDto | null | undefined} [receivingLine]
 */
export function resolveProductRowActionFlags(snapshot, receivingLine) {
  const receive = resolveProductRowReceiveAction(snapshot, receivingLine)
  return {
    receive,
    showReceive: !receive.disabled,
    showRevertArrival: canRevertWarehouseArrival(snapshot),
    showMarkReady: false,
    showRevertReady: false,
    showRevertSupply: canRevertSupplySent(snapshot),
  }
}

/**
 * @typedef {Object} OrderLineSupplySnapshot
 * @property {string} supplyStatus
 * @property {string} warehouseEntryStatus
 * @property {number} qtyOrdered
 * @property {number} qtyReceived
 * @property {boolean} shipmentReady
 */

/**
 * @param {OrderLineSupplySnapshot} snapshot
 * @param {boolean} [orderAutoReadyQualified]
 */
export function resolveEffectiveShipmentReady(snapshot, orderAutoReadyQualified = false) {
  if (snapshot.supplyStatus !== SUPPLY_STATUS.SENT) return false
  if (snapshot.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED) return false
  return orderAutoReadyQualified
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 */
export function detectOrderLineStateInconsistency(snapshot) {
  const { supplyStatus, warehouseEntryStatus, shipmentReady } = snapshot

  if (
    supplyStatus !== SUPPLY_STATUS.SENT &&
    warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED
  ) {
    return true
  }

  if (supplyStatus !== SUPPLY_STATUS.SENT && shipmentReady) {
    return true
  }

  if (warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.WAITING && shipmentReady) {
    return true
  }

  if (warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.NOT_SENT && shipmentReady) {
    return true
  }

  return false
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 * @param {boolean} [orderAutoReadyQualified]
 */
export function resolveStageLabelFromSupplyState(snapshot, orderAutoReadyQualified = false) {
  if (detectOrderLineStateInconsistency(snapshot)) return 'Tutarsız'
  if (resolveEffectiveShipmentReady(snapshot, orderAutoReadyQualified)) return 'Sevke hazır'
  if (snapshot.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED) return 'Depoda'
  if (snapshot.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED) return 'Eksik geldi'
  if (snapshot.supplyStatus === SUPPLY_STATUS.SENT) return 'Tedarik verildi'
  return 'Bekleniyor'
}

/**
 * @param {OrderLineSupplySnapshot} _snapshot
 */
export function canMarkShipmentReady(_snapshot) {
  return false
}

/**
 * @param {OrderLineSupplySnapshot} _snapshot
 */
export function canRevertShipmentReady(_snapshot) {
  return false
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 */
export function canRevertSupplySent(snapshot) {
  return (
    snapshot.supplyStatus === SUPPLY_STATUS.SENT &&
    snapshot.qtyReceived <= 0.0001 &&
    snapshot.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED
  )
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 */
export function canRevertWarehouseArrival(snapshot) {
  return (
    snapshot.supplyStatus === SUPPLY_STATUS.SENT &&
    snapshot.qtyReceived > 0.0001 &&
    snapshot.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED
  )
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 */
export function canReceiveToWarehouse(snapshot) {
  return (
    snapshot.supplyStatus === SUPPLY_STATUS.SENT &&
    snapshot.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED
  )
}

/**
 * @param {import('../services/ordersClient.js').OrderLineDetailDto} line
 * @param {number} qtyOrdered
 * @param {number} qtyReceived
 */
export function buildLineSupplySnapshot(line, qtyOrdered, qtyReceived) {
  const supplyStatus = line.supplyStatus ?? SUPPLY_STATUS.NOT_SENT
  const warehouseEntryStatus =
    line.warehouseEntryStatus ??
    computeWarehouseEntryStatusFromQty(qtyOrdered, qtyReceived, supplyStatus)

  return {
    supplyStatus,
    warehouseEntryStatus,
    qtyOrdered,
    qtyReceived,
    shipmentReady: Boolean(line.shipmentReady),
  }
}

/**
 * @param {OrderLineSupplySnapshot} snapshot
 * @param {boolean} [orderAutoReadyQualified]
 */
export function isLineReadyForShipmentPlan(snapshot, orderAutoReadyQualified = false) {
  return (
    snapshot.supplyStatus === SUPPLY_STATUS.SENT &&
    snapshot.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED &&
    resolveEffectiveShipmentReady(snapshot, orderAutoReadyQualified)
  )
}
