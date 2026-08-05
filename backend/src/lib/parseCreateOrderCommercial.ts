import { AppHttpError } from '../errors/apiError.js'
import { PAYMENT_METHOD, isPaymentMethod } from '../constants/paymentMethods.js'
import type { NormalizedCreateOrderRequest } from '../contracts/createOrderRequest.js'

function optTrimmed(v: unknown, maxLen: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  if (!t || t.length > maxLen) return undefined
  return t
}

function parseCommission(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0 || n > 100) return Number.NaN
  return n
}

/**
 * POST /v1/orders — ticari ödeme alanları (normalize gövdeye eklenir).
 */
export function parseCreateOrderCommercialFields(
  o: Record<string, unknown>,
  normalized: Pick<NormalizedCreateOrderRequest, 'totalAmount' | 'paidAmount'>,
): Pick<
  NormalizedCreateOrderRequest,
  | 'paymentMethod'
  | 'paymentNote'
  | 'mailOrderCustomerId'
  | 'mailOrderSupplierId'
  | 'mailOrderCommissionRate'
> {
  const paymentMethodRaw = typeof o.paymentMethod === 'string' ? o.paymentMethod.trim().toUpperCase() : ''
  const paymentMethod = paymentMethodRaw && isPaymentMethod(paymentMethodRaw) ? paymentMethodRaw : undefined
  const paymentNote = optTrimmed(o.paymentNote, 2000)
  const mailOrderCustomerId = optTrimmed(o.mailOrderCustomerId, 200)
  const mailOrderSupplierId = optTrimmed(o.mailOrderSupplierId, 64)
  const commissionParsed = parseCommission(o.mailOrderCommissionRate)
  const mailOrderCommissionRate =
    commissionParsed !== undefined && !Number.isNaN(commissionParsed) ? commissionParsed : undefined

  const details: Record<string, string> = {}
  if (paymentMethodRaw && !paymentMethod) details.paymentMethod = 'Invalid payment method'
  if (o.mailOrderCommissionRate !== undefined && o.mailOrderCommissionRate !== null && o.mailOrderCommissionRate !== '') {
    if (commissionParsed === undefined || Number.isNaN(commissionParsed)) {
      details.mailOrderCommissionRate = 'Must be 0–100'
    }
  }

  if (paymentMethod === PAYMENT_METHOD.MAIL_ORDER) {
    if (!mailOrderCustomerId) details.mailOrderCustomerId = 'Required for mail order'
    if (!mailOrderSupplierId) details.mailOrderSupplierId = 'Required for mail order'
    if (normalized.paidAmount > normalized.totalAmount) {
      details.paidAmount = 'Mail order paidAmount cannot exceed totalAmount'
    }
    if (normalized.paidAmount <= 0) details.paidAmount = 'Mail order amount must be > 0'
  }

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return {
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(paymentNote ? { paymentNote } : {}),
    ...(mailOrderCustomerId ? { mailOrderCustomerId } : {}),
    ...(mailOrderSupplierId ? { mailOrderSupplierId } : {}),
    ...(mailOrderCommissionRate !== undefined ? { mailOrderCommissionRate } : {}),
  }
}
