export const SALES_SOURCE_TYPE = {
  IN_STORE_DISPLAY: 'IN_STORE_DISPLAY',
  EXTERNAL_SUPPLY: 'EXTERNAL_SUPPLY',
  STOCK_ITEM: 'STOCK_ITEM',
  UNKNOWN: 'UNKNOWN',
} as const

export type SalesSourceType = (typeof SALES_SOURCE_TYPE)[keyof typeof SALES_SOURCE_TYPE]

const SALES_SOURCE_TYPES = new Set<string>(Object.values(SALES_SOURCE_TYPE))

export function isSalesSourceType(v: string): v is SalesSourceType {
  return SALES_SOURCE_TYPES.has(v)
}

/** Ürün oluşturma/düzenlemede seçilebilir somut kaynaklar (UNKNOWN hariç). */
export function isCreatableSalesSourceType(v: string): v is Exclude<SalesSourceType, 'UNKNOWN'> {
  return (
    v === SALES_SOURCE_TYPE.IN_STORE_DISPLAY ||
    v === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY ||
    v === SALES_SOURCE_TYPE.STOCK_ITEM
  )
}

export function salesSourceTypeLabelTr(type: SalesSourceType): string {
  switch (type) {
    case SALES_SOURCE_TYPE.IN_STORE_DISPLAY:
      return 'Mağaza Sergi Ürünü'
    case SALES_SOURCE_TYPE.EXTERNAL_SUPPLY:
      return 'Dış Tedarik Ürünü'
    case SALES_SOURCE_TYPE.STOCK_ITEM:
      return 'Stok Ürünü'
    case SALES_SOURCE_TYPE.UNKNOWN:
      return 'Bilinmeyen'
    default:
      return type
  }
}
