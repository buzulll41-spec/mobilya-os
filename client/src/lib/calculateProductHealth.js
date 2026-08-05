/** @typedef {'Medya' | 'İçerik' | 'Teknik' | 'Varyant'} ProductHealthGroup */

/**
 * @typedef {Object} ProductHealthInput
 * @property {string | null} [mainImageUrl]
 * @property {string | null} [thumbnailUrl]
 * @property {string[]} [galleryImageUrls]
 * @property {string | null} [catalogPdfUrl]
 * @property {string | null} [seoTitle]
 * @property {string | null} [seoDescription]
 * @property {string | null} [shortDescription]
 * @property {string | null} [longDescription]
 * @property {{ label: string, value: string }[]} [technicalAttributes]
 * @property {{ label: string, value: string }[]} [technicalSpecs]
 * @property {number} [activeVariantCount]
 */

/**
 * @typedef {Object} ProductHealthCheckItem
 * @property {string} id
 * @property {string} label
 * @property {ProductHealthGroup} group
 * @property {number} points
 * @property {boolean} earned
 * @property {string} missingLabel
 * @property {'critical' | 'warning'} missingSeverity
 */

/**
 * @typedef {Object} ProductHealthChecks
 * @property {boolean} hasHeroImage
 * @property {boolean} hasGallery
 * @property {boolean} hasPdf
 * @property {boolean} hasSeoTitle
 * @property {boolean} hasSeoDescription
 * @property {boolean} hasShortDescription
 * @property {boolean} hasLongDescription
 * @property {boolean} hasTechnicalAttributes
 * @property {boolean} hasActiveVariant
 */

/**
 * @typedef {Object} ProductHealthResult
 * @property {number} score
 * @property {'success' | 'warning' | 'critical'} tone
 * @property {ProductHealthChecks} checks
 * @property {ProductHealthCheckItem[]} items
 * @property {string[]} missingLabels
 * @property {string[]} completedLabels
 */

/** @type {Array<{ id: keyof ProductHealthChecks, label: string, group: ProductHealthGroup, points: number, missingLabel: string, missingSeverity: 'critical' | 'warning', test: (input: ProductHealthInput) => boolean }>} */
const HEALTH_RULES = [
  {
    id: 'hasHeroImage',
    label: 'Hero görsel',
    group: 'Medya',
    points: 15,
    missingLabel: 'Hero görsel yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.mainImageUrl?.trim() || input.thumbnailUrl?.trim()),
  },
  {
    id: 'hasGallery',
    label: 'Galeri görseli',
    group: 'Medya',
    points: 15,
    missingLabel: 'Galeri görseli yok',
    missingSeverity: 'critical',
    test: (input) => (input.galleryImageUrls?.length ?? 0) > 0,
  },
  {
    id: 'hasPdf',
    label: 'PDF katalog',
    group: 'Medya',
    points: 10,
    missingLabel: 'PDF katalog yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.catalogPdfUrl?.trim()),
  },
  {
    id: 'hasSeoTitle',
    label: 'SEO başlık',
    group: 'İçerik',
    points: 10,
    missingLabel: 'SEO başlık yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.seoTitle?.trim()),
  },
  {
    id: 'hasSeoDescription',
    label: 'SEO açıklama',
    group: 'İçerik',
    points: 10,
    missingLabel: 'SEO açıklama yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.seoDescription?.trim()),
  },
  {
    id: 'hasShortDescription',
    label: 'Kısa açıklama',
    group: 'İçerik',
    points: 10,
    missingLabel: 'Kısa açıklama yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.shortDescription?.trim()),
  },
  {
    id: 'hasLongDescription',
    label: 'Uzun açıklama',
    group: 'İçerik',
    points: 10,
    missingLabel: 'Uzun açıklama yok',
    missingSeverity: 'critical',
    test: (input) => Boolean(input.longDescription?.trim()),
  },
  {
    id: 'hasTechnicalAttributes',
    label: 'Teknik özellik',
    group: 'Teknik',
    points: 10,
    missingLabel: 'Teknik özellik yok',
    missingSeverity: 'critical',
    test: (input) => {
      const attrs = input.technicalAttributes?.length
        ? input.technicalAttributes
        : input.technicalSpecs
      return (attrs?.length ?? 0) > 0
    },
  },
  {
    id: 'hasActiveVariant',
    label: 'Aktif varyant',
    group: 'Varyant',
    points: 10,
    missingLabel: 'Aktif varyant yok',
    missingSeverity: 'warning',
    test: (input) => (input.activeVariantCount ?? 0) > 0,
  },
]

/**
 * @param {ProductHealthInput} input
 * @returns {ProductHealthResult}
 */
export function calculateProductHealth(input) {
  const items = HEALTH_RULES.map((rule) => {
    const earned = rule.test(input)
    return {
      id: rule.id,
      label: rule.label,
      group: rule.group,
      points: rule.points,
      earned,
      missingLabel: rule.missingLabel,
      missingSeverity: rule.missingSeverity,
    }
  })

  const score = items.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0)
  const missingLabels = items.filter((item) => !item.earned).map((item) => item.missingLabel)
  const completedLabels = items.filter((item) => item.earned).map((item) => item.label)

  /** @type {ProductHealthChecks} */
  const checks = Object.fromEntries(items.map((item) => [item.id, item.earned]))

  const tone = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'critical'

  return { score, tone, checks, items, missingLabels, completedLabels }
}

/**
 * @param {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} product
 * @returns {ProductHealthInput}
 */
export function productToHealthInput(product) {
  return {
    mainImageUrl: product.media?.mainImageUrl ?? product.thumbnailUrl,
    thumbnailUrl: product.thumbnailUrl,
    galleryImageUrls: product.media?.galleryImageUrls ?? [],
    catalogPdfUrl: product.media?.catalogPdfUrl ?? null,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    technicalAttributes: product.technicalAttributes,
    technicalSpecs: product.technicalSpecs,
    activeVariantCount: product.variants?.length ?? 0,
  }
}
