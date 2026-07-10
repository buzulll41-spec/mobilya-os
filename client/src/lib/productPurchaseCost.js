export function roundPurchaseMoney(n) {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

/**
 * Net alış = toptan fiyat × (1 - iskonto/100)
 * @param {number} wholesalePrice
 * @param {number} discountRatePercent
 */
export function computeNetPurchasePrice(wholesalePrice, discountRatePercent) {
  const wholesale = Math.max(0, wholesalePrice)
  const rate = Math.max(0, Math.min(100, discountRatePercent))
  return roundPurchaseMoney(wholesale * (1 - rate / 100))
}

/**
 * @param {{ wholesalePrice?: number, wholesaleDiscountRate?: number, costPrice?: number }} input
 */
export function resolveProductPurchaseCost(input) {
  const hasWholesale =
    typeof input.wholesalePrice === 'number' &&
    Number.isFinite(input.wholesalePrice) &&
    input.wholesalePrice > 0

  if (hasWholesale) {
    const wholesalePrice = roundPurchaseMoney(input.wholesalePrice)
    const wholesaleDiscountRate =
      typeof input.wholesaleDiscountRate === 'number' &&
      Number.isFinite(input.wholesaleDiscountRate)
        ? roundPurchaseMoney(input.wholesaleDiscountRate)
        : 0
    return {
      wholesalePrice,
      wholesaleDiscountRate,
      netPurchasePrice: computeNetPurchasePrice(wholesalePrice, wholesaleDiscountRate),
    }
  }

  const net =
    typeof input.costPrice === 'number' && Number.isFinite(input.costPrice)
      ? roundPurchaseMoney(Math.max(0, input.costPrice))
      : 0

  return {
    wholesalePrice: net,
    wholesaleDiscountRate: 0,
    netPurchasePrice: net,
  }
}
