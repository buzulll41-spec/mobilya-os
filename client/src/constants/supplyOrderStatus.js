export const SUPPLY_STATUS = /** @type {const} */ ({
  NOT_SENT: 'NOT_SENT',
  SENT: 'SENT',
})

export const SUPPLY_CHANNEL = /** @type {const} */ ({
  MAIL: 'MAIL',
  WHATSAPP: 'WHATSAPP',
})

export const WAREHOUSE_ENTRY_STATUS = /** @type {const} */ ({
  NOT_SENT: 'NOT_SENT',
  WAITING: 'WAITING',
  ARRIVED: 'ARRIVED',
  PARTIAL_ARRIVED: 'PARTIAL_ARRIVED',
})

/**
 * @param {string} status
 */
export function supplyStatusLabelTr(status) {
  return status === SUPPLY_STATUS.SENT ? 'Verildi' : 'Verilmedi'
}

/**
 * @param {string} status
 */
export function warehouseEntryStatusLabelTr(status) {
  switch (status) {
    case WAREHOUSE_ENTRY_STATUS.WAITING:
      return 'Bekleniyor'
    case WAREHOUSE_ENTRY_STATUS.ARRIVED:
      return 'Geldi'
    case WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED:
      return 'Eksik Geldi'
    default:
      return 'Verilmedi'
  }
}

/**
 * @param {number} ordered
 * @param {number} received
 * @param {string} supplyStatus
 */
export function computeWarehouseEntryStatusFromQty(ordered, received, supplyStatus) {
  if (supplyStatus !== SUPPLY_STATUS.SENT) {
    return WAREHOUSE_ENTRY_STATUS.NOT_SENT
  }
  if (received <= 0.0001) {
    return WAREHOUSE_ENTRY_STATUS.WAITING
  }
  if (received >= ordered - 0.0001) {
    return WAREHOUSE_ENTRY_STATUS.ARRIVED
  }
  return WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED
}

/**
 * @param {string} status
 * @returns {'not-sent' | 'sent'}
 */
export function supplyStatusTone(status) {
  return status === SUPPLY_STATUS.SENT ? 'sent' : 'not-sent'
}

/**
 * @param {string} status
 * @returns {'not-sent' | 'waiting' | 'arrived' | 'partial'}
 */
export function warehouseEntryTone(status) {
  switch (status) {
    case WAREHOUSE_ENTRY_STATUS.WAITING:
      return 'waiting'
    case WAREHOUSE_ENTRY_STATUS.ARRIVED:
      return 'arrived'
    case WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED:
      return 'partial'
    default:
      return 'not-sent'
  }
}
