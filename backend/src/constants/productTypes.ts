export const PRODUCT_TYPE = {
  SIMPLE: 'SIMPLE',
  VARIABLE: 'VARIABLE',
  SET: 'SET',
} as const

export type ProductType = (typeof PRODUCT_TYPE)[keyof typeof PRODUCT_TYPE]

const PRODUCT_TYPES = new Set<string>(Object.values(PRODUCT_TYPE))

export function isProductType(v: string): v is ProductType {
  return PRODUCT_TYPES.has(v)
}

export function productTypeLabelTr(type: ProductType): string {
  switch (type) {
    case PRODUCT_TYPE.SIMPLE:
      return 'Basit'
    case PRODUCT_TYPE.VARIABLE:
      return 'Varyantlı'
    case PRODUCT_TYPE.SET:
      return 'Takım / Set'
    default:
      return type
  }
}
