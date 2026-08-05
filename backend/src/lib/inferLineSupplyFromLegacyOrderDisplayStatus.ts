import {
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
  computeWarehouseEntryStatusFromQty,
} from '../constants/supplyOrderStatus.js'

export type InferredLineSupplyState = {
  supplyStatus: string
  warehouseEntryStatus: string
}

/**
 * Pilot / legacy sipariş displayStatus → satır tedarik/depo durumu.
 * Mock: client/src/services/mockOrderLineBootstrap.js
 */
export function inferLineSupplyFromLegacyOrderDisplayStatus(
  displayStatus: string,
): InferredLineSupplyState {
  if (displayStatus === 'Teslim Edildi') {
    return {
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
    }
  }
  if (displayStatus === 'Geldi' || displayStatus === 'Hazır' || displayStatus === 'Sevke Hazır') {
    return {
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
    }
  }
  if (
    displayStatus === 'Üretimde' ||
    displayStatus === 'Eksik Var' ||
    displayStatus === 'Bekleniyor' ||
    displayStatus === 'Kısmi Geldi'
  ) {
    return {
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
    }
  }
  return {
    supplyStatus: SUPPLY_STATUS.NOT_SENT,
    warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
  }
}

export function inferWarehouseEntryStatusFromQty(
  supplyStatus: string,
  qtyOrdered: number,
  qtyReceived: number,
): string {
  return computeWarehouseEntryStatusFromQty(qtyOrdered, qtyReceived, supplyStatus)
}
