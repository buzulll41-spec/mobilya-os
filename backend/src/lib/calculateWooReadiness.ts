import type { ProductType } from '../constants/productTypes.js'

export type WooReadinessStatus = 'READY' | 'NOT_READY'

export type WooReadinessChecks = {
  hasCategory: boolean
  hasHeroImage: boolean
  hasSeoTitle: boolean
  hasDescription: boolean
  hasPrice: boolean
  hasVariants: boolean
}

export type WooReadinessResult = {
  status: WooReadinessStatus
  checks: WooReadinessChecks
  missingLabels: string[]
}

export function calculateWooReadiness(input: {
  category?: string | null
  mainImageUrl?: string | null
  seoTitle?: string | null
  shortDescription?: string | null
  longDescription?: string | null
  salePrice?: number | null
  productType?: ProductType | string | null
  activeVariantCount?: number
}): WooReadinessResult {
  const hasCategory = Boolean(input.category?.trim())
  const hasHeroImage = Boolean(input.mainImageUrl?.trim())
  const hasSeoTitle = Boolean(input.seoTitle?.trim())
  const hasDescription = Boolean(
    input.shortDescription?.trim() && input.longDescription?.trim(),
  )
  const hasPrice = input.salePrice != null && Number.isFinite(input.salePrice) && input.salePrice > 0
  const needsVariants = input.productType === 'VARIABLE'
  const hasVariants = needsVariants ? (input.activeVariantCount ?? 0) > 0 : true

  const checks: WooReadinessChecks = {
    hasCategory,
    hasHeroImage,
    hasSeoTitle,
    hasDescription,
    hasPrice,
    hasVariants,
  }

  const missingLabels: string[] = []
  if (!hasCategory) missingLabels.push('Kategori')
  if (!hasHeroImage) missingLabels.push('Hero görsel')
  if (!hasSeoTitle) missingLabels.push('SEO başlık')
  if (!hasDescription) missingLabels.push('Açıklama')
  if (!hasPrice) missingLabels.push('Fiyat')
  if (!hasVariants) missingLabels.push('Varyant')

  const status: WooReadinessStatus =
    missingLabels.length === 0 ? 'READY' : 'NOT_READY'

  return { status, checks, missingLabels }
}
