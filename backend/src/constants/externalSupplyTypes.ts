export const EXTERNAL_SUPPLY_TYPE = {
  CATALOG: 'CATALOG',
  WEBSITE: 'WEBSITE',
  SUPPLIER_SPECIAL_ORDER: 'SUPPLIER_SPECIAL_ORDER',
  OTHER_STORE: 'OTHER_STORE',
  OTHER: 'OTHER',
} as const

export type ExternalSupplyType = (typeof EXTERNAL_SUPPLY_TYPE)[keyof typeof EXTERNAL_SUPPLY_TYPE]

const EXTERNAL_SUPPLY_TYPES = new Set<string>(Object.values(EXTERNAL_SUPPLY_TYPE))

export function isExternalSupplyType(v: string): v is ExternalSupplyType {
  return EXTERNAL_SUPPLY_TYPES.has(v)
}

export function externalSupplyTypeLabelTr(type: ExternalSupplyType): string {
  switch (type) {
    case EXTERNAL_SUPPLY_TYPE.CATALOG:
      return 'Katalog'
    case EXTERNAL_SUPPLY_TYPE.WEBSITE:
      return 'Web Sitesi'
    case EXTERNAL_SUPPLY_TYPE.SUPPLIER_SPECIAL_ORDER:
      return 'Tedarikçi Özel Sipariş'
    case EXTERNAL_SUPPLY_TYPE.OTHER_STORE:
      return 'Başka Mağaza'
    case EXTERNAL_SUPPLY_TYPE.OTHER:
      return 'Diğer'
    default:
      return type
  }
}
