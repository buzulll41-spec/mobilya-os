import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { PRODUCT_CATEGORIES } from '../constants/productCatalog.js'
import { isProductStockType } from '../constants/productStockTypes.js'
import { mapProductDetailDto, type ProductDetailDto } from '../contracts/productDto.js'
import { LOW_MARGIN_RATIO_THRESHOLD } from '../constants/productCatalog.js'
import { parseProductSourceFields, type ProductSourceFields } from '../lib/productSourceFields.js'
import { isPhysicalLocation } from '../constants/physicalLocations.js'

export type PatchProductRequest = Partial<{
  productCode: string
  productName: string
  category: string
  suiteType: string | null
  defaultSalePrice: number
  minSalePrice: number
  purchasePrice: number
  defaultSupplierId: string | null
  deliveryDays: number
  isActive: boolean
  stockType: string
  description: string | null
  salesSourceType: string
  displayFloor: string | null
  externalSupplyType: string | null
  physicalLocation: string | null
}>

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function assertValidPatchProductRequest(body: unknown): PatchProductRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  /** @type {PatchProductRequest} */
  const patch: PatchProductRequest = {}

  if ('productCode' in o) {
    const productCode = typeof o.productCode === 'string' ? o.productCode.trim() : ''
    if (!productCode) throw new AppHttpError(400, 'Ürün kodu boş olamaz', 'Bad Request')
    patch.productCode = productCode
  }
  if ('productName' in o) {
    const productName = typeof o.productName === 'string' ? o.productName.trim() : ''
    if (!productName) throw new AppHttpError(400, 'Ürün adı boş olamaz', 'Bad Request')
    patch.productName = productName
  }
  if ('category' in o) {
    const category = typeof o.category === 'string' ? o.category.trim() : ''
    if (!category || !PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
      throw new AppHttpError(400, 'Geçersiz kategori', 'Bad Request')
    }
    patch.category = category
  }
  if ('suiteType' in o) {
    patch.suiteType =
      o.suiteType === null ? null : (optString(o.suiteType) ?? null)
  }
  if ('stockType' in o) {
    const stockType = typeof o.stockType === 'string' ? o.stockType.trim() : ''
    if (!isProductStockType(stockType)) {
      throw new AppHttpError(400, 'Geçersiz stok tipi', 'Bad Request')
    }
    patch.stockType = stockType
  }
  if ('defaultSalePrice' in o) {
    const n = typeof o.defaultSalePrice === 'number' ? o.defaultSalePrice : Number(o.defaultSalePrice)
    if (!Number.isFinite(n) || n < 0) throw new AppHttpError(400, 'Geçersiz satış fiyatı', 'Bad Request')
    patch.defaultSalePrice = Math.round(n * 100) / 100
  }
  if ('minSalePrice' in o) {
    const n = typeof o.minSalePrice === 'number' ? o.minSalePrice : Number(o.minSalePrice)
    if (!Number.isFinite(n) || n < 0) throw new AppHttpError(400, 'Geçersiz minimum fiyat', 'Bad Request')
    patch.minSalePrice = Math.round(n * 100) / 100
  }
  if ('purchasePrice' in o) {
    const n = typeof o.purchasePrice === 'number' ? o.purchasePrice : Number(o.purchasePrice)
    if (!Number.isFinite(n) || n < 0) throw new AppHttpError(400, 'Geçersiz alış fiyatı', 'Bad Request')
    patch.purchasePrice = Math.round(n * 100) / 100
  }
  if ('deliveryDays' in o) {
    const d = typeof o.deliveryDays === 'number' ? o.deliveryDays : Number(o.deliveryDays)
    if (!Number.isInteger(d) || d <= 0) throw new AppHttpError(400, 'Teslim süresi geçersiz', 'Bad Request')
    patch.deliveryDays = d
  }
  if ('isActive' in o && typeof o.isActive === 'boolean') patch.isActive = o.isActive
  if ('defaultSupplierId' in o) {
    patch.defaultSupplierId =
      o.defaultSupplierId === null || o.defaultSupplierId === ''
        ? null
        : String(o.defaultSupplierId).trim()
  }
  if ('description' in o) {
    patch.description =
      o.description === null ? null : (optString(o.description) ?? null)
  }
  if ('salesSourceType' in o) {
    patch.salesSourceType = typeof o.salesSourceType === 'string' ? o.salesSourceType.trim() : ''
  }
  if ('displayFloor' in o) {
    patch.displayFloor = o.displayFloor === null ? null : (optString(o.displayFloor) ?? null)
  }
  if ('externalSupplyType' in o) {
    patch.externalSupplyType =
      o.externalSupplyType === null ? null : (optString(o.externalSupplyType) ?? null)
  }
  if ('physicalLocation' in o) {
    patch.physicalLocation =
      o.physicalLocation === null ? null : (optString(o.physicalLocation) ?? null)
  }

  if (Object.keys(patch).length === 0) {
    throw new AppHttpError(400, 'Güncellenecek alan yok', 'Bad Request')
  }

  return patch
}

export async function patchProduct(
  prisma: PrismaClient,
  productId: string,
  body: PatchProductRequest,
): Promise<ProductDetailDto> {
  const existing = await prisma.product.findUnique({ where: { id: productId } })
  if (!existing) {
    throw new AppHttpError(404, 'Ürün kartı bulunamadı', 'Not Found')
  }

  if (body.productCode && body.productCode !== existing.productCode) {
    const dup = await prisma.product.findUnique({ where: { productCode: body.productCode } })
    if (dup) {
      throw new AppHttpError(409, 'Bu ürün kodu zaten kullanılıyor', 'Conflict')
    }
  }

  if (body.defaultSupplierId) {
    const sup = await prisma.supplier.findUnique({ where: { id: body.defaultSupplierId } })
    if (!sup) throw new AppHttpError(400, 'Tedarikçi bulunamadı', 'Bad Request')
  }

  const sale = body.defaultSalePrice ?? Number(existing.defaultSalePrice)
  const min = body.minSalePrice ?? Number(existing.minSalePrice)
  if (min > sale) {
    throw new AppHttpError(400, 'Minimum satış fiyatı varsayılan satıştan büyük olamaz', 'Bad Request')
  }

  // Satış kaynağı üçlüsünden biri patch'lendiyse, mevcutla birleştirip koşullu doğrula + normalize et.
  const salesSourceTouched =
    body.salesSourceType !== undefined ||
    body.displayFloor !== undefined ||
    body.externalSupplyType !== undefined
  let sourceFields: ProductSourceFields | null = null
  if (salesSourceTouched) {
    sourceFields = parseProductSourceFields({
      salesSourceType: body.salesSourceType ?? existing.salesSourceType ?? undefined,
      displayFloor: body.displayFloor ?? existing.displayFloor ?? undefined,
      externalSupplyType: body.externalSupplyType ?? existing.externalSupplyType ?? undefined,
      physicalLocation: existing.physicalLocation ?? undefined,
    })
  }

  // physicalLocation bağımsız stok-lokasyon ekseni; satış kaynağından ayrı doğrulanır.
  if (
    body.physicalLocation !== undefined &&
    body.physicalLocation !== null &&
    !isPhysicalLocation(body.physicalLocation)
  ) {
    throw new AppHttpError(400, 'Geçersiz fiziksel lokasyon', 'Bad Request', {
      physicalLocation: 'Invalid',
    })
  }

  const row = await prisma.product.update({
    where: { id: productId },
    data: {
      ...(body.productCode !== undefined ? { productCode: body.productCode } : {}),
      ...(body.productName !== undefined ? { productName: body.productName } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.suiteType !== undefined ? { suiteType: body.suiteType } : {}),
      ...(body.defaultSalePrice !== undefined
        ? { defaultSalePrice: new Prisma.Decimal(body.defaultSalePrice) }
        : {}),
      ...(body.minSalePrice !== undefined
        ? { minSalePrice: new Prisma.Decimal(body.minSalePrice) }
        : {}),
      ...(body.purchasePrice !== undefined
        ? { purchasePrice: new Prisma.Decimal(body.purchasePrice) }
        : {}),
      ...(body.defaultSupplierId !== undefined ? { defaultSupplierId: body.defaultSupplierId } : {}),
      ...(body.deliveryDays !== undefined ? { deliveryDays: body.deliveryDays } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.stockType !== undefined ? { stockType: body.stockType } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(sourceFields
        ? {
            salesSourceType: sourceFields.salesSourceType,
            displayFloor: sourceFields.displayFloor,
            externalSupplyType: sourceFields.externalSupplyType,
          }
        : {}),
      ...(body.physicalLocation !== undefined ? { physicalLocation: body.physicalLocation } : {}),
    },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })

  return mapProductDetailDto(row, LOW_MARGIN_RATIO_THRESHOLD)
}
