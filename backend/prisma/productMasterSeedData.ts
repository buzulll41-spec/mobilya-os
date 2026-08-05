import type { DemoProductSeed } from './demoProducts.js'
import { PRODUCT_PUBLISH_STATUS, type ProductPublishStatus } from '../src/constants/productPublishStatus.js'
import { PRODUCT_TYPE, type ProductType } from '../src/constants/productTypes.js'

const BRAND_FALLBACK = 'Mobilya OS'

const ASSEMBLY_TYPES = ['Fabrika montajlı', 'Flat-pack', 'Saha montajı']
const COATING_TYPES = ['Lake', 'Melamin', 'Doğal ceviz', 'Mat boya']
const MECHANISM_TYPES = ['Soft-close', 'Push-open', 'Sabit', 'Yatay sürgü']
const COLOR_POOL = ['Antrasit', 'Beyaz', 'Ceviz', 'Gri', 'Krem', 'Meşe', 'Siyah', 'Vizon']
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
const TAG_POOL = ['modern', 'klasik', 'yeni-sezon', 'kampanya', 'best-seller', 'outlet']

const TECH_SPEC_POOL = [
  { label: 'Malzeme', values: ['MDF', 'Sunta', 'Masif meşe', 'Metal ayak'] },
  { label: 'Kaplama', values: ['Lake', 'Melamin', 'Doğal ceviz', 'Mat boya'] },
  { label: 'Mekanizma', values: ['Soft-close', 'Push-open', 'Sabit', 'Yatay sürgü'] },
  { label: 'Garanti', values: ['2 yıl', '3 yıl', '5 yıl'] },
  { label: 'Montaj', values: ['Fabrika montajlı', 'Flat-pack', 'Saha montajı'] },
]

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function extractBrand(productName: string): string {
  const first = productName.trim().split(/\s+/)[0]
  if (!first || first.length < 2) return BRAND_FALLBACK
  if (/^katalog$/i.test(first)) return 'Katalog'
  return first
}

function buildBarcode(productCode: string, idSeed: string): string {
  const digits = productCode.replace(/\D/g, '')
  const base = digits.padStart(8, '0').slice(-8)
  const check = String(hashSeed(idSeed) % 10)
  return `869${base}${check}`
}

function buildSlug(productName: string, productCode: string): string {
  const base = productName
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
  return base || productCode.toLowerCase()
}

function resolvePublishStatus(row: DemoProductSeed): ProductPublishStatus {
  if (!row.isActive) return PRODUCT_PUBLISH_STATUS.PASSIVE
  if (row.description && row.description.trim().length > 0) return PRODUCT_PUBLISH_STATUS.PUBLISHED
  const h = hashSeed(row.productCode)
  return h % 5 === 0 ? PRODUCT_PUBLISH_STATUS.DRAFT : PRODUCT_PUBLISH_STATUS.PUBLISHED
}

export type ProductMasterSeedFields = {
  barcode: string
  brand: string
  vatRate: number
  currency: string
  publishStatus: ProductPublishStatus
  webEnabled: boolean
  mobileEnabled: boolean
  marketplaceEnabled: boolean
  slug: string
  seoTitle: string
  seoDescription: string
  shortDescription: string
  longDescription: string
  widthCm: number
  depthCm: number
  heightCm: number
  bedSize: string | null
  tableSize: string | null
  material: string
  warrantyMonths: number
  mainImageUrl: string | null
  galleryImageUrls: string[]
  videoUrl: string | null
  catalogPdfUrl: string | null
  productHealthScore: number
  missingFields: string[]
  productType: ProductType
  collectionCode: string
  seasonCode: string
  weightKg: number
  packageWidthCm: number
  packageDepthCm: number
  packageHeightCm: number
  packageCount: number
  assemblyType: string
  coating: string
  mechanism: string
  technicalAttributes: { label: string; value: string }[]
  colorOptions: string[]
  fabricOptions: string[]
  tags: string[]
  relatedProductIds: string[]
}

/**
 * Demo ürün kartından Product Master alanlarını deterministik üretir.
 */
export function buildProductMasterSeedFields(row: DemoProductSeed): ProductMasterSeedFields {
  const idSeed = row.productCode
  const brand = extractBrand(row.productName)
  const h = hashSeed(idSeed)
  const longDescription =
    row.description?.trim() ||
    `${brand} ${row.category} ürünü — MOBILYA OS tek kaynak ürün kartı. EVTREND, mobil uygulama ve CRM bu kayıttan beslenir.`
  const shortDescription =
    longDescription.length > 120 ? `${longDescription.slice(0, 117)}…` : longDescription
  const seoTitle = `${row.productName} | ${brand} ${row.category}`
  const seoDescription = `${brand} ${row.category} — ${shortDescription}`
  const slug = buildSlug(row.productName, row.productCode)

  const w = 80 + (h % 140)
  const d = 40 + ((h >> 3) % 80)
  const ht = 35 + ((h >> 5) % 120)
  const cat = row.category.toLowerCase()
  const isBed = /yatak|baza|genç/.test(cat)
  const isDining = /yemek|masa|mutfak/.test(cat)
  const bedSizes = ['160x200 cm', '180x200 cm', '200x200 cm']
  const bedSize = isBed ? bedSizes[h % bedSizes.length] : null
  const tableSize = isDining ? `${120 + (h % 80)} × ${70 + (h % 30)} cm` : null

  const materialPool = TECH_SPEC_POOL[0]
  const material = materialPool.values[(h + 3) % materialPool.values.length]

  const hasMedia = row.isActive && h % 3 !== 0
  const slugLower = row.productCode.toLowerCase()
  const mainImageUrl = hasMedia
    ? `https://placehold.co/640x480/eceff3/5c6678?text=${encodeURIComponent(row.productName.slice(0, 18))}`
    : null
  const galleryImageUrls = hasMedia
    ? [
        'https://placehold.co/320x240/eceff3/5c6678?text=Galeri+1',
        'https://placehold.co/320x240/eceff3/5c6678?text=Galeri+2',
        'https://placehold.co/320x240/eceff3/5c6678?text=Galeri+3',
      ]
    : []
  const videoUrl = hasMedia && h % 2 === 0 ? `https://example.com/video/${slugLower}` : null
  const catalogPdfUrl = hasMedia && h % 4 !== 0 ? `https://example.com/catalog/${slugLower}.pdf` : null

  const hasImage = Boolean(mainImageUrl)
  const hasSeo = Boolean(seoTitle.trim() && seoDescription.trim())
  const hasDescription = Boolean(shortDescription.trim() && longDescription.trim())
  const hasTechnicalSpecs = Boolean(w && d && ht)

  let productHealthScore = 0
  const missingFields: string[] = []
  if (hasImage) productHealthScore += 25
  else missingFields.push('Eksik görsel')
  if (hasSeo) productHealthScore += 25
  else missingFields.push('Eksik SEO')
  if (hasDescription) productHealthScore += 25
  else missingFields.push('Eksik açıklama')
  if (hasTechnicalSpecs) productHealthScore += 25
  else missingFields.push('Eksik teknik özellik')

  const publishStatus = resolvePublishStatus(row)
  const vatRate = h % 3 === 0 ? 10 : 20
  const warrantyMonths = 24 + (h % 3) * 12

  const productType: ProductType =
    /takım|set|grup/i.test(row.productName) || row.suiteType === 'Takım'
      ? PRODUCT_TYPE.SET
      : /yatak|baza|koltuk/i.test(cat) && h % 2 === 0
        ? PRODUCT_TYPE.VARIABLE
        : PRODUCT_TYPE.SIMPLE

  const collectionCode = `COL-${String((h % 12) + 1).padStart(2, '0')}`
  const seasonCode = h % 2 === 0 ? '2026-SS' : '2025-AW'
  const weightKg = Math.round((8 + ((h >> 7) % 90)) / 10) / 10
  const packageWidthCm = w + 10
  const packageDepthCm = d + 8
  const packageHeightCm = Math.round(ht * 0.6)
  const packageCount = 1 + (h % 4)
  const assemblyType = ASSEMBLY_TYPES[h % ASSEMBLY_TYPES.length]
  const coating = COATING_TYPES[(h + 1) % COATING_TYPES.length]
  const mechanism = MECHANISM_TYPES[(h + 2) % MECHANISM_TYPES.length]
  const technicalAttributes = [
    { label: 'Malzeme', value: material },
    { label: 'Kaplama', value: coating },
    { label: 'Mekanizma', value: mechanism },
    { label: 'Montaj', value: assemblyType },
    { label: 'Garanti', value: `${Math.round(warrantyMonths / 12)} yıl` },
  ]
  const colorOptions = Array.from({ length: 2 + (h % 3) }, (_, i) => COLOR_POOL[(h + i * 5) % COLOR_POOL.length])
  const fabricOptions =
    /koltuk|oturma|kanepe/i.test(cat) && h % 4 !== 0
      ? Array.from({ length: 1 + (h % 2) }, (_, i) => FABRIC_POOL[(h + i * 7) % FABRIC_POOL.length])
      : []
  const tags = [TAG_POOL[h % TAG_POOL.length], TAG_POOL[(h + 2) % TAG_POOL.length]]

  return {
    barcode: buildBarcode(row.productCode, idSeed),
    brand,
    vatRate,
    currency: 'TRY',
    publishStatus,
    webEnabled: row.isActive,
    mobileEnabled: row.isActive,
    marketplaceEnabled: h % 3 === 0,
    slug,
    seoTitle,
    seoDescription,
    shortDescription,
    longDescription,
    widthCm: w,
    depthCm: d,
    heightCm: ht,
    bedSize,
    tableSize,
    material,
    warrantyMonths,
    mainImageUrl,
    galleryImageUrls,
    videoUrl,
    catalogPdfUrl,
    productHealthScore,
    missingFields,
    productType,
    collectionCode,
    seasonCode,
    weightKg,
    packageWidthCm,
    packageDepthCm,
    packageHeightCm,
    packageCount,
    assemblyType,
    coating,
    mechanism,
    technicalAttributes,
    colorOptions: [...new Set(colorOptions)],
    fabricOptions: [...new Set(fabricOptions)],
    tags: [...new Set(tags)],
    relatedProductIds: [],
  }
}
