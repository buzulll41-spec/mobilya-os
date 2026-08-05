import type { PaymentTransaction } from '@prisma/client'
import { decimalToNumber } from './money.js'

/**
 * POSTED CAPTURE toplamı (REFUND/CHARGEBACK düşülür).
 */
export function sumPostedCaptureAmount(transactions: Pick<PaymentTransaction, 'kind' | 'status' | 'amount'>[]): number {
  let sum = 0
  for (const tx of transactions) {
    if (tx.status !== 'POSTED') continue
    const v = decimalToNumber(tx.amount)
    if (tx.kind === 'CAPTURE' || tx.kind === 'MAIL_ORDER') sum += v
    else if (tx.kind === 'REFUND') sum -= v
    else if (tx.kind === 'ADJUSTMENT') sum += v
    else if (tx.kind === 'CHARGEBACK') sum -= v
  }
  return Math.max(0, sum)
}
