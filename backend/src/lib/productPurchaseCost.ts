export function roundPurchaseMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export function computeNetPurchasePrice(
  wholesalePrice: number,
  discountRatePercent: number,
): number {
  const wholesale = Math.max(0, wholesalePrice)
  const rate = Math.max(0, Math.min(100, discountRatePercent))
  return roundPurchaseMoney(wholesale * (1 - rate / 100))
}

export type ResolvedProductPurchaseCost = {
  wholesalePrice: number
  wholesaleDiscountRate: number
  netPurchasePrice: number
}

export function resolveProductPurchaseCost(input: {
  wholesalePrice?: number
  wholesaleDiscountRate?: number
  costPrice?: number
}): ResolvedProductPurchaseCost {
  const hasWholesale =
    typeof input.wholesalePrice === 'number' &&
    Number.isFinite(input.wholesalePrice) &&
    input.wholesalePrice > 0

  if (hasWholesale) {
    const wholesalePrice = roundPurchaseMoney(input.wholesalePrice!)
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
