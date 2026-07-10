import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { PRODUCT_CATEGORIES } from '../constants/productCatalog.js'
import { isProductStockType } from '../constants/productStockTypes.js'
import { mapProductDetailDto, type ProductDetailDto } from '../contracts/productDto.js'
import { LOW_MARGIN_RATIO_THRESHOLD } from '../constants/productCatalog.js'
import {
  parseProductSourceFields,
  type ProductSourceFields,
} from '../lib/productSourceFields.js'

export type CreateProductRequest = {
  productCode: string
  productName: string
  category: string
  suiteType?: string
  defaultSalePrice: number
  minSalePrice: number
  purchasePrice: number
  defaultSupplierId?: string
  deliveryDays?: number
  isActive?: boolean
  stockType: string
  description?: string
} & ProductSourceFields

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

export function assertValidCreateProductRequest(body: unknown): CreateProductRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const productCode = typeof o.productCode === 'string' ? o.productCode.trim() : ''
  const productName = typeof o.productName === 'string' ? o.productName.trim() : ''
  const category = typeof o.category === 'string' ? o.category.trim() : ''
  const stockType = typeof o.stockType === 'string' ? o.stockType.trim() : ''

  const details: Record<string, string> = {}
  if (!productCode) details.productCode = 'Required'
  if (!productName) details.productName = 'Required'
  if (!category) details.category = 'Required'
  if (!isProductStockType(stockType)) details.stockType = 'Invalid'
  if (category && !PRODUCT_CATEGORIES.includes(category as (typeof PRODUCT_CATEGORIES)[number])) {
    details.category = 'Invalid category'
  }

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  const defaultSalePrice = parseMoney(o.defaultSalePrice, 'defaultSalePrice')
  const minSalePrice = parseMoney(o.minSalePrice, 'minSalePrice')
  const purchasePrice = parseMoney(o.purchasePrice, 'purchasePrice')
  if (minSalePrice > defaultSalePrice) {
    throw new AppHttpError(400, 'Minimum satış fiyatı varsayılan satıştan büyük olamaz', 'Bad Request')
  }

  const deliveryDays =
    typeof o.deliveryDays === 'number' && Number.isInteger(o.deliveryDays) && o.deliveryDays > 0
      ? o.deliveryDays
      : 14

  // Satış Kaynağı create'te zorunlu (koşullu alt alan doğrulamasıyla birlikte).
  // physicalLocation bağımsız/opsiyonel stok-lokasyon eksenidir.
  const sourceFields = parseProductSourceFields({
    salesSourceType: o.salesSourceType,
    displayFloor: o.displayFloor,
    externalSupplyType: o.externalSupplyType,
    physicalLocation: o.physicalLocation,
  })

  return {
    productCode,
    productName,
    category,
    stockType,
    defaultSalePrice,
    minSalePrice,
    purchasePrice,
    deliveryDays,
    ...sourceFields,
    ...(optString(o.suiteType) ? { suiteType: optString(o.suiteType) } : {}),
    ...(optString(o.defaultSupplierId) ? { defaultSupplierId: optString(o.defaultSupplierId) } : {}),
    ...(optString(o.description) ? { description: optString(o.description) } : {}),
    ...(typeof o.isActive === 'boolean' ? { isActive: o.isActive } : {}),
  }
}

export async function createProduct(
  prisma: PrismaClient,
  body: CreateProductRequest,
): Promise<ProductDetailDto> {
  const dup = await prisma.product.findUnique({ where: { productCode: body.productCode } })
  if (dup) {
    throw new AppHttpError(409, 'Bu ürün kodu zaten kullanılıyor', 'Conflict', { productCode: 'Duplicate' })
  }

  if (body.defaultSupplierId) {
    const sup = await prisma.supplier.findUnique({ where: { id: body.defaultSupplierId } })
    if (!sup) {
      throw new AppHttpError(400, 'Tedarikçi bulunamadı', 'Bad Request')
    }
  }

  const row = await prisma.product.create({
    data: {
      productCode: body.productCode,
      productName: body.productName,
      category: body.category,
      suiteType: body.suiteType ?? null,
      defaultSalePrice: new Prisma.Decimal(body.defaultSalePrice),
      minSalePrice: new Prisma.Decimal(body.minSalePrice),
      purchasePrice: new Prisma.Decimal(body.purchasePrice),
      defaultSupplierId: body.defaultSupplierId ?? null,
      deliveryDays: body.deliveryDays ?? 14,
      isActive: body.isActive ?? true,
      stockType: body.stockType,
      description: body.description ?? null,
      salesSourceType: body.salesSourceType,
      displayFloor: body.displayFloor,
      externalSupplyType: body.externalSupplyType,
      physicalLocation: body.physicalLocation,
    },
    include: { defaultSupplier: { select: { id: true, companyName: true } } },
  })

  return mapProductDetailDto(row, LOW_MARGIN_RATIO_THRESHOLD)
}
