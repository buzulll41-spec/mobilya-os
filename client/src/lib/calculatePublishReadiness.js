/**
 * EVTREND yayın hazırlık skoru — 100 puan (Product Health verilerinden türetilir).
 *
 * @typedef {Object} PublishReadinessInput
 * @property {string | null | undefined} mainImageUrl
 * @property {string | null | undefined} thumbnailUrl
 * @property {string[]} [galleryImageUrls]
 * @property {string | null | undefined} shortDescription
 * @property {string | null | undefined} longDescription
 * @property {string | null | undefined} seoTitle
 * @property {string | null | undefined} seoDescription
 * @property {string | null | undefined} category
 * @property {number | null | undefined} salePrice
 * @property {string | null | undefined} productType
 * @property {number} [activeVariantCount]
 */

/**
 * @typedef {Object} PublishReadinessCheckItem
 * @property {string} id
 * @property {string} label
 * @property {string} okLabel
 * @property {string} missingLabel
 * @property {number} points
 * @property {boolean} earned
 */

/**
 * @typedef {Object} PublishReadinessResult
 * @property {number} score
 * @property {'success' | 'warning' | 'critical'} tone
 * @property {string} statusLabel
 * @property {boolean} isReadyToPublish
 * @property {PublishReadinessCheckItem[]} items
 * @property {string[]} missingLabels
 * @property {string[]} completedLabels
 * @property {{
 *   hasHeroImage: boolean
 *   hasGallery: boolean
 *   hasDescription: boolean
 *   hasSeoTitle: boolean
 *   hasSeoDescription: boolean
 *   hasCategory: boolean
 *   hasPrice: boolean
 *   hasActiveVariant: boolean
 * }} checks
 */

/** @type {PublishReadinessCheckItem[]} */
const READINESS_RULES = [
  {
    id: 'hero',
    label: 'Ana görsel',
    okLabel: 'Ana görsel var',
    missingLabel: 'Ana görsel eksik',
    points: 20,
    earned: false,
  },
  {
    id: 'gallery',
    label: 'Galeri',
    okLabel: 'Galeri var',
    missingLabel: 'Galeri eksik',
    points: 15,
    earned: false,
  },
  {
    id: 'description',
    label: 'Açıklama',
    okLabel: 'Açıklama var',
    missingLabel: 'Açıklama eksik',
    points: 15,
    earned: false,
  },
  {
    id: 'seo-title',
    label: 'SEO başlık',
    okLabel: 'SEO başlık var',
    missingLabel: 'SEO başlık eksik',
    points: 10,
    earned: false,
  },
  {
    id: 'seo-description',
    label: 'SEO açıklama',
    okLabel: 'SEO açıklama var',
    missingLabel: 'SEO açıklama eksik',
    points: 10,
    earned: false,
  },
  {
    id: 'category',
    label: 'Kategori',
    okLabel: 'Kategori var',
    missingLabel: 'Kategori eksik',
    points: 10,
    earned: false,
  },
  {
    id: 'price',
    label: 'Fiyat',
    okLabel: 'Fiyat var',
    missingLabel: 'Fiyat eksik',
    points: 10,
    earned: false,
  },
  {
    id: 'variant',
    label: 'Aktif varyant',
    okLabel: 'Aktif varyant var',
    missingLabel: 'Varyant eksik',
    points: 10,
    earned: false,
  },
]

/**
 * @param {number} score
 * @returns {'success' | 'warning' | 'critical'}
 */
export function publishReadinessTone(score) {
  if (score >= 80) return 'success'
  if (score >= 50) return 'warning'
  return 'critical'
}

/**
 * @param {number} score
 */
export function publishReadinessStatusLabel(score) {
  if (score >= 80) return 'Yayına Hazır'
  if (score >= 50) return 'Düzenleme Gerekli'
  return 'Yayına Hazır Değil'
}

/**
 * @param {PublishReadinessInput} input
 * @returns {PublishReadinessResult}
 */
export function calculatePublishReadiness(input) {
  const hasHeroImage = Boolean(input.mainImageUrl?.trim() || input.thumbnailUrl?.trim())
  const hasGallery = (input.galleryImageUrls?.length ?? 0) > 0
  const hasDescription = Boolean(
    input.shortDescription?.trim() || input.longDescription?.trim(),
  )
  const hasSeoTitle = Boolean(input.seoTitle?.trim())
  const hasSeoDescription = Boolean(input.seoDescription?.trim())
  const hasCategory = Boolean(input.category?.trim())
  const hasPrice =
    input.salePrice != null && Number.isFinite(Number(input.salePrice)) && Number(input.salePrice) > 0
  const needsVariants = input.productType === 'VARIABLE'
  const hasActiveVariant = needsVariants ? (input.activeVariantCount ?? 0) > 0 : true

  const earnedById = {
    hero: hasHeroImage,
    gallery: hasGallery,
    description: hasDescription,
    'seo-title': hasSeoTitle,
    'seo-description': hasSeoDescription,
    category: hasCategory,
    price: hasPrice,
    variant: hasActiveVariant,
  }

  const items = READINESS_RULES.map((rule) => ({
    ...rule,
    earned: earnedById[/** @type {keyof typeof earnedById} */ (rule.id)],
  }))

  const score = items.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0)
  const tone = publishReadinessTone(score)
  const missingLabels = items.filter((item) => !item.earned).map((item) => item.missingLabel)
  const completedLabels = items.filter((item) => item.earned).map((item) => item.okLabel)

  return {
    score,
    tone,
    statusLabel: publishReadinessStatusLabel(score),
    isReadyToPublish: score >= 80,
    items,
    missingLabels,
    completedLabels,
    checks: {
      hasHeroImage,
      hasGallery,
      hasDescription,
      hasSeoTitle,
      hasSeoDescription,
      hasCategory,
      hasPrice,
      hasActiveVariant,
    },
  }
}

/**
 * @param {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} product
 * @returns {PublishReadinessInput}
 */
export function productToPublishReadinessInput(product) {
  return {
    mainImageUrl: product.media?.mainImageUrl ?? null,
    thumbnailUrl: product.thumbnailUrl ?? null,
    galleryImageUrls: product.media?.galleryImageUrls ?? [],
    shortDescription: product.shortDescription ?? null,
    longDescription: product.longDescription ?? null,
    seoTitle: product.seoTitle ?? null,
    seoDescription: product.seoDescription ?? null,
    category: product.category ?? null,
    salePrice: product.salePrice ?? null,
    productType: product.productType ?? null,
    activeVariantCount: product.variants?.length ?? 0,
  }
}
