import {
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
  computeWarehouseEntryStatusFromQty,
} from '../constants/supplyOrderStatus.js'

export type OrderLineSupplySnapshot = {
  supplyStatus: string
  warehouseEntryStatus: string
  qtyOrdered: number
  qtyReceived: number
  shipmentReady: boolean
}

export function resolveEffectiveShipmentReady(
  snapshot: OrderLineSupplySnapshot,
  orderAutoReadyQualified = false,
): boolean {
  if (snapshot.supplyStatus !== SUPPLY_STATUS.SENT) return false
  if (snapshot.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED) return false
  return orderAutoReadyQualified
}

export function detectOrderLineStateInconsistency(snapshot: OrderLineSupplySnapshot): boolean {
  const { supplyStatus, warehouseEntryStatus, shipmentReady } = snapshot

  // 1. Tedarik Verilmedi + Depo Geldi
  if (
    supplyStatus !== SUPPLY_STATUS.SENT &&
    warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED
  ) {
    return true
  }

  // 2. Tedarik Verilmedi + Sevke Hazır Evet
  if (supplyStatus !== SUPPLY_STATUS.SENT && shipmentReady) {
    return true
  }

  // 3. Depo Bekleniyor + Sevke Hazır Evet
  if (warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.WAITING && shipmentReady) {
    return true
  }

  // 4. Depo Verilmedi + Sevke Hazır Evet
  if (warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.NOT_SENT && shipmentReady) {
    return true
  }

  return false
}

export type OrderLineStateCorrection = {
  supplyStatus: string
  warehouseEntryStatus: string
  qtyReceived: number
  shipmentReady: boolean
  clearSupplyMetadata: boolean
}

export function buildOrderLineStateCorrection(
  snapshot: OrderLineSupplySnapshot,
): OrderLineStateCorrection {
  if (
    snapshot.supplyStatus !== SUPPLY_STATUS.SENT &&
    (snapshot.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED ||
      snapshot.shipmentReady ||
      snapshot.qtyReceived > 0.0001)
  ) {
    return {
      supplyStatus: SUPPLY_STATUS.NOT_SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
      qtyReceived: 0,
      shipmentReady: false,
      clearSupplyMetadata: true,
    }
  }

  if (
    snapshot.shipmentReady &&
    snapshot.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED
  ) {
    return {
      supplyStatus: snapshot.supplyStatus,
      warehouseEntryStatus: snapshot.warehouseEntryStatus,
      qtyReceived: snapshot.qtyReceived,
      shipmentReady: false,
      clearSupplyMetadata: false,
    }
  }

  const warehouseEntryStatus = computeWarehouseEntryStatusFromQty(
    snapshot.qtyOrdered,
    snapshot.qtyReceived,
    snapshot.supplyStatus,
  )
  const shipmentReady = false

  return {
    supplyStatus: snapshot.supplyStatus,
    warehouseEntryStatus,
    qtyReceived: snapshot.qtyReceived,
    shipmentReady,
    clearSupplyMetadata: false,
  }
}

export function canMarkShipmentReady(_snapshot: OrderLineSupplySnapshot): boolean {
  return false
}

export function canRevertShipmentReady(_snapshot: OrderLineSupplySnapshot): boolean {
  return false
}

export function canRevertSupplySent(snapshot: OrderLineSupplySnapshot): boolean {
  return (
    snapshot.supplyStatus === SUPPLY_STATUS.SENT &&
    snapshot.qtyReceived <= 0.0001 &&
    snapshot.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED
  )
}
