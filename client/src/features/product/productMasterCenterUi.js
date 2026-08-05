import { calculateProductHealth, productToHealthInput } from '../../lib/calculateProductHealth.js'

/** @typedef {import('../../lib/calculateProductHealth.js').ProductHealthResult} ProductHealthResult */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */

/** @typedef {'all' | 'published' | 'draft' | 'passive' | 'health-100' | 'health-80-plus' | 'health-50-79' | 'health-under-50' | 'missing-media' | 'missing-seo' | 'missing-variants' | 'woo-ready' | 'woo-not-ready' | 'woo-sync-pending' | 'woo-error'} ProductMasterQuickFilterId */

export const PRODUCT_MASTER_QUICK_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'published', label: 'Yayında' },
  { id: 'draft', label: 'Taslak' },
  { id: 'passive', label: 'Pasif' },
  { id: 'health-100', label: 'Sağlık 100' },
  { id: 'health-80-plus', label: 'Sağlık 80+' },
  { id: 'health-50-79', label: 'Sağlık 50-79' },
  { id: 'health-under-50', label: 'Sağlık <50' },
  { id: 'missing-media', label: 'Eksik Medya' },
  { id: 'missing-seo', label: 'Eksik SEO' },
  { id: 'missing-variants', label: 'Eksik Varyant' },
  { id: 'woo-ready', label: 'Woo Hazır' },
  { id: 'woo-not-ready', label: 'Woo Eksik' },
  { id: 'woo-sync-pending', label: 'Sync Bekliyor' },
  { id: 'woo-error', label: 'Woo Hatalı' },
])

/**
 * @param {ProductMasterCenterRowVm} product
 * @returns {ProductHealthResult}
 */
export function resolveProductHealthScore(product) {
  if (product.healthReport) return product.healthReport
  return calculateProductHealth(productToHealthInput(product))
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productHasMainImage(product) {
  const checks = resolveProductHealthScore(product).checks
  return checks.hasHeroImage
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productHasGallery(product) {
  return resolveProductHealthScore(product).checks.hasGallery
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productHasPdf(product) {
  return resolveProductHealthScore(product).checks.hasPdf
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productHasMissingMedia(product) {
  const checks = resolveProductHealthScore(product).checks
  return !checks.hasHeroImage || !checks.hasGallery || !checks.hasPdf
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productHasSeo(product) {
  const checks = resolveProductHealthScore(product).checks
  return checks.hasSeoTitle && checks.hasSeoDescription
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productHasMissingSeo(product) {
  return !productHasSeo(product)
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function productNeedsVariants(product) {
  return !resolveProductHealthScore(product).checks.hasActiveVariant
}

/**
 * @param {ProductMasterCenterRowVm[]} items
 */
export function buildProductHealthSummaryMetrics(items) {
  const healthFull = items.filter((p) => resolveProductHealthScore(p).score === 100).length
  const healthLow = items.filter((p) => resolveProductHealthScore(p).score < 80).length
  const missingMedia = items.filter((p) => productHasMissingMedia(p)).length
  const missingVariant = items.filter((p) => productNeedsVariants(p)).length

  return [
    {
      id: 'health-full',
      label: 'Tam Sağlıklı Ürün',
      value: String(healthFull),
      valueTone: /** @type {const} */ ('success'),
    },
    {
      id: 'health-low',
      label: 'Sağlık <80',
      value: String(healthLow),
      valueTone: healthLow > 0 ? /** @type {const} */ ('warning') : undefined,
    },
    {
      id: 'missing-media',
      label: 'Eksik Medya',
      value: String(missingMedia),
      valueTone: missingMedia > 0 ? /** @type {const} */ ('warning') : undefined,
    },
    {
      id: 'missing-variant',
      label: 'Eksik Varyant',
      value: String(missingVariant),
      valueTone: missingVariant > 0 ? /** @type {const} */ ('warning') : undefined,
    },
  ]
}

/**
 * @param {ProductMasterCenterRowVm} product
 * @param {ProductMasterQuickFilterId} filterId
 */
export function matchesProductMasterQuickFilter(product, filterId) {
  if (filterId === 'all') return true
  const health = resolveProductHealthScore(product)
  switch (filterId) {
    case 'published':
      return product.publishStatus === 'PUBLISHED'
    case 'draft':
      return product.publishStatus === 'DRAFT'
    case 'passive':
      return product.publishStatus === 'PASSIVE'
    case 'health-100':
      return health.score === 100
    case 'health-80-plus':
      return health.score >= 80
    case 'health-50-79':
      return health.score >= 50 && health.score < 80
    case 'health-under-50':
      return health.score < 50
    case 'missing-media':
      return productHasMissingMedia(product)
    case 'missing-seo':
      return productHasMissingSeo(product)
    case 'missing-variants':
      return productNeedsVariants(product)
    case 'woo-ready':
      return product.woo?.status === 'READY'
    case 'woo-not-ready':
      return product.woo?.status === 'NOT_READY'
    case 'woo-sync-pending':
      return product.woo?.status === 'SYNC_PENDING'
    case 'woo-error':
      return product.woo?.status === 'ERROR'
    default:
      return true
  }
}

/**
 * @param {ProductMasterCenterRowVm[]} items
 * @param {ProductMasterQuickFilterId} filterId
 */
export function filterProductMasterItems(items, filterId) {
  if (filterId === 'all') return items
  return items.filter((p) => matchesProductMasterQuickFilter(p, filterId))
}

/**
 * @param {ProductMasterCenterRowVm[]} items
 */
export function countProductMasterQuickFilters(items) {
  /** @type {Record<string, number>} */
  const counts = {}
  for (const f of PRODUCT_MASTER_QUICK_FILTERS) {
    counts[f.id] = filterProductMasterItems(items, f.id).length
  }
  return counts
}

/**
 * @param {string} name
 */
export function productThumbnailInitial(name) {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toLocaleUpperCase('tr-TR')
}

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
export function healthToneClass(tone) {
  if (tone === 'success') return 'mos-pmc-health--success'
  if (tone === 'warning') return 'mos-pmc-health--warning'
  return 'mos-pmc-health--critical'
}

/**
 * @param {'critical' | 'warning'} severity
 */
export function healthMissingIcon(severity) {
  return severity === 'warning' ? '🟡' : '🔴'
}

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
export function healthScoreDot(tone) {
  if (tone === 'success') return '🟢'
  if (tone === 'warning') return '🟡'
  return '🔴'
}
