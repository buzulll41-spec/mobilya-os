import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { PRODUCT_PUBLISH_STATUS, isProductPublishStatus } from '../constants/productPublishStatus.js'
import { PRODUCT_STOCK_TYPE } from '../constants/productStockTypes.js'
import { PRODUCT_TYPE } from '../constants/productTypes.js'
import {
  mapProductMasterDetailDto,
  type ProductMasterDetailDto,
} from '../contracts/productMasterDto.js'
import { computePersistedMasterHealth } from '../lib/productMasterHealth.js'
import { resolveProductPurchaseCost } from '../lib/productPurchaseCost.js'
import {
  parseBooleanField,
  parseDisplayFloor,
  parseExternalSupplyType,
  parseOptionalStringField,
  parsePackageCount,
  parsePhysicalLocation,
  parseProductType,
  parseSalesSourceType,
  parseStockType,
  parseStringArrayField,
  parseTechnicalAttributes,
  parseWeight,
} from '../lib/productMasterFieldParse.js'

export type CreateProductMasterRequest = {
  name: string
  code: string
  barcode?: string
  brand?: string
  category: string
  subCategory?: string
  supplierId?: string
  wholesalePrice?: number
  wholesaleDiscountRate?: number
  costPrice?: number
  listPrice?: number
  salePrice?: number
  vatRate?: number
  slug?: string
  seoTitle?: string
  seoDescription?: string
  shortDescription?: string
  longDescription?: string
  width?: number
  depth?: number
  height?: number
  material?: string
  warrantyMonths?: number
  deliveryTimeDays?: number
  mainImageUrl?: string
  galleryImageUrls?: string[]
  videoUrl?: string
  catalogPdfUrl?: string
  publishStatus?: string
  productType?: string
  collectionCode?: string
  seasonCode?: string
  weightKg?: number
  packageWidthCm?: number
  packageDepthCm?: number
  packageHeightCm?: number
  packageCount?: number
  assemblyType?: string
  coating?: string
  mechanism?: string
  technicalAttributes?: { label: string; value: string }[]
  colorOptions?: string[]
  fabricOptions?: string[]
  tags?: string[]
  relatedProductIds?: string[]
  stockType?: string
  salesSourceType?: string | null
  displayFloor?: string | null
  physicalLocation?: string | null
  externalSupplyType?: string | null
  webEnabled?: boolean
  mobileEnabled?: boolean
  marketplaceEnabled?: boolean
}

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function parseMoney(v: unknown, field: string, required = false): number | undefined {
  if (v === undefined || v === null || v === '') {
    if (required) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Required' })
    }
    return undefined
  }
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parsePositiveInt(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return n
}

function parseDimension(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parseGalleryUrls(v: unknown): string[] | undefined {
  if (v === undefined) return undefined
  if (!Array.isArray(v)) {
    throw new AppHttpError(400, 'galleryImageUrls geçersiz', 'Bad Request')
  }
  return v.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function assertValidCreateProductMasterRequest(body: unknown): CreateProductMasterRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>

  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const code = typeof o.code === 'string' ? o.code.trim() : ''
  const category = typeof o.category === 'string' ? o.category.trim() : ''

  const details: Record<string, string> = {}
  if (!name) details.name = 'Required'
  if (!code) details.code = 'Required'
  if (!category) details.category = 'Required'
  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  let publishStatus: string | undefined
  if (o.publishStatus !== undefined) {
    const ps = typeof o.publishStatus === 'string' ? o.publishStatus.trim() : ''
    if (!isProductPublishStatus(ps)) {
      throw new AppHttpError(400, 'Geçersiz yayın durumu', 'Bad Request', { publishStatus: 'Invalid' })
    }
    publishStatus = ps
  }

  const listPrice = parseMoney(o.listPrice, 'listPrice')
  const salePrice = parseMoney(o.salePrice, 'salePrice')
  const costPrice = parseMoney(o.costPrice, 'costPrice')
  const wholesalePrice = parseMoney(o.wholesalePrice, 'wholesalePrice')
  const wholesaleDiscountRate = parseMoney(o.wholesaleDiscountRate, 'wholesaleDiscountRate')

  return {
    name,
    code,
    category,
    ...(optString(o.barcode) ? { barcode: optString(o.barcode) } : {}),
    ...(optString(o.brand) ? { brand: optString(o.brand) } : {}),
    ...(optString(o.subCategory) ? { subCategory: optString(o.subCategory) } : {}),
    ...(optString(o.supplierId) ? { supplierId: optString(o.supplierId) } : {}),
    ...(costPrice !== undefined ? { costPrice } : {}),
    ...(wholesalePrice !== undefined ? { wholesalePrice } : {}),
    ...(wholesaleDiscountRate !== undefined ? { wholesaleDiscountRate } : {}),
    ...(listPrice !== undefined ? { listPrice } : {}),
    ...(salePrice !== undefined ? { salePrice } : {}),
    ...(o.vatRate !== undefined && o.vatRate !== null && o.vatRate !== ''
      ? { vatRate: parseMoney(o.vatRate, 'vatRate') }
      : {}),
    ...(optString(o.slug) ? { slug: optString(o.slug) } : {}),
    ...(optString(o.seoTitle) ? { seoTitle: optString(o.seoTitle) } : {}),
    ...(optString(o.seoDescription) ? { seoDescription: optString(o.seoDescription) } : {}),
    ...(optString(o.shortDescription) ? { shortDescription: optString(o.shortDescription) } : {}),
    ...(optString(o.longDescription) ? { longDescription: optString(o.longDescription) } : {}),
    ...(parseDimension(o.width, 'width') !== undefined
      ? { width: parseDimension(o.width, 'width') }
      : {}),
    ...(parseDimension(o.depth, 'depth') !== undefined
      ? { depth: parseDimension(o.depth, 'depth') }
      : {}),
    ...(parseDimension(o.height, 'height') !== undefined
      ? { height: parseDimension(o.height, 'height') }
      : {}),
    ...(optString(o.material) ? { material: optString(o.material) } : {}),
    ...(parsePositiveInt(o.warrantyMonths, 'warrantyMonths') !== undefined
      ? { warrantyMonths: parsePositiveInt(o.warrantyMonths, 'warrantyMonths') }
      : {}),
    ...(parsePositiveInt(o.deliveryTimeDays, 'deliveryTimeDays') !== undefined
      ? { deliveryTimeDays: parsePositiveInt(o.deliveryTimeDays, 'deliveryTimeDays') }
      : {}),
    ...(optString(o.mainImageUrl) ? { mainImageUrl: optString(o.mainImageUrl) } : {}),
    ...(parseGalleryUrls(o.galleryImageUrls) !== undefined
      ? { galleryImageUrls: parseGalleryUrls(o.galleryImageUrls) }
      : {}),
    ...(optString(o.videoUrl) ? { videoUrl: optString(o.videoUrl) } : {}),
    ...(optString(o.catalogPdfUrl) ? { catalogPdfUrl: optString(o.catalogPdfUrl) } : {}),
    ...(publishStatus ? { publishStatus } : {}),
    ...(parseProductType(o.productType) ? { productType: parseProductType(o.productType) } : {}),
    ...(parseOptionalStringField(o.collectionCode)
      ? { collectionCode: parseOptionalStringField(o.collectionCode) }
      : {}),
    ...(parseOptionalStringField(o.seasonCode)
      ? { seasonCode: parseOptionalStringField(o.seasonCode) }
      : {}),
    ...(parseWeight(o.weightKg, 'weightKg') !== undefined
      ? { weightKg: parseWeight(o.weightKg, 'weightKg') }
      : {}),
    ...(parseDimension(o.packageWidthCm, 'packageWidthCm') !== undefined
      ? { packageWidthCm: parseDimension(o.packageWidthCm, 'packageWidthCm') }
      : {}),
    ...(parseDimension(o.packageDepthCm, 'packageDepthCm') !== undefined
      ? { packageDepthCm: parseDimension(o.packageDepthCm, 'packageDepthCm') }
      : {}),
    ...(parseDimension(o.packageHeightCm, 'packageHeightCm') !== undefined
      ? { packageHeightCm: parseDimension(o.packageHeightCm, 'packageHeightCm') }
      : {}),
    ...(parsePackageCount(o.packageCount, 'packageCount') !== undefined
      ? { packageCount: parsePackageCount(o.packageCount, 'packageCount') }
      : {}),
    ...(parseOptionalStringField(o.assemblyType)
      ? { assemblyType: parseOptionalStringField(o.assemblyType) }
      : {}),
    ...(parseOptionalStringField(o.coating) ? { coating: parseOptionalStringField(o.coating) } : {}),
    ...(parseOptionalStringField(o.mechanism)
      ? { mechanism: parseOptionalStringField(o.mechanism) }
      : {}),
    ...(parseTechnicalAttributes(o.technicalAttributes) !== undefined
      ? { technicalAttributes: parseTechnicalAttributes(o.technicalAttributes) }
      : {}),
    ...(parseStringArrayField(o.colorOptions, 'colorOptions') !== undefined
      ? { colorOptions: parseStringArrayField(o.colorOptions, 'colorOptions') }
      : {}),
    ...(parseStringArrayField(o.fabricOptions, 'fabricOptions') !== undefined
      ? { fabricOptions: parseStringArrayField(o.fabricOptions, 'fabricOptions') }
      : {}),
    ...(parseStringArrayField(o.tags, 'tags') !== undefined
      ? { tags: parseStringArrayField(o.tags, 'tags') }
      : {}),
    ...(parseStringArrayField(o.relatedProductIds, 'relatedProductIds') !== undefined
      ? { relatedProductIds: parseStringArrayField(o.relatedProductIds, 'relatedProductIds') }
      : {}),
    ...(parseStockType(o.stockType) ? { stockType: parseStockType(o.stockType) } : {}),
    ...(parseSalesSourceType(o.salesSourceType) !== undefined
      ? { salesSourceType: parseSalesSourceType(o.salesSourceType) }
      : {}),
    ...(parseDisplayFloor(o.displayFloor) !== undefined
      ? { displayFloor: parseDisplayFloor(o.displayFloor) }
      : {}),
    ...(parsePhysicalLocation(o.physicalLocation) !== undefined
      ? { physicalLocation: parsePhysicalLocation(o.physicalLocation) }
      : {}),
    ...(parseExternalSupplyType(o.externalSupplyType) !== undefined
      ? { externalSupplyType: parseExternalSupplyType(o.externalSupplyType) }
      : {}),
    ...(parseBooleanField(o.webEnabled) !== undefined
      ? { webEnabled: parseBooleanField(o.webEnabled) }
      : {}),
    ...(parseBooleanField(o.mobileEnabled) !== undefined
      ? { mobileEnabled: parseBooleanField(o.mobileEnabled) }
      : {}),
    ...(parseBooleanField(o.marketplaceEnabled) !== undefined
      ? { marketplaceEnabled: parseBooleanField(o.marketplaceEnabled) }
      : {}),
  }
}

function resolvePrices(body: CreateProductMasterRequest) {
  const listPrice = body.listPrice ?? body.salePrice ?? 0
  const salePrice = body.salePrice ?? listPrice
  const minSalePrice = Math.min(listPrice, salePrice)
  const purchase = resolveProductPurchaseCost({
    wholesalePrice: body.wholesalePrice,
    wholesaleDiscountRate: body.wholesaleDiscountRate,
    costPrice: body.costPrice,
  })
  if (minSalePrice > listPrice) {
    throw new AppHttpError(400, 'İndirimli fiyat liste fiyatından büyük olamaz', 'Bad Request')
  }
  return {
    listPrice,
    minSalePrice,
    purchasePrice: purchase.netPurchasePrice,
    wholesalePrice: purchase.wholesalePrice,
    wholesaleDiscountRate: purchase.wholesaleDiscountRate,
  }
}

export async function createProductMaster(
  prisma: PrismaClient,
  body: CreateProductMasterRequest,
): Promise<ProductMasterDetailDto> {
  const dup = await prisma.product.findUnique({ where: { productCode: body.code } })
  if (dup) {
    throw new AppHttpError(409, 'Bu ürün kodu zaten kullanılıyor', 'Conflict', { code: 'Duplicate' })
  }

  if (body.supplierId) {
    const sup = await prisma.supplier.findUnique({ where: { id: body.supplierId } })
    if (!sup) {
      throw new AppHttpError(400, 'Tedarikçi bulunamadı', 'Bad Request')
    }
  }

  const publishStatus = body.publishStatus ?? PRODUCT_PUBLISH_STATUS.DRAFT
  const isActive = publishStatus !== PRODUCT_PUBLISH_STATUS.PASSIVE
  const webEnabled = body.webEnabled ?? isActive
  const mobileEnabled = body.mobileEnabled ?? isActive
  const marketplaceEnabled = body.marketplaceEnabled ?? false
  const { listPrice, minSalePrice, purchasePrice, wholesalePrice, wholesaleDiscountRate } =
    resolvePrices(body)
  const deliveryDays = body.deliveryTimeDays ?? 14
  const brand = body.brand ?? body.name.trim().split(/\s+/)[0] ?? 'Mobilya OS'
  const longDescription = body.longDescription ?? ''
  const shortDescription = body.shortDescription ?? longDescription.slice(0, 120)
  const seoTitle = body.seoTitle ?? `${body.name} | ${brand} ${body.category}`
  const seoDescription = body.seoDescription ?? `${brand} ${body.category} — ${shortDescription}`
  const slug = body.slug ?? body.code.toLowerCase()

  const health = computePersistedMasterHealth({
    mainImageUrl: body.mainImageUrl ?? null,
    seoTitle,
    seoDescription,
    shortDescription,
    longDescription,
    technicalAttributes: [],
    activeVariantCount: 0,
  })

  const row = await prisma.product.create({
    data: {
      productCode: body.code,
      productName: body.name,
      category: body.category,
      suiteType: body.subCategory ?? null,
      defaultSalePrice: new Prisma.Decimal(listPrice),
      minSalePrice: new Prisma.Decimal(minSalePrice),
      wholesalePrice: new Prisma.Decimal(wholesalePrice),
      wholesaleDiscountRate: new Prisma.Decimal(wholesaleDiscountRate),
      purchasePrice: new Prisma.Decimal(purchasePrice),
      defaultSupplierId: body.supplierId ?? null,
      deliveryDays,
      isActive,
      stockType: body.stockType ?? PRODUCT_STOCK_TYPE.ORDER,
      description: longDescription || null,
      salesSourceType: body.salesSourceType ?? null,
      displayFloor: body.displayFloor ?? null,
      physicalLocation: body.physicalLocation ?? null,
      externalSupplyType: body.externalSupplyType ?? null,
      productType: body.productType ?? PRODUCT_TYPE.SIMPLE,
      collectionCode: body.collectionCode ?? null,
      seasonCode: body.seasonCode ?? null,
      weightKg: body.weightKg != null ? new Prisma.Decimal(body.weightKg) : null,
      packageWidthCm:
        body.packageWidthCm != null ? new Prisma.Decimal(body.packageWidthCm) : null,
      packageDepthCm:
        body.packageDepthCm != null ? new Prisma.Decimal(body.packageDepthCm) : null,
      packageHeightCm:
        body.packageHeightCm != null ? new Prisma.Decimal(body.packageHeightCm) : null,
      packageCount: body.packageCount ?? null,
      assemblyType: body.assemblyType ?? null,
      coating: body.coating ?? null,
      mechanism: body.mechanism ?? null,
      technicalAttributes: body.technicalAttributes ?? [],
      colorOptions: body.colorOptions ?? [],
      fabricOptions: body.fabricOptions ?? [],
      tags: body.tags ?? [],
      relatedProductIds: body.relatedProductIds ?? [],
      barcode: body.barcode ?? null,
      brand,
      vatRate: body.vatRate != null ? new Prisma.Decimal(body.vatRate) : new Prisma.Decimal(20),
      currency: 'TRY',
      publishStatus,
      webEnabled,
      mobileEnabled,
      marketplaceEnabled,
      slug,
      seoTitle,
      seoDescription,
      shortDescription,
      longDescription: longDescription || null,
      widthCm: body.width != null ? new Prisma.Decimal(body.width) : null,
      depthCm: body.depth != null ? new Prisma.Decimal(body.depth) : null,
      heightCm: body.height != null ? new Prisma.Decimal(body.height) : null,
      material: body.material ?? null,
      warrantyMonths: body.warrantyMonths ?? null,
      mainImageUrl: body.mainImageUrl ?? null,
      galleryImageUrls: body.galleryImageUrls ?? [],
      videoUrl: body.videoUrl ?? null,
      catalogPdfUrl: body.catalogPdfUrl ?? null,
      productHealthScore: health.productHealthScore,
      missingFields: health.missingFields,
    },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })

  return mapProductMasterDetailDto(row)
}
