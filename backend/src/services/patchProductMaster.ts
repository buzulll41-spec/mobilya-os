import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { isProductPublishStatus } from '../constants/productPublishStatus.js'
import {
  mapProductMasterDetailDto,
  type ProductMasterDetailDto,
} from '../contracts/productMasterDto.js'
import { computePersistedMasterHealth } from '../lib/productMasterHealth.js'
import { resolveProductPurchaseCost } from '../lib/productPurchaseCost.js'
import {
  parseDisplayFloor,
  parseExternalSupplyType,
  parseNullableStringField,
  parsePhysicalLocation,
  parseProductType,
  parseSalesSourceType,
  parseStockType,
  parseStringArrayField,
  parseTechnicalAttributes,
  parseWeight,
} from '../lib/productMasterFieldParse.js'

export type PatchProductMasterRequest = Partial<{
  name: string
  code: string
  barcode: string | null
  brand: string
  category: string
  subCategory: string | null
  supplierId: string | null
  wholesalePrice: number
  wholesaleDiscountRate: number
  costPrice: number
  listPrice: number
  salePrice: number
  vatRate: number
  slug: string
  seoTitle: string
  seoDescription: string
  shortDescription: string
  longDescription: string
  width: number
  depth: number
  height: number
  material: string | null
  warrantyMonths: number | null
  deliveryTimeDays: number
  mainImageUrl: string | null
  galleryImageUrls: string[]
  videoUrl: string | null
  catalogPdfUrl: string | null
  publishStatus: string
  webEnabled: boolean
  mobileEnabled: boolean
  marketplaceEnabled: boolean
  productType: string
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
  technicalAttributes: { label: string; value: string }[]
  colorOptions: string[]
  fabricOptions: string[]
  tags: string[]
  relatedProductIds: string[]
  stockType: string
  salesSourceType: string | null
  displayFloor: string | null
  physicalLocation: string | null
  externalSupplyType: string | null
}>

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function parseMoney(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parsePositiveInt(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return n
}

function parseDimension(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

export function assertValidPatchProductMasterRequest(body: unknown): PatchProductMasterRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const patch: PatchProductMasterRequest = {}

  if ('name' in o) {
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name) throw new AppHttpError(400, 'Ürün adı boş olamaz', 'Bad Request', { name: 'Required' })
    patch.name = name
  }
  if ('code' in o) {
    const code = typeof o.code === 'string' ? o.code.trim() : ''
    if (!code) throw new AppHttpError(400, 'Ürün kodu boş olamaz', 'Bad Request', { code: 'Required' })
    patch.code = code
  }
  if ('category' in o) {
    const category = typeof o.category === 'string' ? o.category.trim() : ''
    if (!category) throw new AppHttpError(400, 'Kategori boş olamaz', 'Bad Request', { category: 'Required' })
    patch.category = category
  }
  if ('barcode' in o) {
    patch.barcode = o.barcode === null ? null : (optString(o.barcode) ?? null)
  }
  if ('brand' in o && typeof o.brand === 'string') patch.brand = o.brand.trim()
  if ('subCategory' in o) {
    patch.subCategory = o.subCategory === null ? null : (optString(o.subCategory) ?? null)
  }
  if ('supplierId' in o) {
    patch.supplierId =
      o.supplierId === null || o.supplierId === '' ? null : String(o.supplierId).trim()
  }
  if ('costPrice' in o) patch.costPrice = parseMoney(o.costPrice, 'costPrice')
  if ('wholesalePrice' in o) patch.wholesalePrice = parseMoney(o.wholesalePrice, 'wholesalePrice')
  if ('wholesaleDiscountRate' in o) {
    patch.wholesaleDiscountRate = parseMoney(o.wholesaleDiscountRate, 'wholesaleDiscountRate')
  }
  if ('listPrice' in o) patch.listPrice = parseMoney(o.listPrice, 'listPrice')
  if ('salePrice' in o) patch.salePrice = parseMoney(o.salePrice, 'salePrice')
  if ('vatRate' in o) patch.vatRate = parseMoney(o.vatRate, 'vatRate')
  if ('slug' in o && typeof o.slug === 'string') patch.slug = o.slug.trim()
  if ('seoTitle' in o && typeof o.seoTitle === 'string') patch.seoTitle = o.seoTitle.trim()
  if ('seoDescription' in o && typeof o.seoDescription === 'string') {
    patch.seoDescription = o.seoDescription.trim()
  }
  if ('shortDescription' in o && typeof o.shortDescription === 'string') {
    patch.shortDescription = o.shortDescription.trim()
  }
  if ('longDescription' in o && typeof o.longDescription === 'string') {
    patch.longDescription = o.longDescription.trim()
  }
  if ('width' in o) patch.width = parseDimension(o.width, 'width')
  if ('depth' in o) patch.depth = parseDimension(o.depth, 'depth')
  if ('height' in o) patch.height = parseDimension(o.height, 'height')
  if ('material' in o) {
    patch.material = o.material === null ? null : (optString(o.material) ?? null)
  }
  if ('warrantyMonths' in o) {
    patch.warrantyMonths =
      o.warrantyMonths === null ? null : parsePositiveInt(o.warrantyMonths, 'warrantyMonths')
  }
  if ('deliveryTimeDays' in o) {
    patch.deliveryTimeDays = parsePositiveInt(o.deliveryTimeDays, 'deliveryTimeDays')
  }
  if ('mainImageUrl' in o) {
    patch.mainImageUrl = o.mainImageUrl === null ? null : (optString(o.mainImageUrl) ?? null)
  }
  if ('galleryImageUrls' in o) {
    if (!Array.isArray(o.galleryImageUrls)) {
      throw new AppHttpError(400, 'galleryImageUrls geçersiz', 'Bad Request')
    }
    patch.galleryImageUrls = o.galleryImageUrls.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    )
  }
  if ('videoUrl' in o) {
    patch.videoUrl = o.videoUrl === null ? null : (optString(o.videoUrl) ?? null)
  }
  if ('catalogPdfUrl' in o) {
    patch.catalogPdfUrl = o.catalogPdfUrl === null ? null : (optString(o.catalogPdfUrl) ?? null)
  }
  if ('publishStatus' in o) {
    const ps = typeof o.publishStatus === 'string' ? o.publishStatus.trim() : ''
    if (!isProductPublishStatus(ps)) {
      throw new AppHttpError(400, 'Geçersiz yayın durumu', 'Bad Request')
    }
    patch.publishStatus = ps
  }
  if ('webEnabled' in o && typeof o.webEnabled === 'boolean') patch.webEnabled = o.webEnabled
  if ('mobileEnabled' in o && typeof o.mobileEnabled === 'boolean') patch.mobileEnabled = o.mobileEnabled
  if ('marketplaceEnabled' in o && typeof o.marketplaceEnabled === 'boolean') {
    patch.marketplaceEnabled = o.marketplaceEnabled
  }
  if ('productType' in o) {
    const pt = parseProductType(o.productType)
    if (pt) patch.productType = pt
  }
  if ('collectionCode' in o) patch.collectionCode = parseNullableStringField(o.collectionCode) ?? null
  if ('seasonCode' in o) patch.seasonCode = parseNullableStringField(o.seasonCode) ?? null
  if ('weightKg' in o) {
    patch.weightKg =
      o.weightKg === null ? null : (parseWeight(o.weightKg, 'weightKg') ?? null)
  }
  if ('packageWidthCm' in o) {
    patch.packageWidthCm =
      o.packageWidthCm === null ? null : parseDimension(o.packageWidthCm, 'packageWidthCm')
  }
  if ('packageDepthCm' in o) {
    patch.packageDepthCm =
      o.packageDepthCm === null ? null : parseDimension(o.packageDepthCm, 'packageDepthCm')
  }
  if ('packageHeightCm' in o) {
    patch.packageHeightCm =
      o.packageHeightCm === null ? null : parseDimension(o.packageHeightCm, 'packageHeightCm')
  }
  if ('packageCount' in o) {
    patch.packageCount =
      o.packageCount === null ? null : parsePositiveInt(o.packageCount, 'packageCount')
  }
  if ('assemblyType' in o) patch.assemblyType = parseNullableStringField(o.assemblyType) ?? null
  if ('coating' in o) patch.coating = parseNullableStringField(o.coating) ?? null
  if ('mechanism' in o) patch.mechanism = parseNullableStringField(o.mechanism) ?? null
  if ('technicalAttributes' in o) {
    patch.technicalAttributes = parseTechnicalAttributes(o.technicalAttributes) ?? []
  }
  if ('colorOptions' in o) {
    patch.colorOptions = parseStringArrayField(o.colorOptions, 'colorOptions') ?? []
  }
  if ('fabricOptions' in o) {
    patch.fabricOptions = parseStringArrayField(o.fabricOptions, 'fabricOptions') ?? []
  }
  if ('tags' in o) patch.tags = parseStringArrayField(o.tags, 'tags') ?? []
  if ('relatedProductIds' in o) {
    patch.relatedProductIds = parseStringArrayField(o.relatedProductIds, 'relatedProductIds') ?? []
  }
  if ('stockType' in o) {
    const st = parseStockType(o.stockType)
    if (st) patch.stockType = st
  }
  if ('salesSourceType' in o) {
    patch.salesSourceType = parseSalesSourceType(o.salesSourceType) ?? null
  }
  if ('displayFloor' in o) {
    patch.displayFloor = parseDisplayFloor(o.displayFloor) ?? null
  }
  if ('physicalLocation' in o) {
    patch.physicalLocation = parsePhysicalLocation(o.physicalLocation) ?? null
  }
  if ('externalSupplyType' in o) {
    patch.externalSupplyType = parseExternalSupplyType(o.externalSupplyType) ?? null
  }

  if (Object.keys(patch).length === 0) {
    throw new AppHttpError(400, 'Güncellenecek alan yok', 'Bad Request')
  }

  return patch
}

export async function patchProductMaster(
  prisma: PrismaClient,
  productId: string,
  body: PatchProductMasterRequest,
): Promise<ProductMasterDetailDto> {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      defaultSupplier: { select: { id: true, companyName: true } },
      variants: { where: { isActive: true } },
    },
  })
  if (!existing) {
    throw new AppHttpError(404, 'Ürün master kaydı bulunamadı', 'Not Found')
  }

  if (body.code && body.code !== existing.productCode) {
    const dup = await prisma.product.findUnique({ where: { productCode: body.code } })
    if (dup) {
      throw new AppHttpError(409, 'Bu ürün kodu zaten kullanılıyor', 'Conflict')
    }
  }

  if (body.supplierId) {
    const sup = await prisma.supplier.findUnique({ where: { id: body.supplierId } })
    if (!sup) throw new AppHttpError(400, 'Tedarikçi bulunamadı', 'Bad Request')
  }

  const listPrice = body.listPrice ?? Number(existing.defaultSalePrice)
  const minSalePriceRaw = body.salePrice ?? Number(existing.minSalePrice)
  const minSalePrice = Math.min(listPrice, minSalePriceRaw)
  if (minSalePrice > listPrice) {
    throw new AppHttpError(400, 'İndirimli fiyat liste fiyatından büyük olamaz', 'Bad Request')
  }

  const mergedMainImage = body.mainImageUrl !== undefined ? body.mainImageUrl : existing.mainImageUrl
  const mergedSeoTitle = body.seoTitle ?? existing.seoTitle ?? ''
  const mergedSeoDescription = body.seoDescription ?? existing.seoDescription ?? ''
  const mergedShort = body.shortDescription ?? existing.shortDescription ?? ''
  const mergedLong = body.longDescription ?? existing.longDescription ?? existing.description ?? ''

  const purchase = resolveProductPurchaseCost({
    wholesalePrice:
      body.wholesalePrice !== undefined
        ? body.wholesalePrice
        : Number(existing.wholesalePrice) || Number(existing.purchasePrice),
    wholesaleDiscountRate:
      body.wholesaleDiscountRate !== undefined
        ? body.wholesaleDiscountRate
        : Number(existing.wholesaleDiscountRate),
    costPrice:
      body.costPrice !== undefined
        ? body.costPrice
        : body.wholesalePrice !== undefined || body.wholesaleDiscountRate !== undefined
          ? undefined
          : Number(existing.purchasePrice),
  })

  const health = computePersistedMasterHealth({
    mainImageUrl: mergedMainImage,
    seoTitle: mergedSeoTitle,
    seoDescription: mergedSeoDescription,
    shortDescription: mergedShort,
    longDescription: mergedLong,
    technicalAttributes: [],
    activeVariantCount: existing.variants?.length ?? 0,
  })

  const row = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(body.name !== undefined ? { productName: body.name } : {}),
      ...(body.code !== undefined ? { productCode: body.code } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.subCategory !== undefined ? { suiteType: body.subCategory } : {}),
      ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
      ...(body.brand !== undefined ? { brand: body.brand } : {}),
      ...(body.supplierId !== undefined ? { defaultSupplierId: body.supplierId } : {}),
      ...(body.costPrice !== undefined ||
      body.wholesalePrice !== undefined ||
      body.wholesaleDiscountRate !== undefined
        ? {
            wholesalePrice: new Prisma.Decimal(purchase.wholesalePrice),
            wholesaleDiscountRate: new Prisma.Decimal(purchase.wholesaleDiscountRate),
            purchasePrice: new Prisma.Decimal(purchase.netPurchasePrice),
          }
        : {}),
      ...(body.listPrice !== undefined || body.salePrice !== undefined
        ? {
            defaultSalePrice: new Prisma.Decimal(listPrice),
            minSalePrice: new Prisma.Decimal(minSalePrice),
          }
        : {}),
      ...(body.vatRate !== undefined ? { vatRate: new Prisma.Decimal(body.vatRate) } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle } : {}),
      ...(body.seoDescription !== undefined ? { seoDescription: body.seoDescription } : {}),
      ...(body.shortDescription !== undefined ? { shortDescription: body.shortDescription } : {}),
      ...(body.longDescription !== undefined
        ? { longDescription: body.longDescription, description: body.longDescription }
        : {}),
      ...(body.width !== undefined ? { widthCm: new Prisma.Decimal(body.width) } : {}),
      ...(body.depth !== undefined ? { depthCm: new Prisma.Decimal(body.depth) } : {}),
      ...(body.height !== undefined ? { heightCm: new Prisma.Decimal(body.height) } : {}),
      ...(body.material !== undefined ? { material: body.material } : {}),
      ...(body.warrantyMonths !== undefined ? { warrantyMonths: body.warrantyMonths } : {}),
      ...(body.deliveryTimeDays !== undefined ? { deliveryDays: body.deliveryTimeDays } : {}),
      ...(body.mainImageUrl !== undefined ? { mainImageUrl: body.mainImageUrl } : {}),
      ...(body.galleryImageUrls !== undefined ? { galleryImageUrls: body.galleryImageUrls } : {}),
      ...(body.videoUrl !== undefined ? { videoUrl: body.videoUrl } : {}),
      ...(body.catalogPdfUrl !== undefined ? { catalogPdfUrl: body.catalogPdfUrl } : {}),
      ...(body.publishStatus !== undefined
        ? {
            publishStatus: body.publishStatus,
            isActive: body.publishStatus !== 'PASSIVE',
            webEnabled: body.webEnabled ?? body.publishStatus !== 'PASSIVE',
            mobileEnabled: body.mobileEnabled ?? body.publishStatus !== 'PASSIVE',
          }
        : {}),
      ...(body.webEnabled !== undefined && body.publishStatus === undefined
        ? { webEnabled: body.webEnabled }
        : {}),
      ...(body.mobileEnabled !== undefined && body.publishStatus === undefined
        ? { mobileEnabled: body.mobileEnabled }
        : {}),
      ...(body.marketplaceEnabled !== undefined
        ? { marketplaceEnabled: body.marketplaceEnabled }
        : {}),
      ...(body.productType !== undefined ? { productType: body.productType } : {}),
      ...(body.collectionCode !== undefined ? { collectionCode: body.collectionCode } : {}),
      ...(body.seasonCode !== undefined ? { seasonCode: body.seasonCode } : {}),
      ...(body.weightKg !== undefined
        ? { weightKg: body.weightKg != null ? new Prisma.Decimal(body.weightKg) : null }
        : {}),
      ...(body.packageWidthCm !== undefined
        ? {
            packageWidthCm:
              body.packageWidthCm != null ? new Prisma.Decimal(body.packageWidthCm) : null,
          }
        : {}),
      ...(body.packageDepthCm !== undefined
        ? {
            packageDepthCm:
              body.packageDepthCm != null ? new Prisma.Decimal(body.packageDepthCm) : null,
          }
        : {}),
      ...(body.packageHeightCm !== undefined
        ? {
            packageHeightCm:
              body.packageHeightCm != null ? new Prisma.Decimal(body.packageHeightCm) : null,
          }
        : {}),
      ...(body.packageCount !== undefined ? { packageCount: body.packageCount } : {}),
      ...(body.assemblyType !== undefined ? { assemblyType: body.assemblyType } : {}),
      ...(body.coating !== undefined ? { coating: body.coating } : {}),
      ...(body.mechanism !== undefined ? { mechanism: body.mechanism } : {}),
      ...(body.technicalAttributes !== undefined
        ? { technicalAttributes: body.technicalAttributes }
        : {}),
      ...(body.colorOptions !== undefined ? { colorOptions: body.colorOptions } : {}),
      ...(body.fabricOptions !== undefined ? { fabricOptions: body.fabricOptions } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.relatedProductIds !== undefined ? { relatedProductIds: body.relatedProductIds } : {}),
      ...(body.stockType !== undefined ? { stockType: body.stockType } : {}),
      ...(body.salesSourceType !== undefined ? { salesSourceType: body.salesSourceType } : {}),
      ...(body.displayFloor !== undefined ? { displayFloor: body.displayFloor } : {}),
      ...(body.physicalLocation !== undefined ? { physicalLocation: body.physicalLocation } : {}),
      ...(body.externalSupplyType !== undefined
        ? { externalSupplyType: body.externalSupplyType }
        : {}),
      productHealthScore: health.productHealthScore,
      missingFields: health.missingFields,
    },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })

  return mapProductMasterDetailDto(row)
}
