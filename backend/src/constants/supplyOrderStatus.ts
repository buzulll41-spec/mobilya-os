export const SUPPLY_STATUS = {
  NOT_SENT: 'NOT_SENT',
  SENT: 'SENT',
} as const

export type SupplyStatus = (typeof SUPPLY_STATUS)[keyof typeof SUPPLY_STATUS]

export const SUPPLY_CHANNEL = {
  MAIL: 'MAIL',
  WHATSAPP: 'WHATSAPP',
} as const

export type SupplyChannel = (typeof SUPPLY_CHANNEL)[keyof typeof SUPPLY_CHANNEL]

export const WAREHOUSE_ENTRY_STATUS = {
  NOT_SENT: 'NOT_SENT',
  WAITING: 'WAITING',
  ARRIVED: 'ARRIVED',
  PARTIAL_ARRIVED: 'PARTIAL_ARRIVED',
} as const

export type WarehouseEntryStatus =
  (typeof WAREHOUSE_ENTRY_STATUS)[keyof typeof WAREHOUSE_ENTRY_STATUS]

export function isSupplyChannel(value: string): value is SupplyChannel {
  return value === SUPPLY_CHANNEL.MAIL || value === SUPPLY_CHANNEL.WHATSAPP
}

export function supplyStatusLabelTr(status: string): string {
  if (status === SUPPLY_STATUS.SENT) return 'Verildi'
  return 'Verilmedi'
}

export function supplyChannelLabelTr(channel: string | null | undefined): string {
  if (channel === SUPPLY_CHANNEL.MAIL) return 'E-Posta'
  if (channel === SUPPLY_CHANNEL.WHATSAPP) return 'WhatsApp'
  return '—'
}

export function warehouseEntryStatusLabelTr(status: string): string {
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

export function computeWarehouseEntryStatusFromQty(
  ordered: number,
  received: number,
  supplyStatus: string,
): WarehouseEntryStatus {
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
