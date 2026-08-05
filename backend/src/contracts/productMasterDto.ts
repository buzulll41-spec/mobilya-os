import type { Product, Supplier, ProductVariant, ProductMediaLink, MediaAsset } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { decimalToNumber } from '../lib/money.js'
import {
  isProductPublishStatus,
  productPublishStatusLabelTr,
  type ProductPublishStatus,
} from '../constants/productPublishStatus.js'
import {
  isProductStockType,
  productStockTypeLabelTr,
  type ProductStockType,
} from '../constants/productStockTypes.js'
import {
  isProductType,
  productTypeLabelTr,
  type ProductType,
} from '../constants/productTypes.js'
import {
  isSalesSourceType,
  salesSourceTypeLabelTr,
  type SalesSourceType,
} from '../constants/salesSourceTypes.js'
import {
  isDisplayFloor,
  displayFloorLabelTr,
  type DisplayFloor,
} from '../constants/displayFloors.js'
import {
  isPhysicalLocation,
  physicalLocationLabelTr,
  type PhysicalLocation,
} from '../constants/physicalLocations.js'
import {
  isExternalSupplyType,
  externalSupplyTypeLabelTr,
  type ExternalSupplyType,
} from '../constants/externalSupplyTypes.js'
import { computeMarginRatio } from './productDto.js'
import { mapProductVariantDtos, type ProductMasterVariantDto } from './productVariantDto.js'
import { resolveProductMedia } from '../lib/resolveProductMedia.js'
import { calculateProductHealth } from '../lib/calculateProductHealth.js'
import { calculateWooReadiness } from '../lib/calculateWooReadiness.js'
import {
  resolveEffectiveWooStatus,
  wooProductStatusLabelTr,
  wooProductStatusTone,
  type WooProductStatus,
} from '../constants/wooProductStatus.js'

export type { ProductMasterVariantDto } from './productVariantDto.js'

export type ProductMasterTechnicalSpecDto = {
  label: string
  value: string
}

export type ProductMasterDimensionsDto = {
  productMeasure: string
  width: string
  height: string
  depth: string
  weight: string
  bedSize: string | null
  tableSize: string | null
}

export type ProductMasterMediaDto = {
  mainImageUrl: string | null
  galleryImageUrls: string[]
  videoUrl: string | null
  catalogPdfUrl: string | null
}

export type ProductMasterHealthCheckDto = {
  hasHeroImage: boolean
  hasGallery: boolean
  hasPdf: boolean
  hasSeoTitle: boolean
  hasSeoDescription: boolean
  hasShortDescription: boolean
  hasLongDescription: boolean
  hasTechnicalAttributes: boolean
  hasActiveVariant: boolean
}

export type ProductMasterHealthScoreDto = {
  score: number
  tone: 'success' | 'warning' | 'critical'
  checks: ProductMasterHealthCheckDto
  missingLabels: string[]
}

export type ProductMasterListItemDto = {
  id: string
  productCode: string
  barcode: string
  name: string
  brand: string
  category: string
  subCategory: string
  thumbnailUrl: string | null
  listPrice: string
  salePrice: string
  discountedPrice: string
  vatRate: string
  currency: string
  supplierId: string | null
  supplierName: string | null
  wholesalePrice: string
  wholesaleDiscountRate: string
  netPurchasePrice: string
  purchaseCost: string
  profitAmount: number
  profitPercent: number
  deliveryDays: number
  seoTitle: string
  seoDescription: string
  shortDescription: string
  longDescription: string
  slug: string
  technicalSpecs: ProductMasterTechnicalSpecDto[]
  dimensions: ProductMasterDimensionsDto
  colorOptions: string[]
  fabricOptions: string[]
  variants: ProductMasterVariantDto[]
  publishStatus: ProductPublishStatus
  publishStatusLabel: string
  webEnabled: boolean
  mobileEnabled: boolean
  marketplaceEnabled: boolean
  media: ProductMasterMediaDto
  healthScore: ProductMasterHealthScoreDto
  productHealthScore: number
  missingFields: string[]
  isActive: boolean
  productType: ProductType
  productTypeLabel: string
  collectionCode: string | null
  seasonCode: string | null
  weightKg: number | null
  packageWidthCm: number | null
  packageDepthCm: number | null
  packageHeightCm: number | null
  packageCount: number | null
  assemblyType: string | null
  coating: string | null
  mechanism: string | null
  technicalAttributes: ProductMasterTechnicalSpecDto[]
  material: string | null
  warrantyMonths: number | null
  bedSize: string | null
  tableSize: string | null
  tags: string[]
  relatedProductIds: string[]
  stockType: ProductStockType
  stockTypeLabel: string
  salesSourceType: SalesSourceType | null
  salesSourceTypeLabel: string | null
  displayFloor: DisplayFloor | null
  displayFloorLabel: string | null
  physicalLocation: PhysicalLocation | null
  physicalLocationLabel: string | null
  externalSupplyType: ExternalSupplyType | null
  externalSupplyTypeLabel: string | null
  woo: ProductMasterWooDto
}

export type ProductMasterWooDto = {
  productId: number | null
  status: WooProductStatus
  statusLabel: string
  statusTone: 'success' | 'warning' | 'critical' | 'info' | 'neutral'
  lastSyncAt: string | null
  lastError: string | null
  syncRequired: boolean
  categoryId: number | null
  readiness: 'READY' | 'NOT_READY'
  readinessMissingLabels: string[]
}

export type ProductMasterDetailDto = ProductMasterListItemDto & {
  updatedAt: string
}

export type ProductMasterListResponseDto = {
  items: ProductMasterListItemDto[]
  summaryMetrics: {
    id: string
    label: string
    value: string
    valueTone?: 'success' | 'warning'
  }[]
  total: number
  page: number
  pageSize: number
}

type ProductRow = Product & {
  defaultSupplier?: Pick<Supplier, 'id' | 'companyName'> | null
  variants?: ProductVariant[]
  mediaLinks?: (ProductMediaLink & { asset: MediaAsset })[]
}

function parseJsonStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
}

function parseTechnicalAttributesJson(raw: unknown): ProductMasterTechnicalSpecDto[] {
  if (!Array.isArray(raw)) return []
  const specs: ProductMasterTechnicalSpecDto[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label.trim() : ''
    const value = typeof o.value === 'string' ? o.value.trim() : ''
    if (label && value) specs.push({ label, value })
  }
  return specs
}

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function buildTechnicalSpecs(row: ProductRow): ProductMasterTechnicalSpecDto[] {
  const persisted = parseTechnicalAttributesJson(row.technicalAttributes)
  if (persisted.length > 0) return persisted

  const specs: ProductMasterTechnicalSpecDto[] = []
  if (row.material) specs.push({ label: 'Malzeme', value: row.material })
  if (row.coating) specs.push({ label: 'Kaplama', value: row.coating })
  if (row.mechanism) specs.push({ label: 'Mekanizma', value: row.mechanism })
  if (row.assemblyType) specs.push({ label: 'Montaj', value: row.assemblyType })
  if (row.warrantyMonths != null) {
    const years = Math.round(row.warrantyMonths / 12)
    specs.push({ label: 'Garanti', value: `${years} yıl` })
  }
  return specs
}

function buildDimensions(row: ProductRow): ProductMasterDimensionsDto {
  const h = hashSeed(`${row.id}-dims`)
  const w = row.widthCm != null ? Number(row.widthCm) : 80 + (h % 140)
  const d = row.depthCm != null ? Number(row.depthCm) : 40 + ((h >> 3) % 80)
  const ht = row.heightCm != null ? Number(row.heightCm) : 35 + ((h >> 5) % 120)
  const kg =
    row.weightKg != null ? Number(row.weightKg) : Math.round((8 + ((h >> 7) % 90)) / 10) / 10
  return {
    productMeasure: `${w} × ${d} × ${ht} cm`,
    width: `${w} cm`,
    height: `${ht} cm`,
    depth: `${d} cm`,
    weight: `${kg.toFixed(1)} kg`,
    bedSize: row.bedSize,
    tableSize: row.tableSize,
  }
}

function resolveVariants(row: ProductRow): ProductMasterVariantDto[] {
  if (row.variants && row.variants.length > 0) {
    return mapProductVariantDtos(row.variants.filter((v) => v.isActive))
  }
  return []
}

function buildColorOptions(row: ProductRow): string[] {
  const persisted = parseJsonStringArray(row.colorOptions)
  return persisted.length > 0 ? persisted : []
}

function buildFabricOptions(row: ProductRow): string[] {
  const persisted = parseJsonStringArray(row.fabricOptions)
  return persisted.length > 0 ? persisted : []
}

function computeHealthScore(
  media: ProductMasterMediaDto,
  seoTitle: string,
  seoDescription: string,
  shortDescription: string,
  longDescription: string,
  technicalSpecs: ProductMasterTechnicalSpecDto[],
  technicalAttributes: ProductMasterTechnicalSpecDto[],
  activeVariantCount: number,
): ProductMasterHealthScoreDto {
  const result = calculateProductHealth({
    mainImageUrl: media.mainImageUrl,
    galleryImageUrls: media.galleryImageUrls,
    catalogPdfUrl: media.catalogPdfUrl,
    seoTitle,
    seoDescription,
    shortDescription,
    longDescription,
    technicalAttributes,
    technicalSpecs,
    activeVariantCount,
  })

  return {
    score: result.score,
    tone: result.tone,
    checks: result.checks,
    missingLabels: result.missingLabels,
  }
}

export function mapProductMasterDto(row: ProductRow): ProductMasterListItemDto {
  const sale = Number(row.defaultSalePrice)
  const purchase = Number(row.purchasePrice)
  const profitAmount =
    Number.isFinite(sale) && Number.isFinite(purchase)
      ? Math.round((sale - purchase) * 100) / 100
      : 0
  const profitPercent = Math.round(computeMarginRatio(sale, purchase) * 100)

  const publishStatus: ProductPublishStatus =
    typeof row.publishStatus === 'string' && isProductPublishStatus(row.publishStatus)
      ? row.publishStatus
      : row.isActive
        ? 'PUBLISHED'
        : 'PASSIVE'

  const mediaLinks = row.mediaLinks ?? []
  const media: ProductMasterMediaDto = resolveProductMedia(row, mediaLinks)
  const mainImageUrl = media.mainImageUrl

  const longDescription = row.longDescription ?? row.description ?? ''
  const shortDescription = row.shortDescription ?? longDescription.slice(0, 120)
  const brand = row.brand ?? row.productName.trim().split(/\s+/)[0] ?? 'Mobilya OS'
  const seoTitle = row.seoTitle ?? `${row.productName} | ${brand} ${row.category}`
  const seoDescription =
    row.seoDescription ?? `${brand} ${row.category} — ${shortDescription}`
  const slug = row.slug ?? row.productCode.toLowerCase()
  const barcode = row.barcode ?? `869${row.productCode.replace(/\D/g, '').padStart(8, '0').slice(-8)}`
  const vatRateNum = row.vatRate != null ? Number(row.vatRate) : 20

  const technicalSpecs = buildTechnicalSpecs(row)
  const dimensions = buildDimensions(row)
  const colorOptions = buildColorOptions(row)
  const fabricOptions = buildFabricOptions(row)
  const tags = parseJsonStringArray(row.tags)
  const relatedProductIds = parseJsonStringArray(row.relatedProductIds)
  const technicalAttributes = parseTechnicalAttributesJson(row.technicalAttributes)

  const productType: ProductType =
    typeof row.productType === 'string' && isProductType(row.productType)
      ? row.productType
      : 'SIMPLE'

  const stockType: ProductStockType =
    typeof row.stockType === 'string' && isProductStockType(row.stockType)
      ? row.stockType
      : 'ORDER'

  const salesSourceType =
    typeof row.salesSourceType === 'string' && isSalesSourceType(row.salesSourceType)
      ? row.salesSourceType
      : null
  const displayFloor =
    typeof row.displayFloor === 'string' && isDisplayFloor(row.displayFloor)
      ? row.displayFloor
      : null
  const physicalLocation =
    typeof row.physicalLocation === 'string' && isPhysicalLocation(row.physicalLocation)
      ? row.physicalLocation
      : null
  const externalSupplyType =
    typeof row.externalSupplyType === 'string' && isExternalSupplyType(row.externalSupplyType)
      ? row.externalSupplyType
      : null

  const variantRows = resolveVariants(row)
  const wooReadiness = calculateWooReadiness({
    category: row.category,
    mainImageUrl: media.mainImageUrl,
    seoTitle,
    shortDescription,
    longDescription,
    salePrice: sale,
    productType,
    activeVariantCount: variantRows.length,
  })
  const effectiveWooStatus = resolveEffectiveWooStatus(row.wooStatus, wooReadiness.status)

  const healthScore = computeHealthScore(
    media,
    seoTitle,
    seoDescription,
    shortDescription,
    longDescription,
    technicalSpecs,
    technicalAttributes,
    variantRows.length,
  )

  const woo: ProductMasterWooDto = {
    productId: row.wooProductId,
    status: effectiveWooStatus,
    statusLabel: wooProductStatusLabelTr(effectiveWooStatus),
    statusTone: wooProductStatusTone(effectiveWooStatus),
    lastSyncAt: row.wooLastSyncAt?.toISOString() ?? null,
    lastError: row.wooLastError,
    syncRequired: row.wooSyncRequired,
    categoryId: row.wooCategoryId,
    readiness: wooReadiness.status,
    readinessMissingLabels: wooReadiness.missingLabels,
  }

  return {
    id: row.id,
    productCode: row.productCode,
    barcode,
    name: row.productName,
    brand,
    category: row.category,
    subCategory: row.suiteType ?? '—',
    thumbnailUrl: mainImageUrl,
    listPrice: formatMoneyAmount(decimalToNumber(row.defaultSalePrice)),
    salePrice: formatMoneyAmount(decimalToNumber(row.defaultSalePrice)),
    discountedPrice: formatMoneyAmount(decimalToNumber(row.minSalePrice)),
    vatRate: `%${vatRateNum}`,
    currency: row.currency ?? 'TRY',
    supplierId: row.defaultSupplierId,
    supplierName: row.defaultSupplier?.companyName ?? null,
    wholesalePrice: formatMoneyAmount(decimalToNumber(row.wholesalePrice)),
    wholesaleDiscountRate: formatMoneyAmount(decimalToNumber(row.wholesaleDiscountRate)),
    netPurchasePrice: formatMoneyAmount(decimalToNumber(row.purchasePrice)),
    purchaseCost: formatMoneyAmount(decimalToNumber(row.purchasePrice)),
    profitAmount,
    profitPercent,
    deliveryDays: row.deliveryDays,
    seoTitle,
    seoDescription,
    shortDescription,
    longDescription,
    slug,
    technicalSpecs,
    dimensions,
    colorOptions,
    fabricOptions,
    variants: resolveVariants(row),
    publishStatus,
    publishStatusLabel: productPublishStatusLabelTr(publishStatus),
    webEnabled: row.webEnabled,
    mobileEnabled: row.mobileEnabled,
    marketplaceEnabled: row.marketplaceEnabled,
    media,
    healthScore,
    productHealthScore: healthScore.score,
    missingFields: healthScore.missingLabels,
    isActive: row.isActive,
    productType,
    productTypeLabel: productTypeLabelTr(productType),
    collectionCode: row.collectionCode ?? null,
    seasonCode: row.seasonCode ?? null,
    weightKg: row.weightKg != null ? Number(row.weightKg) : null,
    packageWidthCm: row.packageWidthCm != null ? Number(row.packageWidthCm) : null,
    packageDepthCm: row.packageDepthCm != null ? Number(row.packageDepthCm) : null,
    packageHeightCm: row.packageHeightCm != null ? Number(row.packageHeightCm) : null,
    packageCount: row.packageCount ?? null,
    assemblyType: row.assemblyType ?? null,
    coating: row.coating ?? null,
    mechanism: row.mechanism ?? null,
    technicalAttributes,
    tags,
    relatedProductIds,
    material: row.material ?? null,
    warrantyMonths: row.warrantyMonths ?? null,
    bedSize: row.bedSize ?? null,
    tableSize: row.tableSize ?? null,
    stockType,
    stockTypeLabel: productStockTypeLabelTr(stockType),
    salesSourceType,
    salesSourceTypeLabel: salesSourceType ? salesSourceTypeLabelTr(salesSourceType) : null,
    displayFloor,
    displayFloorLabel: displayFloor ? displayFloorLabelTr(displayFloor) : null,
    physicalLocation,
    physicalLocationLabel: physicalLocation ? physicalLocationLabelTr(physicalLocation) : null,
    externalSupplyType,
    externalSupplyTypeLabel: externalSupplyType
      ? externalSupplyTypeLabelTr(externalSupplyType)
      : null,
    woo,
  }
}

export function mapProductMasterDetailDto(row: ProductRow): ProductMasterDetailDto {
  return {
    ...mapProductMasterDto(row),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function buildProductMasterSummaryMetrics(
  items: ProductMasterListItemDto[],
): ProductMasterListResponseDto['summaryMetrics'] {
  const published = items.filter((i) => i.publishStatus === 'PUBLISHED').length
  const wooReady = items.filter((i) => i.woo.status === 'READY').length
  const wooNotReady = items.filter((i) => i.woo.status === 'NOT_READY').length
  const wooPending = items.filter((i) => i.woo.status === 'SYNC_PENDING').length
  const wooError = items.filter((i) => i.woo.status === 'ERROR').length
  const healthFull = items.filter((i) => i.healthScore.score === 100).length
  const healthLow = items.filter((i) => i.healthScore.score < 80).length
  const missingMedia = items.filter(
    (i) =>
      !i.healthScore.checks.hasHeroImage ||
      !i.healthScore.checks.hasGallery ||
      !i.healthScore.checks.hasPdf,
  ).length
  const missingVariant = items.filter((i) => !i.healthScore.checks.hasActiveVariant).length

  return [
    { id: 'total', label: 'Tek Kaynak Ürün', value: String(items.length) },
    {
      id: 'published',
      label: 'Yayında',
      value: String(published),
      valueTone: 'success',
    },
    {
      id: 'health-full',
      label: 'Tam Sağlıklı',
      value: String(healthFull),
      valueTone: 'success',
    },
    {
      id: 'health-low',
      label: 'Sağlık <80',
      value: String(healthLow),
      valueTone: healthLow > 0 ? 'warning' : undefined,
    },
    {
      id: 'missing-media',
      label: 'Eksik Medya',
      value: String(missingMedia),
      valueTone: missingMedia > 0 ? 'warning' : undefined,
    },
    {
      id: 'missing-variant',
      label: 'Eksik Varyant',
      value: String(missingVariant),
      valueTone: missingVariant > 0 ? 'warning' : undefined,
    },
    {
      id: 'woo-ready',
      label: 'Woo Hazır',
      value: String(wooReady),
      valueTone: 'success',
    },
    {
      id: 'woo-not-ready',
      label: 'Woo Eksik',
      value: String(wooNotReady),
      valueTone: wooNotReady > 0 ? 'warning' : undefined,
    },
    {
      id: 'woo-pending',
      label: 'Sync Bekleyen',
      value: String(wooPending),
      valueTone: wooPending > 0 ? 'warning' : undefined,
    },
    {
      id: 'woo-error',
      label: 'Woo Hatalı',
      value: String(wooError),
      valueTone: wooError > 0 ? 'warning' : undefined,
    },
  ]
}
