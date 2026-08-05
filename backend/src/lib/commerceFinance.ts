import { DISCOUNT_TYPE, type DiscountType } from '../constants/discountTypes.js'
import { roundMoney } from './orderLineCreate.js'

export { roundMoney }

export type CommerceLineInput = {
  quantity: number
  unitPrice: number
  lineTotal?: number
}

export type DiscountInput = {
  discountType?: DiscountType | string
  discountPercent?: number
  discountFixedAmount?: number
  discountAmount?: number
  discountNote?: string
}

export type ResolvedCommerceTotals = {
  subtotalAmount: number
  discountAmount: number
  discountType: DiscountType
  discountPercent: number | null
  discountFixedAmount: number | null
  discountNote: string | null
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  isFullyPaid: boolean
}

export function computeLineTotal(quantity: number, unitPrice: number): number {
  const qty = quantity > 0 ? quantity : 0
  const unit = roundMoney(unitPrice)
  return roundMoney(qty * unit)
}

export function computeSubtotalFromLineTotals(lineTotals: number[]): number {
  return roundMoney(lineTotals.reduce((s, n) => s + roundMoney(n), 0))
}

/**
 * İskonto — yüzde + sabit TL birlikte (COMBINED) veya tek tip.
 */
export function resolveDiscountAmount(
  subtotalAmount: number,
  input: DiscountInput,
): {
  discountAmount: number
  discountType: DiscountType
  discountPercent: number | null
  discountFixedAmount: number | null
} {
  const subtotal = roundMoney(subtotalAmount)
  if (subtotal <= 0) {
    return {
      discountAmount: 0,
      discountType: DISCOUNT_TYPE.NONE,
      discountPercent: null,
      discountFixedAmount: null,
    }
  }

  const explicit =
    typeof input.discountAmount === 'number' && Number.isFinite(input.discountAmount)
      ? roundMoney(Math.max(0, input.discountAmount))
      : null

  const pctRaw =
    typeof input.discountPercent === 'number' && Number.isFinite(input.discountPercent)
      ? Math.min(100, Math.max(0, input.discountPercent))
      : 0
  const fixedRaw =
    typeof input.discountFixedAmount === 'number' && Number.isFinite(input.discountFixedAmount)
      ? roundMoney(Math.max(0, input.discountFixedAmount))
      : 0

  let percentageDiscount = pctRaw > 0 ? roundMoney(subtotal * (pctRaw / 100)) : 0
  let afterPercent = subtotal - percentageDiscount
  let fixedDiscount = fixedRaw > 0 ? Math.min(fixedRaw, afterPercent) : 0
  let computed = roundMoney(percentageDiscount + fixedDiscount)

  if (explicit != null) {
    computed = Math.min(explicit, subtotal)
    if (pctRaw > 0 && fixedRaw > 0) {
      return {
        discountAmount: computed,
        discountType: DISCOUNT_TYPE.COMBINED,
        discountPercent: pctRaw,
        discountFixedAmount: fixedDiscount,
      }
    }
    if (pctRaw > 0) {
      return {
        discountAmount: computed,
        discountType: DISCOUNT_TYPE.PERCENTAGE,
        discountPercent: pctRaw,
        discountFixedAmount: null,
      }
    }
    if (fixedRaw > 0) {
      return {
        discountAmount: computed,
        discountType: DISCOUNT_TYPE.FIXED,
        discountPercent: null,
        discountFixedAmount: fixedDiscount,
      }
    }
    const hinted = String(input.discountType ?? '').toUpperCase()
    const discountType =
      hinted === DISCOUNT_TYPE.PERCENTAGE
        ? DISCOUNT_TYPE.PERCENTAGE
        : hinted === DISCOUNT_TYPE.FIXED
          ? DISCOUNT_TYPE.FIXED
          : computed > 0
            ? DISCOUNT_TYPE.FIXED
            : DISCOUNT_TYPE.NONE
    return {
      discountAmount: computed,
      discountType,
      discountPercent: discountType === DISCOUNT_TYPE.PERCENTAGE ? pctRaw || null : null,
      discountFixedAmount: discountType === DISCOUNT_TYPE.FIXED ? computed : null,
    }
  }

  if (pctRaw > 0 && fixedRaw > 0) {
    return {
      discountAmount: computed,
      discountType: DISCOUNT_TYPE.COMBINED,
      discountPercent: pctRaw,
      discountFixedAmount: fixedDiscount,
    }
  }
  if (pctRaw > 0) {
    return {
      discountAmount: computed,
      discountType: DISCOUNT_TYPE.PERCENTAGE,
      discountPercent: pctRaw,
      discountFixedAmount: null,
    }
  }
  if (fixedRaw > 0) {
    return {
      discountAmount: computed,
      discountType: DISCOUNT_TYPE.FIXED,
      discountPercent: null,
      discountFixedAmount: fixedDiscount,
    }
  }

  return {
    discountAmount: 0,
    discountType: DISCOUNT_TYPE.NONE,
    discountPercent: null,
    discountFixedAmount: null,
  }
}

/**
 * subtotalAmount - discountAmount = totalAmount (tek doğruluk kaynağı).
 */
export function resolveCommerceTotals(input: {
  subtotalAmount: number
  paidAmount: number
  totalAmount?: number
} & DiscountInput): ResolvedCommerceTotals {
  const subtotalAmount = roundMoney(input.subtotalAmount)
  const paidAmount = roundMoney(Math.max(0, input.paidAmount))
  const discount = resolveDiscountAmount(subtotalAmount, input)
  const derivedTotal = roundMoney(Math.max(0, subtotalAmount - discount.discountAmount))

  let totalAmount = derivedTotal
  if (typeof input.totalAmount === 'number' && Number.isFinite(input.totalAmount)) {
    const asserted = roundMoney(input.totalAmount)
    if (Math.abs(asserted - derivedTotal) > 0.02) {
      throw new Error(
        `totalAmount (${asserted}) subtotal-discount (${derivedTotal}) ile uyumsuz`,
      )
    }
    totalAmount = asserted
  }

  if (paidAmount > totalAmount + 0.02) {
    throw new Error('paidAmount totalAmount değerini aşamaz')
  }

  const remainingAmount = roundMoney(Math.max(0, totalAmount - paidAmount))
  const isFullyPaid = totalAmount > 0 && remainingAmount <= 0.009

  return {
    subtotalAmount,
    discountAmount: discount.discountAmount,
    discountType: discount.discountType,
    discountPercent: discount.discountPercent,
    discountFixedAmount: discount.discountFixedAmount,
    discountNote: input.discountNote?.trim() || null,
    totalAmount,
    paidAmount,
    remainingAmount,
    isFullyPaid,
  }
}

export function remainingFromTotals(totalAmount: number, paidAmount: number, isFullyPaid: boolean): number {
  if (isFullyPaid) return 0
  return roundMoney(Math.max(0, roundMoney(totalAmount) - roundMoney(paidAmount)))
}
