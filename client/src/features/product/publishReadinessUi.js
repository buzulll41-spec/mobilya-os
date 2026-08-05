import {
  calculatePublishReadiness,
  productToPublishReadinessInput,
  publishReadinessTone,
} from '../../lib/calculatePublishReadiness.js'

/** @typedef {import('../../lib/calculatePublishReadiness.js').PublishReadinessResult} PublishReadinessResult */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */

/** @typedef {'all' | 'ready' | 'not-ready' | 'missing-image' | 'missing-seo' | 'missing-variant' | 'woo-ready'} PublishReadinessFilterId */

export const PUBLISH_READINESS_FILTERS = /** @type {const} */ ([
  { id: 'ready', label: 'Yayına Hazır' },
  { id: 'not-ready', label: 'Yayına Hazır Değil' },
  { id: 'missing-image', label: 'Eksik Görsel' },
  { id: 'missing-seo', label: 'Eksik SEO' },
  { id: 'missing-variant', label: 'Eksik Varyant' },
  { id: 'woo-ready', label: 'Woo Hazır' },
])

/**
 * @param {ProductMasterCenterRowVm} product
 * @returns {PublishReadinessResult}
 */
export function resolvePublishReadiness(product) {
  return calculatePublishReadiness(productToPublishReadinessInput(product))
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function publishReadinessMissingImage(product) {
  const { checks } = resolvePublishReadiness(product)
  return !checks.hasHeroImage || !checks.hasGallery
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function publishReadinessMissingSeo(product) {
  const { checks } = resolvePublishReadiness(product)
  return !checks.hasSeoTitle || !checks.hasSeoDescription
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function publishReadinessMissingVariant(product) {
  return !resolvePublishReadiness(product).checks.hasActiveVariant
}

/**
 * @param {ProductMasterCenterRowVm} product
 */
export function publishReadinessWooReady(product) {
  return product.woo?.readiness === 'READY'
}

/**
 * @param {ProductMasterCenterRowVm[]} items
 * @param {PublishReadinessFilterId} filterId
 */
export function filterPublishReadinessItems(items, filterId) {
  if (filterId === 'all') return items
  return items.filter((product) => {
    const readiness = resolvePublishReadiness(product)
    switch (filterId) {
      case 'ready':
        return readiness.isReadyToPublish
      case 'not-ready':
        return !readiness.isReadyToPublish
      case 'missing-image':
        return publishReadinessMissingImage(product)
      case 'missing-seo':
        return publishReadinessMissingSeo(product)
      case 'missing-variant':
        return publishReadinessMissingVariant(product)
      case 'woo-ready':
        return publishReadinessWooReady(product)
      default:
        return true
    }
  })
}

/**
 * @param {ProductMasterCenterRowVm[]} items
 */
export function buildPublishReadinessSummaryMetrics(items) {
  const ready = items.filter((p) => resolvePublishReadiness(p).isReadyToPublish).length
  const notReady = items.length - ready
  const wooReady = items.filter((p) => publishReadinessWooReady(p)).length
  const missingImage = items.filter((p) => publishReadinessMissingImage(p)).length
  const missingSeo = items.filter((p) => publishReadinessMissingSeo(p)).length
  const missingVariant = items.filter((p) => publishReadinessMissingVariant(p)).length

  return [
    {
      id: 'ready',
      label: 'Yayına Hazır',
      value: String(ready),
      valueTone: 'success',
    },
    {
      id: 'not-ready',
      label: 'Yayına Hazır Değil',
      value: String(notReady),
      valueTone: notReady > 0 ? 'critical' : 'neutral',
    },
    {
      id: 'woo-ready',
      label: 'Woo Hazır',
      value: String(wooReady),
      valueTone: 'success',
    },
    {
      id: 'missing-image',
      label: 'Eksik Görsel',
      value: String(missingImage),
      valueTone: missingImage > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'missing-seo',
      label: 'Eksik SEO',
      value: String(missingSeo),
      valueTone: missingSeo > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'missing-variant',
      label: 'Eksik Varyant',
      value: String(missingVariant),
      valueTone: missingVariant > 0 ? 'warning' : 'neutral',
    },
  ]
}

/**
 * @param {'success' | 'warning' | 'critical'} tone
 */
export function publishReadinessToneClass(tone) {
  if (tone === 'success') return 'mos-ppr-badge--success'
  if (tone === 'warning') return 'mos-ppr-badge--warning'
  return 'mos-ppr-badge--critical'
}

/**
 * @param {number} score
 */
export function publishReadinessDotTone(score) {
  return publishReadinessTone(score)
}
