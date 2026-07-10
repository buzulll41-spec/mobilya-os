import {
  mapProductToMasterCenterRow,
  PUBLISH_STATUS,
  PUBLISH_STATUS_LABELS,
  publishStatusTone,
} from '../product/productMasterCenterModel.js'

/** @typedef {import('../product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */

/** @typedef {'ready' | 'seo-missing' | 'media-missing' | 'draft' | 'published'} CommercePublishFilterId */

/**
 * @typedef {Object} CommercePublishChecksVm
 * @property {boolean} hasSeo
 * @property {boolean} hasMedia
 * @property {boolean} hasDescription
 * @property {boolean} hasSlug
 */

/**
 * @typedef {Object} CommercePublishRowVm
 * @property {string} id
 * @property {string} productCode
 * @property {string} name
 * @property {string} category
 * @property {string | null} thumbnailUrl
 * @property {import('../product/productMasterCenterModel.js').PublishStatus} publishStatus
 * @property {string} publishStatusLabel
 * @property {'success' | 'warning' | 'neutral'} publishStatusTone
 * @property {'ok' | 'miss'} seoStatus
 * @property {string} seoStatusLabel
 * @property {'ok' | 'miss'} mediaStatus
 * @property {string} mediaStatusLabel
 * @property {number} readinessScore
 * @property {'success' | 'warning' | 'critical'} readinessTone
 * @property {string} lastUpdated
 * @property {boolean} isReadyToPublish
 * @property {CommercePublishChecksVm} checks
 * @property {string[]} missingFields
 * @property {ProductMasterCenterRowVm} master
 */

const DEMO_TODAY = '2026-05-14'

/** @type {{ id: CommercePublishFilterId, label: string }[]} */
export const COMMERCE_PUBLISH_FILTERS = [
  { id: 'ready', label: 'Yayına Hazır' },
  { id: 'seo-missing', label: 'SEO Eksik' },
  { id: 'media-missing', label: 'Medya Eksik' },
  { id: 'draft', label: 'Taslak' },
  { id: 'published', label: 'Yayında' },
]

/**
 * @param {string} seed
 */
function hashSeed(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * @param {string} isoDate
 */
function formatLastUpdated(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * @param {ProductMasterCenterRowVm} master
 * @param {string} createdAt
 * @returns {CommercePublishRowVm}
 */
function mapCommercePublishRow(master, createdAt) {
  const hasSeo = Boolean(master.seoTitle?.trim() && master.seoDescription?.trim())
  const hasSlug = Boolean(master.slug?.trim())
  const hasMedia = Boolean(master.media.mainImageUrl && master.media.galleryImageUrls.length > 0)
  const hasDescription = Boolean(master.shortDescription?.trim() && master.longDescription?.trim())

  const checks = { hasSeo, hasMedia, hasDescription, hasSlug }
  let readinessScore = 0
  if (hasSeo) readinessScore += 25
  if (hasMedia) readinessScore += 25
  if (hasDescription) readinessScore += 25
  if (hasSlug) readinessScore += 25

  const missingFields = []
  if (!hasSeo) missingFields.push('SEO başlığı / açıklaması')
  if (!hasSlug) missingFields.push('Slug')
  if (!master.media.mainImageUrl) missingFields.push('Ana görsel')
  if (master.media.galleryImageUrls.length === 0) missingFields.push('Galeri görselleri')
  if (!hasDescription) missingFields.push('Kısa / uzun açıklama')

  const isReadyToPublish =
    readinessScore === 100 && master.publishStatus !== PUBLISH_STATUS.PASSIVE

  const h = hashSeed(master.id)
  const daysAgo = h % 45
  const base = new Date(`${DEMO_TODAY}T12:00:00`)
  base.setDate(base.getDate() - daysAgo)
  const lastUpdated = createdAt && createdAt <= DEMO_TODAY ? createdAt : base.toISOString().slice(0, 10)

  const readinessTone =
    readinessScore >= 100 ? 'success' : readinessScore >= 50 ? 'warning' : 'critical'

  return {
    id: master.id,
    productCode: master.productCode,
    name: master.name,
    category: master.category,
    thumbnailUrl: master.thumbnailUrl,
    publishStatus: master.publishStatus,
    publishStatusLabel: PUBLISH_STATUS_LABELS[master.publishStatus],
    publishStatusTone: publishStatusTone(master.publishStatus),
    seoStatus: hasSeo && hasSlug ? 'ok' : 'miss',
    seoStatusLabel: hasSeo && hasSlug ? 'Tamam' : 'Eksik',
    mediaStatus: hasMedia ? 'ok' : 'miss',
    mediaStatusLabel: hasMedia ? 'Tamam' : 'Eksik',
    readinessScore,
    readinessTone,
    lastUpdated: formatLastUpdated(lastUpdated),
    isReadyToPublish,
    checks,
    missingFields,
    master,
  }
}

/**
 * @param {CommercePublishRowVm[]} rows
 * @param {CommercePublishFilterId | 'all'} filterId
 */
export function filterCommercePublishRows(rows, filterId) {
  if (filterId === 'all') return rows
  if (filterId === 'ready') return rows.filter((r) => r.isReadyToPublish)
  if (filterId === 'seo-missing') return rows.filter((r) => !r.checks.hasSeo || !r.checks.hasSlug)
  if (filterId === 'media-missing') return rows.filter((r) => !r.checks.hasMedia)
  if (filterId === 'draft') return rows.filter((r) => r.publishStatus === PUBLISH_STATUS.DRAFT)
  if (filterId === 'published') return rows.filter((r) => r.publishStatus === PUBLISH_STATUS.PUBLISHED)
  return rows
}

/**
 * @param {ProductListItemDto[]} products
 */
export function buildCommercePublishingView(products) {
  const rows = products.map((p) => mapCommercePublishRow(mapProductToMasterCenterRow(p), p.createdAt))

  const published = rows.filter((r) => r.publishStatus === PUBLISH_STATUS.PUBLISHED).length
  const draft = rows.filter((r) => r.publishStatus === PUBLISH_STATUS.DRAFT).length
  const ready = rows.filter((r) => r.isReadyToPublish).length
  const seoMissing = rows.filter((r) => !r.checks.hasSeo || !r.checks.hasSlug).length
  const mediaMissing = rows.filter((r) => !r.checks.hasMedia).length

  return {
    today: DEMO_TODAY,
    items: rows,
    summaryMetrics: [
      { id: 'total', label: 'Toplam Ürün', value: String(rows.length) },
      {
        id: 'published',
        label: 'Yayında',
        value: String(published),
        valueTone: /** @type {const} */ ('success'),
      },
      {
        id: 'draft',
        label: 'Taslak',
        value: String(draft),
        valueTone: draft > 0 ? /** @type {const} */ ('warning') : undefined,
      },
      {
        id: 'ready',
        label: 'Yayına Hazır',
        value: String(ready),
        valueTone: ready > 0 ? /** @type {const} */ ('success') : undefined,
      },
      {
        id: 'seo-missing',
        label: 'SEO Eksik',
        value: String(seoMissing),
        valueTone: seoMissing > 0 ? /** @type {const} */ ('warning') : undefined,
      },
      {
        id: 'media-missing',
        label: 'Medya Eksik',
        value: String(mediaMissing),
        valueTone: mediaMissing > 0 ? /** @type {const} */ ('warning') : undefined,
      },
    ],
  }
}
