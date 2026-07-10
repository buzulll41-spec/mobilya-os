export const PRODUCT_STOCK_TYPE = {
  ORDER: 'ORDER',
  STOCK: 'STOCK',
  DISPLAY: 'DISPLAY',
} as const

export type ProductStockType = (typeof PRODUCT_STOCK_TYPE)[keyof typeof PRODUCT_STOCK_TYPE]

const STOCK_TYPES = new Set<string>(Object.values(PRODUCT_STOCK_TYPE))

export function isProductStockType(v: string): v is ProductStockType {
  return STOCK_TYPES.has(v)
}

export function productStockTypeLabelTr(type: ProductStockType): string {
  switch (type) {
    case PRODUCT_STOCK_TYPE.ORDER:
      return 'Sipariş'
    case PRODUCT_STOCK_TYPE.STOCK:
      return 'Stok'
    case PRODUCT_STOCK_TYPE.DISPLAY:
      return 'Teşhir'
    default:
      return type
  }
}
