export const STOCK_STATUS = {
  IN_STOCK: 'IN_STOCK',
  RESERVED: 'RESERVED',
  CUSTOMER_HOLD: 'CUSTOMER_HOLD',
  READY_TO_SHIP: 'READY_TO_SHIP',
  MISSING_PART: 'MISSING_PART',
  SHIPPED: 'SHIPPED',
} as const

export type StockStatus = (typeof STOCK_STATUS)[keyof typeof STOCK_STATUS]

const STOCK_STATUSES = new Set<string>(Object.values(STOCK_STATUS))

export function isStockStatus(v: string): v is StockStatus {
  return STOCK_STATUSES.has(v)
}

export function stockStatusLabelTr(status: StockStatus): string {
  switch (status) {
    case STOCK_STATUS.IN_STOCK:
      return 'Stokta'
    case STOCK_STATUS.RESERVED:
      return 'Rezerve Edildi'
    case STOCK_STATUS.CUSTOMER_HOLD:
      return 'Müşteri Ürünü Bekliyor'
    case STOCK_STATUS.READY_TO_SHIP:
      return 'Sevke Hazır'
    case STOCK_STATUS.MISSING_PART:
      return 'Eksik / Parça Bekliyor'
    case STOCK_STATUS.SHIPPED:
      return 'Sevk Edildi'
    default:
      return status
  }
}
