/**
 * Mock/API parity referans senaryosu — aynı girdiler aynı ticari çıktıyı üretmeli.
 */
export const DISCOUNTED_PARTIAL_SCENARIO = {
  customerName: 'Parity E2E Müşteri',
  paidAmount: 5000,
  status: 'Üretimde',
  subtotalAmount: 20_000,
  discountPercent: 10,
  lines: [
    {
      title: 'Yemek masası',
      quantity: 1,
      unitPrice: 20_000,
      sortOrder: 0,
      productGroup: 'Yemek odası',
      configuration: { bodyFabric: 'Meşe', legColor: 'Siyah' },
    },
  ],
  expected: {
    subtotalAmount: 20_000,
    discountAmount: 2000,
    totalAmount: 18_000,
    paidAmount: 5000,
    remainingAmount: 13_000,
    lineTotal: 20_000,
  },
}

export const MAIL_ORDER_SCENARIO = {
  customerName: 'Mail Order Parity',
  paidAmount: 8000,
  status: 'Bekleniyor',
  lines: [{ title: 'Sandalye', quantity: 2, unitPrice: 4000, sortOrder: 0 }],
  paymentMethod: 'MAIL_ORDER',
  mailOrderCustomerId: 'Kart Sahibi',
  mailOrderCommissionRate: 1.5,
  expected: {
    subtotalAmount: 8000,
    totalAmount: 8000,
    paidAmount: 8000,
    remainingAmount: 0,
  },
}

/** @param {{ amount: string }} money */
export function parseMoney(money) {
  return Number.parseFloat(money?.amount ?? '0')
}
