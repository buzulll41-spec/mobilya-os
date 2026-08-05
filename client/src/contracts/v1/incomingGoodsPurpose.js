export const INCOMING_GOODS_PURPOSE = {
  CUSTOMER_ORDER: 'CUSTOMER_ORDER',
  STOCK: 'STOCK',
  DISPLAY: 'DISPLAY',
}

/** @type {Record<string, string>} */
export const INCOMING_GOODS_PURPOSE_LABEL = {
  [INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER]: 'Müşteri siparişi',
  [INCOMING_GOODS_PURPOSE.STOCK]: 'Stok',
  [INCOMING_GOODS_PURPOSE.DISPLAY]: 'Teşhir',
}

/**
 * @param {string} purpose
 */
export function incomingGoodsPurposeLabel(purpose) {
  return INCOMING_GOODS_PURPOSE_LABEL[purpose] ?? purpose
}
