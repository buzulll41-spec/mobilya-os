import { formatProductMoney } from '../../lib/formatProductMoney.js'
import {
  productMarginPercent,
} from '../../features/products/productsOpsCenterUi.js'
import { calculateProductHealth, productToHealthInput } from '../../lib/calculateProductHealth.js'

/** @typedef {import('../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */
/** @typedef {import('../../contracts/v1/product.js').ProductDetailDto} ProductDetailDto */
/** @typedef {import('../../contracts/v1/productMaster.js').ProductMasterListItemDto} ProductMasterListItemDto */

/** @typedef {'DRAFT' | 'PUBLISHED' | 'PASSIVE'} PublishStatus */

/**
 * @typedef {Object} ProductMasterMediaVm
 * @property {string | null} mainImageUrl
 * @property {string[]} galleryImageUrls
 * @property {string | null} videoUrl
 * @property {string | null} catalogPdfUrl
 */

/**
 * @typedef {Object} ProductMasterTechnicalSpecVm
 * @property {string} label
 * @property {string} value
 */

/**
 * @typedef {Object} ProductMasterDimensionsVm
 * @property {string} productMeasure
 * @property {string} width
 * @property {string} height
 * @property {string} depth
 * @property {string} weight
 * @property {string | null} bedSize
 * @property {string | null} tableSize
 */

/**
 * @typedef {Object} ProductMasterVariantVm
 * @property {string} label
 * @property {string} code
 */

/**
 * @typedef {Object} ProductHealthCheckV3Vm
 * @property {boolean} hasMainImage
 * @property {boolean} hasCategory
 * @property {boolean} hasGallery
 * @property {boolean} hasSeoTitle
 * @property {boolean} hasSeoDescription
 * @property {boolean} hasDescription
 * @property {boolean} hasVariants
 * @property {boolean} hasTechnicalSpecs
 * @property {boolean} hasPdf
 */

/**
 * @typedef {Object} ProductHealthScoreV3Vm
 * @property {number} score
 * @property {'success' | 'warning' | 'critical'} tone
 * @property {ProductHealthCheckV3Vm} checks
 * @property {string[]} missingLabels
 */

/**
 * @typedef {Object} ProductHealthCheckVm
 * @property {boolean} hasImage
 * @property {boolean} hasSeo
 * @property {boolean} hasDescription
 * @property {boolean} hasTechnicalSpecs
 */

/**
 * @typedef {Object} ProductHealthScoreVm
 * @property {number} score
 * @property {'success' | 'warning' | 'critical'} tone
 * @property {ProductHealthCheckVm} checks
 * @property {string[]} missingLabels
 */

/**
 * @typedef {Object} ProductMasterCenterRowVm
 * @property {string} id
 * @property {string} productCode
 * @property {string} barcode
 * @property {string} name
 * @property {string} brand
 * @property {string} category
 * @property {string} subCategory
 * @property {string | null} thumbnailUrl
 * @property {string} listPrice
 * @property {string} listPriceFormatted
 * @property {string} salePriceFormatted
 * @property {string} discountedPrice
 * @property {string} discountedPriceFormatted
 * @property {string} vatRate
 * @property {string | null} supplierId
 * @property {string | null} supplierName
 * @property {string} purchaseCost
 * @property {string} purchaseCostFormatted
 * @property {number} profitAmount
 * @property {string} profitAmountFormatted
 * @property {number} profitPercent
 * @property {string} profitPercentFormatted
 * @property {number} deliveryDays
 * @property {string} seoTitle
 * @property {string} seoDescription
 * @property {string} shortDescription
 * @property {string} longDescription
 * @property {string} slug
 * @property {ProductMasterTechnicalSpecVm[]} technicalSpecs
 * @property {ProductMasterDimensionsVm} dimensions
 * @property {string[]} colorOptions
 * @property {string[]} fabricOptions
 * @property {ProductMasterVariantVm[]} variants
 * @property {ProductHealthScoreVm} healthScore
 * @property {import('../../lib/calculateProductHealth.js').ProductHealthResult} [healthReport]
 * @property {ProductHealthScoreV3Vm} [healthScoreV3]
 * @property {PublishStatus} publishStatus
 * @property {string} publishStatusLabel
 * @property {ProductMasterMediaVm} media
 * @property {'SIMPLE' | 'VARIABLE' | 'SET'} [productType]
 * @property {string | null} [collectionCode]
 * @property {string | null} [seasonCode]
 * @property {number | null} [weightKg]
 * @property {number | null} [packageWidthCm]
 * @property {number | null} [packageDepthCm]
 * @property {number | null} [packageHeightCm]
 * @property {number | null} [packageCount]
 * @property {string | null} [assemblyType]
 * @property {string | null} [coating]
 * @property {string | null} [mechanism]
 * @property {ProductMasterTechnicalSpecVm[]} [technicalAttributes]
 * @property {string[]} [tags]
 * @property {string[]} [relatedProductIds]
 * @property {string | null} [material]
 * @property {number | null} [warrantyMonths]
 * @property {string} [stockType]
 * @property {string | null} [salesSourceType]
 * @property {string | null} [displayFloor]
 * @property {string | null} [physicalLocation]
 * @property {string | null} [externalSupplyType]
 * @property {boolean} [webEnabled]
 * @property {boolean} [mobileEnabled]
 * @property {boolean} [marketplaceEnabled]
 * @property {import('../../contracts/v1/productMaster.js').ProductMasterWooDto} [woo]
 */

export const PUBLISH_STATUS = /** @type {const} */ ({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  PASSIVE: 'PASSIVE',
})

/** @type {Record<PublishStatus, string>} */
export const PUBLISH_STATUS_LABELS = {
  DRAFT: 'Taslak',
  PUBLISHED: 'Yayında',
  PASSIVE: 'Pasif',
}

/**
 * API / mock / legacy kayıtlarındaki publish status değerlerini normalize eder.
 *
 * @param {string | null | undefined} value
 * @param {{ isActive?: boolean }} [options]
 * @returns {PublishStatus}
 */
export function normalizePublishStatus(value, options = {}) {
  if (
    value === PUBLISH_STATUS.DRAFT ||
    value === PUBLISH_STATUS.PUBLISHED ||
    value === PUBLISH_STATUS.PASSIVE
  ) {
    return value
  }
  const upper = String(value ?? '').trim().toUpperCase()
  if (upper === PUBLISH_STATUS.DRAFT) return PUBLISH_STATUS.DRAFT
  if (upper === PUBLISH_STATUS.PUBLISHED) return PUBLISH_STATUS.PUBLISHED
  if (upper === PUBLISH_STATUS.PASSIVE) return PUBLISH_STATUS.PASSIVE
  if (options.isActive === false) return PUBLISH_STATUS.PASSIVE
  return PUBLISH_STATUS.DRAFT
}

const BRAND_FALLBACK = 'Evtrend'

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
 * @param {string} productName
 */
function extractBrand(productName) {
  const first = productName.trim().split(/\s+/)[0]
  if (!first || first.length < 2) return BRAND_FALLBACK
  if (/^katalog$/i.test(first)) return 'Katalog'
  return first
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {string}
 */
function buildBarcode(row) {
  const digits = row.productCode.replace(/\D/g, '')
  const base = digits.padStart(8, '0').slice(-8)
  const check = String(hashSeed(row.id) % 10)
  return `869${base}${check}`
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {PublishStatus}
 */
export function resolvePublishStatus(row) {
  if (!row.isActive) return PUBLISH_STATUS.PASSIVE
  const hasDescription = 'description' in row && row.description && row.description.trim().length > 0
  if (hasDescription) return PUBLISH_STATUS.PUBLISHED
  const h = hashSeed(row.id)
  return h % 5 === 0 ? PUBLISH_STATUS.DRAFT : PUBLISH_STATUS.PUBLISHED
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 */
function buildMedia(row) {
  const h = hashSeed(`${row.id}-media`)
  const hasMedia = row.isActive && h % 3 !== 0
  if (!hasMedia) {
    return {
      mainImageUrl: null,
      galleryImageUrls: [],
      videoUrl: null,
      catalogPdfUrl: null,
    }
  }
  const slug = row.productCode.toLowerCase()
  return {
    mainImageUrl: `https://placehold.co/640x480/eceff3/5c6678?text=${encodeURIComponent(row.productName.slice(0, 18))}`,
    galleryImageUrls: [
      'https://placehold.co/320x240/eceff3/5c6678?text=Galeri+1',
      'https://placehold.co/320x240/eceff3/5c6678?text=Galeri+2',
      'https://placehold.co/320x240/eceff3/5c6678?text=Galeri+3',
    ],
    videoUrl: h % 2 === 0 ? `https://example.com/video/${slug}` : null,
    catalogPdfUrl: h % 4 !== 0 ? `https://example.com/catalog/${slug}.pdf` : null,
  }
}

const TECH_SPEC_POOL = [
  { label: 'Malzeme', values: ['MDF', 'Sunta', 'Masif meşe', 'Metal ayak'] },
  { label: 'Kaplama', values: ['Lake', 'Melamin', 'Doğal ceviz', 'Mat boya'] },
  { label: 'Mekanizma', values: ['Soft-close', 'Push-open', 'Sabit', 'Yatay sürgü'] },
  { label: 'Garanti', values: ['2 yıl', '3 yıl', '5 yıl'] },
  { label: 'Montaj', values: ['Fabrika montajlı', 'Flat-pack', 'Saha montajı'] },
]

const COLOR_POOL = [
  'Antrasit',
  'Beyaz',
  'Ceviz',
  'Gri',
  'Krem',
  'Meşe',
  'Siyah',
  'Vizon',
]

const FABRIC_POOL = [
  'Dokuma keten',
  'Kadife',
  'Mikrofiber',
  'Nubuk',
  'Polar',
  'Suni deri',
  'Şönil',
  'Yün karışım',
]

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {ProductMasterTechnicalSpecVm[]}
 */
function buildTechnicalSpecs(row) {
  const h = hashSeed(`${row.id}-specs`)
  const count = 3 + (h % 2)
  const specs = []
  for (let i = 0; i < count; i++) {
    const pool = TECH_SPEC_POOL[(h + i) % TECH_SPEC_POOL.length]
    specs.push({
      label: pool.label,
      value: pool.values[(h + i * 3) % pool.values.length],
    })
  }
  return specs
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {ProductMasterDimensionsVm}
 */
function buildDimensions(row) {
  const h = hashSeed(`${row.id}-dims`)
  const w = 80 + (h % 140)
  const d = 40 + ((h >> 3) % 80)
  const ht = 35 + ((h >> 5) % 120)
  const kg = 8 + ((h >> 7) % 90)
  const cat = row.category.toLowerCase()
  const isBed = /yatak|baza|genç/.test(cat)
  const isDining = /yemek|masa|mutfak/.test(cat)
  const bedSizes = ['160x200 cm', '180x200 cm', '200x200 cm']
  return {
    productMeasure: `${w} × ${d} × ${ht} cm`,
    width: `${w} cm`,
    height: `${ht} cm`,
    depth: `${d} cm`,
    weight: `${(kg / 10).toFixed(1)} kg`,
    bedSize: isBed ? bedSizes[h % bedSizes.length] : null,
    tableSize: isDining ? `${120 + (h % 80)} × ${70 + (h % 30)} cm` : null,
  }
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {ProductMasterVariantVm[]}
 */
function buildVariants(row) {
  const cat = row.category.toLowerCase()
  const h = hashSeed(`${row.id}-variants`)
  if (/yatak|baza/.test(cat)) {
    return [
      { label: '160×200', code: `${row.productCode}-160` },
      { label: '180×200', code: `${row.productCode}-180` },
      { label: '200×200', code: `${row.productCode}-200` },
    ]
  }
  if (/genç/.test(cat) && h % 2 === 0) {
    return [
      { label: '120×200', code: `${row.productCode}-120` },
      { label: '140×200', code: `${row.productCode}-140` },
    ]
  }
  if (h % 4 === 0) return []
  const labels = ['Standart', 'Geniş', 'Kompakt', 'XL']
  const count = 2 + (h % 2)
  return Array.from({ length: count }, (_, i) => ({
    label: labels[(h + i) % labels.length],
    code: `${row.productCode}-V${i + 1}`,
  }))
}

/**
 * @param {Pick<ProductMasterCenterRowVm, 'thumbnailUrl' | 'seoTitle' | 'seoDescription' | 'shortDescription' | 'longDescription' | 'technicalSpecs' | 'dimensions' | 'media'>} product
 * @returns {ProductHealthScoreVm}
 */
export function computeProductHealthScore(product) {
  const hasImage = Boolean(product.media?.mainImageUrl || product.thumbnailUrl)
  const hasSeo = Boolean(product.seoTitle?.trim() && product.seoDescription?.trim())
  const hasDescription = Boolean(product.shortDescription?.trim() && product.longDescription?.trim())
  const hasTechnicalSpecs =
    (product.technicalSpecs?.length ?? 0) > 0 &&
    Boolean(product.dimensions?.width && product.dimensions?.depth && product.dimensions?.height)

  const checks = { hasImage, hasSeo, hasDescription, hasTechnicalSpecs }
  let score = 0
  if (hasImage) score += 25
  if (hasSeo) score += 25
  if (hasDescription) score += 25
  if (hasTechnicalSpecs) score += 25

  const missingLabels = []
  if (!hasImage) missingLabels.push('Eksik görsel')
  if (!hasSeo) missingLabels.push('Eksik SEO')
  if (!hasDescription) missingLabels.push('Eksik açıklama')
  if (!hasTechnicalSpecs) missingLabels.push('Eksik teknik özellik')

  const tone = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'critical'
  return { score, tone, checks, missingLabels }
}

/**
 * FAZ 4C — açıklanabilir ürün sağlık skoru (100 puan)
 * @param {Pick<ProductMasterCenterRowVm, 'category' | 'thumbnailUrl' | 'seoTitle' | 'seoDescription' | 'shortDescription' | 'longDescription' | 'technicalSpecs' | 'technicalAttributes' | 'dimensions' | 'media' | 'variants' | 'productType'>} product
 * @returns {import('../../lib/calculateProductHealth.js').ProductHealthResult}
 */
export function computeProductHealthReport(product) {
  return calculateProductHealth(productToHealthInput(product))
}

/**
 * @deprecated use computeProductHealthReport
 * @param {Pick<ProductMasterCenterRowVm, 'category' | 'thumbnailUrl' | 'seoTitle' | 'seoDescription' | 'shortDescription' | 'longDescription' | 'technicalSpecs' | 'dimensions' | 'media' | 'variants' | 'productType'>} product
 * @returns {ProductHealthScoreV3Vm}
 */
export function computeProductHealthScoreV3(product) {
  const report = computeProductHealthReport(product)
  return {
    score: report.score,
    tone: report.tone,
    checks: {
      hasCategory: Boolean(product.category?.trim()),
      hasMainImage: report.checks.hasHeroImage,
      hasGallery: report.checks.hasGallery,
      hasSeoTitle: report.checks.hasSeoTitle,
      hasSeoDescription: report.checks.hasSeoDescription,
      hasDescription: report.checks.hasShortDescription && report.checks.hasLongDescription,
      hasVariants: report.checks.hasActiveVariant,
      hasTechnicalSpecs: report.checks.hasTechnicalAttributes,
      hasPdf: report.checks.hasPdf,
    },
    missingLabels: report.missingLabels,
  }
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {string[]}
 */
function buildColorOptions(row) {
  const h = hashSeed(`${row.id}-colors`)
  const count = 2 + (h % 3)
  const colors = []
  for (let i = 0; i < count; i++) {
    colors.push(COLOR_POOL[(h + i * 5) % COLOR_POOL.length])
  }
  return [...new Set(colors)]
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {string[]}
 */
function buildFabricOptions(row) {
  const h = hashSeed(`${row.id}-fabrics`)
  if (h % 4 === 0) return []
  const count = 1 + (h % 3)
  const fabrics = []
  for (let i = 0; i < count; i++) {
    fabrics.push(FABRIC_POOL[(h + i * 7) % FABRIC_POOL.length])
  }
  return [...new Set(fabrics)]
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {{ profitAmount: number, profitPercent: number }}
 */
function computeProfit(row) {
  const sale = Number.parseFloat(row.defaultSalePrice)
  const purchase = Number.parseFloat(row.purchasePrice)
  const profitAmount =
    Number.isFinite(sale) && Number.isFinite(purchase) ? Math.round((sale - purchase) * 100) / 100 : 0
  const profitPercent = productMarginPercent(/** @type {ProductListItemDto} */ (row))
  return { profitAmount, profitPercent }
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {string}
 */
function buildSlug(row) {
  const base = row.productName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || row.productCode.toLowerCase()
}

/**
 * @param {ProductListItemDto | ProductDetailDto} row
 * @returns {ProductMasterCenterRowVm}
 */
export function mapProductToMasterCenterRow(row) {
  const publishStatus = resolvePublishStatus(row)
  const brand = extractBrand(row.productName)
  const longDescription =
    'description' in row && row.description
      ? row.description
      : `${brand} ${row.category} urunu - Evtrend tek kaynak urun karti. Mobil uygulama ve CRM bu kayittan beslenir.`
  const shortDescription = longDescription.length > 120 ? `${longDescription.slice(0, 117)}…` : longDescription
  const media = buildMedia(row)
  const { profitAmount, profitPercent } = computeProfit(row)
  const technicalSpecs = buildTechnicalSpecs(row)
  const dimensions = buildDimensions(row)
  const seoTitle = `${row.productName} | ${brand} ${row.category}`
  const seoDescription = `${brand} ${row.category} — ${shortDescription}`

  return {
    id: row.id,
    productCode: row.productCode,
    barcode: buildBarcode(row),
    name: row.productName,
    brand,
    category: row.category,
    subCategory: row.suiteType ?? '—',
    thumbnailUrl: media.mainImageUrl,
    listPrice: row.defaultSalePrice,
    listPriceFormatted: formatProductMoney(row.defaultSalePrice),
    salePriceFormatted: formatProductMoney(row.defaultSalePrice),
    discountedPrice: row.minSalePrice,
    discountedPriceFormatted: formatProductMoney(row.minSalePrice),
    vatRate: hashSeed(`${row.id}-vat`) % 3 === 0 ? '%10' : '%20',
    supplierId: row.defaultSupplierId,
    supplierName: row.defaultSupplierName,
    purchaseCost: row.purchasePrice,
    purchaseCostFormatted: formatProductMoney(row.purchasePrice),
    profitAmount,
    profitAmountFormatted: formatProductMoney(String(profitAmount)),
    profitPercent,
    profitPercentFormatted: `%${profitPercent}`,
    deliveryDays: row.deliveryDays,
    seoTitle,
    seoDescription,
    shortDescription,
    longDescription,
    slug: buildSlug(row),
    technicalSpecs,
    dimensions,
    colorOptions: buildColorOptions(row),
    fabricOptions: buildFabricOptions(row),
    variants: buildVariants(row),
    publishStatus,
    publishStatusLabel: PUBLISH_STATUS_LABELS[publishStatus],
    media,
    healthScore: computeProductHealthScore({
      thumbnailUrl: media.mainImageUrl,
      seoTitle,
      seoDescription,
      shortDescription,
      longDescription,
      technicalSpecs,
      dimensions,
      media,
    }),
    healthScoreV3: computeProductHealthScoreV3({
      thumbnailUrl: media.mainImageUrl,
      seoTitle,
      seoDescription,
      shortDescription,
      longDescription,
      technicalSpecs,
      dimensions,
      media,
      variants: buildVariants(row),
      productType: hashSeed(`${row.id}-type`) % 5 === 0 ? 'VARIABLE' : 'SIMPLE',
      category: row.category,
      technicalAttributes: [],
    }),
    healthReport: computeProductHealthReport({
      thumbnailUrl: media.mainImageUrl,
      seoTitle,
      seoDescription,
      shortDescription,
      longDescription,
      technicalSpecs,
      dimensions,
      media,
      variants: buildVariants(row),
      productType: hashSeed(`${row.id}-type`) % 5 === 0 ? 'VARIABLE' : 'SIMPLE',
      category: row.category,
      technicalAttributes: [],
    }),
  }
}

/**
 * API Product Master DTO → ekran satır modeli
 * @param {ProductMasterListItemDto} row
 * @returns {ProductMasterCenterRowVm}
 */
export function mapProductMasterDtoToRowVm(row) {
  const healthReport = computeProductHealthReport({
    category: row.category,
    thumbnailUrl: row.thumbnailUrl,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    technicalSpecs: row.technicalSpecs,
    technicalAttributes: row.technicalAttributes,
    dimensions: row.dimensions,
    media: row.media,
    variants: row.variants ?? [],
    productType: row.productType,
  })

  return {
    id: row.id,
    productCode: row.productCode,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    category: row.category,
    subCategory: row.subCategory,
    thumbnailUrl: row.thumbnailUrl,
    listPrice: row.listPrice,
    listPriceFormatted: formatProductMoney(row.listPrice),
    salePriceFormatted: formatProductMoney(row.salePrice),
    discountedPrice: row.discountedPrice,
    discountedPriceFormatted: formatProductMoney(row.discountedPrice),
    vatRate: row.vatRate,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    purchaseCost: row.purchaseCost,
    purchaseCostFormatted: formatProductMoney(row.purchaseCost),
    profitAmount: row.profitAmount,
    profitAmountFormatted: formatProductMoney(String(row.profitAmount)),
    profitPercent: row.profitPercent,
    profitPercentFormatted: `%${row.profitPercent}`,
    deliveryDays: row.deliveryDays,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    slug: row.slug,
    technicalSpecs: row.technicalSpecs,
    dimensions: row.dimensions,
    colorOptions: row.colorOptions,
    fabricOptions: row.fabricOptions,
    variants: row.variants ?? [],
    publishStatus: normalizePublishStatus(row.publishStatus, { isActive: row.isActive ?? true }),
    publishStatusLabel: PUBLISH_STATUS_LABELS[normalizePublishStatus(row.publishStatus, { isActive: row.isActive ?? true })],
    media: row.media,
    healthScore: row.healthScore,
    healthReport,
    healthScoreV3: computeProductHealthScoreV3({
      category: row.category,
      thumbnailUrl: row.thumbnailUrl,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      shortDescription: row.shortDescription,
      longDescription: row.longDescription,
      technicalSpecs: row.technicalSpecs,
      technicalAttributes: row.technicalAttributes,
      dimensions: row.dimensions,
      media: row.media,
      variants: row.variants ?? [],
      productType: row.productType,
    }),
    productType: row.productType,
    collectionCode: row.collectionCode,
    seasonCode: row.seasonCode,
    weightKg: row.weightKg,
    packageWidthCm: row.packageWidthCm,
    packageDepthCm: row.packageDepthCm,
    packageHeightCm: row.packageHeightCm,
    packageCount: row.packageCount,
    assemblyType: row.assemblyType,
    coating: row.coating,
    mechanism: row.mechanism,
    technicalAttributes: row.technicalAttributes,
    tags: row.tags,
    relatedProductIds: row.relatedProductIds,
    material: row.material ?? null,
    warrantyMonths: row.warrantyMonths ?? null,
    stockType: row.stockType,
    salesSourceType: row.salesSourceType,
    displayFloor: row.displayFloor,
    physicalLocation: row.physicalLocation,
    externalSupplyType: row.externalSupplyType,
    webEnabled: row.webEnabled,
    mobileEnabled: row.mobileEnabled,
    marketplaceEnabled: row.marketplaceEnabled,
    woo: row.woo,
  }
}

/**
 * @param {import('../../contracts/v1/productMaster.js').ProductMasterListResponseDto} res
 */
export function buildProductMasterCenterViewFromApi(res) {
  const items = res.items.map(mapProductMasterDtoToRowVm)
  return {
    items,
    summaryMetrics: res.summaryMetrics,
  }
}

/**
 * @param {(ProductListItemDto | ProductDetailDto)[]} rows
 */
export function buildProductMasterCenterView(rows) {
  const items = rows.map(mapProductToMasterCenterRow)
  const published = items.filter((i) => i.publishStatus === PUBLISH_STATUS.PUBLISHED).length
  const draft = items.filter((i) => i.publishStatus === PUBLISH_STATUS.DRAFT).length
  const passive = items.filter((i) => i.publishStatus === PUBLISH_STATUS.PASSIVE).length

  return {
    items,
    summaryMetrics: [
      { id: 'total', label: 'Tek Kaynak Ürün', value: String(items.length) },
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
        id: 'passive',
        label: 'Pasif',
        value: String(passive),
        valueTone: passive > 0 ? /** @type {const} */ ('warning') : undefined,
      },
    ],
  }
}

/**
 * @param {ProductMasterCenterRowVm[]} items
 * @param {string} query
 */
export function searchMasterCenterProducts(items, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return items
  return items.filter((p) =>
    [p.name, p.productCode, p.barcode, p.brand, p.category, p.subCategory, p.supplierName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(needle),
  )
}

/**
 * @param {PublishStatus} status
 */
export function publishStatusTone(status) {
  if (status === PUBLISH_STATUS.PUBLISHED) return 'success'
  if (status === PUBLISH_STATUS.DRAFT) return 'warning'
  return 'neutral'
}
