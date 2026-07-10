/**
 * @param {{
 *   category?: string | null
 *   mainImageUrl?: string | null
 *   seoTitle?: string | null
 *   shortDescription?: string | null
 *   longDescription?: string | null
 *   salePrice?: number | null
 *   productType?: string | null
 *   activeVariantCount?: number
 * }} input
 * @returns {{ status: 'READY' | 'NOT_READY', missingLabels: string[], checks: Record<string, boolean> }}
 */
export function calculateWooReadiness(input) {
  const hasCategory = Boolean(input.category?.trim())
  const hasHeroImage = Boolean(input.mainImageUrl?.trim())
  const hasSeoTitle = Boolean(input.seoTitle?.trim())
  const hasDescription = Boolean(
    input.shortDescription?.trim() && input.longDescription?.trim(),
  )
  const hasPrice =
    input.salePrice != null && Number.isFinite(input.salePrice) && input.salePrice > 0
  const needsVariants = input.productType === 'VARIABLE'
  const hasVariants = needsVariants ? (input.activeVariantCount ?? 0) > 0 : true

  const checks = {
    hasCategory,
    hasHeroImage,
    hasSeoTitle,
    hasDescription,
    hasPrice,
    hasVariants,
  }

  const missingLabels = []
  if (!hasCategory) missingLabels.push('Kategori')
  if (!hasHeroImage) missingLabels.push('Hero görsel')
  if (!hasSeoTitle) missingLabels.push('SEO başlık')
  if (!hasDescription) missingLabels.push('Açıklama')
  if (!hasPrice) missingLabels.push('Fiyat')
  if (!hasVariants) missingLabels.push('Varyant')

  return {
    status: missingLabels.length === 0 ? 'READY' : 'NOT_READY',
    checks,
    missingLabels,
  }
}

export const WOO_STATUS_LABELS = {
  NOT_READY: 'Hazır değil',
  READY: 'Woo hazır',
  SYNC_PENDING: 'Sync bekliyor',
  SYNCED: 'Senkronize',
  ERROR: 'Woo hatası',
}

/**
 * @param {'NOT_READY' | 'READY' | 'SYNC_PENDING' | 'SYNCED' | 'ERROR'} status
 */
export function wooStatusToneClass(status) {
  if (status === 'READY' || status === 'SYNCED') return 'mos-pmc-woo--success'
  if (status === 'SYNC_PENDING') return 'mos-pmc-woo--warning'
  if (status === 'ERROR') return 'mos-pmc-woo--critical'
  return 'mos-pmc-woo--neutral'
}
