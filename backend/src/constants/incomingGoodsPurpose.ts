export const INCOMING_GOODS_PURPOSE = {
  CUSTOMER_ORDER: 'CUSTOMER_ORDER',
  STOCK: 'STOCK',
  DISPLAY: 'DISPLAY',
} as const

export type IncomingGoodsPurpose = (typeof INCOMING_GOODS_PURPOSE)[keyof typeof INCOMING_GOODS_PURPOSE]

const ALLOWED = new Set<string>(Object.values(INCOMING_GOODS_PURPOSE))

export function isIncomingGoodsPurpose(value: string): value is IncomingGoodsPurpose {
  return ALLOWED.has(value)
}

export function incomingGoodsPurposeLabel(purpose: string): string {
  switch (purpose) {
    case INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER:
      return 'Müşteri siparişi'
    case INCOMING_GOODS_PURPOSE.STOCK:
      return 'Stok'
    case INCOMING_GOODS_PURPOSE.DISPLAY:
      return 'Teşhir'
    default:
      return purpose
  }
}
