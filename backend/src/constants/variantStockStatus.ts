export const VARIANT_STOCK_STATUS = {
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  ON_ORDER: 'ON_ORDER',
  LOW_STOCK: 'LOW_STOCK',
} as const

export type VariantStockStatus = (typeof VARIANT_STOCK_STATUS)[keyof typeof VARIANT_STOCK_STATUS]

const STATUSES = new Set<string>(Object.values(VARIANT_STOCK_STATUS))

export function isVariantStockStatus(v: string): v is VariantStockStatus {
  return STATUSES.has(v)
}

export function variantStockStatusLabelTr(status: VariantStockStatus): string {
  switch (status) {
    case VARIANT_STOCK_STATUS.IN_STOCK:
      return 'Stokta'
    case VARIANT_STOCK_STATUS.OUT_OF_STOCK:
      return 'Stok yok'
    case VARIANT_STOCK_STATUS.ON_ORDER:
      return 'Sipariş üzerine'
    case VARIANT_STOCK_STATUS.LOW_STOCK:
      return 'Düşük stok'
    default:
      return status
  }
}
