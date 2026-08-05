/**
 * Sipariş satırı + katalog ürünü → gelen ürün / hızlı giriş önerileri.
 *
 * @param {{
 *   productId?: string | null
 *   defaultSupplierId?: string | null
 *   purchasePrice?: string | null
 * }} [product]
 * @returns {{
 *   productId?: string
 *   defaultSupplierId?: string | null
 *   suggestedPurchasePrice?: string | null
 * }}
 */
export function catalogHintsFromProduct(product) {
  if (!product?.productId) return {}
  const price = product.purchasePrice != null ? String(product.purchasePrice).trim() : ''
  return {
    productId: product.productId,
    defaultSupplierId: product.defaultSupplierId ?? null,
    suggestedPurchasePrice: price || null,
  }
}

/**
 * @param {Record<string, unknown>} base
 * @param {ReturnType<typeof catalogHintsFromProduct>} hints
 */
export function mergeReceivingDtoHints(base, hints) {
  return {
    ...base,
    ...(hints.productId ? { productId: hints.productId } : {}),
    ...(hints.defaultSupplierId != null ? { defaultSupplierId: hints.defaultSupplierId } : {}),
    ...(hints.suggestedPurchasePrice != null
      ? { suggestedPurchasePrice: hints.suggestedPurchasePrice }
      : {}),
  }
}
