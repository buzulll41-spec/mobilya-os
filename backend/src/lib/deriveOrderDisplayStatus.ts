import { WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import {
  orderQualifiesForAutoShipmentReady,
  type AutoShipmentReadyContext,
} from './autoShipmentReady.js'

export const ORDER_FULFILLMENT_DISPLAY_STATUS = {
  WAITING: 'Bekleniyor',
  CANCELED: 'İptal',
  PARTIAL_ARRIVED: 'Kısmi Geldi',
  ARRIVED: 'Geldi',
  SHIPMENT_READY: 'Sevke Hazır',
  DELIVERED: 'Teslim Edildi',
} as const

export type OrderLineDisplayStatusInput = {
  warehouseEntryStatus: string
  shipmentReady: boolean
}

export function isLineWarehouseArrived(line: OrderLineDisplayStatusInput): boolean {
  return line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED
}

function isLineWarehouseInProgress(line: OrderLineDisplayStatusInput): boolean {
  return (
    line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED ||
    line.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED
  )
}

/**
 * Sipariş durumunu ürün satırlarının depo girişi / sevke hazır durumundan türetir.
 */
export function deriveOrderDisplayStatusFromLines(
  lines: OrderLineDisplayStatusInput[],
  storedDisplayStatus?: string | null,
  autoReadyContext?: AutoShipmentReadyContext,
): string {
  if (storedDisplayStatus === ORDER_FULFILLMENT_DISPLAY_STATUS.CANCELED) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.CANCELED
  }

  if (storedDisplayStatus === ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED
  }

  if (!lines.length) {
    return storedDisplayStatus ?? ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING
  }

  const arrivedCount = lines.filter(isLineWarehouseArrived).length
  const inProgressCount = lines.filter(isLineWarehouseInProgress).length
  const total = lines.length

  if (inProgressCount === 0) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING
  }

  if (arrivedCount < total) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED
  }

  if (orderQualifiesForAutoShipmentReady(lines, autoReadyContext)) {
    return ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY
  }

  return ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED
}

export function fulfillmentProgressFromDerivedDisplayStatus(status: string): number {
  switch (status) {
    case ORDER_FULFILLMENT_DISPLAY_STATUS.DELIVERED:
      return 1
    case ORDER_FULFILLMENT_DISPLAY_STATUS.SHIPMENT_READY:
      return 0.85
    case ORDER_FULFILLMENT_DISPLAY_STATUS.ARRIVED:
      return 0.7
    case ORDER_FULFILLMENT_DISPLAY_STATUS.PARTIAL_ARRIVED:
      return 0.5
    case ORDER_FULFILLMENT_DISPLAY_STATUS.WAITING:
      return 0.15
    default:
      return 0.2
  }
}
