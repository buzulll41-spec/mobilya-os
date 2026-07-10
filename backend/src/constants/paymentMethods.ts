export const PAYMENT_METHOD = {
  CASH: 'CASH',
  CARD: 'CARD',
  TRANSFER: 'TRANSFER',
  CHECK: 'CHECK',
  MAIL_ORDER: 'MAIL_ORDER',
  OTHER: 'OTHER',
} as const

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD]

const ALLOWED = new Set<string>(Object.values(PAYMENT_METHOD))

export function isPaymentMethod(value: string): value is PaymentMethod {
  return ALLOWED.has(value)
}
