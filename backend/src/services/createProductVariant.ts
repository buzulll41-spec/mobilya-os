import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  mapProductVariantDto,
  type ProductMasterVariantDto,
} from '../contracts/productVariantDto.js'
import { isVariantStockStatus } from '../constants/variantStockStatus.js'

export type CreateProductVariantRequest = {
  variantCode: string
  barcode?: string | null
  name: string
  attributes?: Record<string, string>
  priceDelta?: number
  costDelta?: number
  salePrice?: number
  purchasePrice?: number
  stockQuantity?: number
  stockStatus?: string
  widthCm?: number
  depthCm?: number
  heightCm?: number
  color?: string | null
  fabric?: string | null
  sizeLabel?: string | null
  isDefault?: boolean
}

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function parseMoney(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parseDelta(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parseDimension(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parseStockQuantity(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n < 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { stockQuantity: 'Invalid' })
  }
  return n
}

function parseAttributes(v: unknown): Record<string, string> | undefined {
  if (v === undefined) return undefined
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new AppHttpError(400, 'attributes geçersiz', 'Bad Request')
  }
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) out[k.trim()] = val.trim()
  }
  return out
}

export function assertValidCreateProductVariantRequest(body: unknown): CreateProductVariantRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const variantCode = typeof o.variantCode === 'string' ? o.variantCode.trim() : ''
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  const details: Record<string, string> = {}
  if (!variantCode) details.variantCode = 'Required'
  if (!name) details.name = 'Required'
  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  if (o.stockStatus !== undefined && o.stockStatus !== null && o.stockStatus !== '') {
    const s = String(o.stockStatus).trim()
    if (!isVariantStockStatus(s)) {
      throw new AppHttpError(400, 'Geçersiz stok durumu', 'Bad Request', { stockStatus: 'Invalid' })
    }
  }

  return {
    variantCode,
    name,
    ...(o.barcode === null ? { barcode: null } : optString(o.barcode) ? { barcode: optString(o.barcode) } : {}),
    ...(parseAttributes(o.attributes) ? { attributes: parseAttributes(o.attributes) } : {}),
    ...(parseDelta(o.priceDelta, 'priceDelta') !== undefined
      ? { priceDelta: parseDelta(o.priceDelta, 'priceDelta') }
      : {}),
    ...(parseDelta(o.costDelta, 'costDelta') !== undefined
      ? { costDelta: parseDelta(o.costDelta, 'costDelta') }
      : {}),
    ...(parseMoney(o.salePrice, 'salePrice') !== undefined
      ? { salePrice: parseMoney(o.salePrice, 'salePrice') }
      : {}),
    ...(parseMoney(o.purchasePrice, 'purchasePrice') !== undefined
      ? { purchasePrice: parseMoney(o.purchasePrice, 'purchasePrice') }
      : {}),
    ...(parseStockQuantity(o.stockQuantity) !== undefined
      ? { stockQuantity: parseStockQuantity(o.stockQuantity) }
      : {}),
    ...(typeof o.stockStatus === 'string' && o.stockStatus.trim()
      ? { stockStatus: o.stockStatus.trim() }
      : {}),
    ...(parseDimension(o.widthCm, 'widthCm') !== undefined
      ? { widthCm: parseDimension(o.widthCm, 'widthCm') }
      : {}),
    ...(parseDimension(o.depthCm, 'depthCm') !== undefined
      ? { depthCm: parseDimension(o.depthCm, 'depthCm') }
      : {}),
    ...(parseDimension(o.heightCm, 'heightCm') !== undefined
      ? { heightCm: parseDimension(o.heightCm, 'heightCm') }
      : {}),
    ...(o.color === null ? { color: null } : optString(o.color) ? { color: optString(o.color) } : {}),
    ...(o.fabric === null ? { fabric: null } : optString(o.fabric) ? { fabric: optString(o.fabric) } : {}),
    ...(o.sizeLabel === null
      ? { sizeLabel: null }
      : optString(o.sizeLabel)
        ? { sizeLabel: optString(o.sizeLabel) }
        : {}),
    ...(typeof o.isDefault === 'boolean' ? { isDefault: o.isDefault } : {}),
  }
}

async function assertUniqueVariantCodeAndBarcode(
  prisma: PrismaClient,
  variantCode: string,
  barcode: string | null | undefined,
  excludeVariantId?: string,
) {
  const dupCode = await prisma.productVariant.findUnique({ where: { variantCode } })
  if (dupCode && dupCode.id !== excludeVariantId) {
    throw new AppHttpError(409, 'Bu varyant kodu zaten kullanılıyor', 'Conflict')
  }
  if (barcode) {
    const dupBarcode = await prisma.productVariant.findUnique({ where: { barcode } })
    if (dupBarcode && dupBarcode.id !== excludeVariantId) {
      throw new AppHttpError(409, 'Bu barkod zaten kullanılıyor', 'Conflict')
    }
  }
}

export async function createProductVariant(
  prisma: PrismaClient,
  productId: string,
  body: CreateProductVariantRequest,
): Promise<ProductMasterVariantDto> {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } })
  if (!product) {
    throw new AppHttpError(404, 'Ürün master kaydı bulunamadı', 'Not Found')
  }

  await assertUniqueVariantCodeAndBarcode(prisma, body.variantCode, body.barcode)

  const isDefault = body.isDefault ?? false
  if (isDefault) {
    await prisma.productVariant.updateMany({
      where: { productId, isDefault: true },
      data: { isDefault: false },
    })
  }

  const row = await prisma.productVariant.create({
    data: {
      productId,
      variantCode: body.variantCode,
      barcode: body.barcode ?? null,
      name: body.name,
      attributes: body.attributes ?? {},
      priceDelta: body.priceDelta != null ? new Prisma.Decimal(body.priceDelta) : null,
      costDelta: body.costDelta != null ? new Prisma.Decimal(body.costDelta) : null,
      salePrice: body.salePrice != null ? new Prisma.Decimal(body.salePrice) : null,
      purchasePrice: body.purchasePrice != null ? new Prisma.Decimal(body.purchasePrice) : null,
      stockQuantity: body.stockQuantity ?? null,
      stockStatus: body.stockStatus ?? null,
      widthCm: body.widthCm != null ? new Prisma.Decimal(body.widthCm) : null,
      depthCm: body.depthCm != null ? new Prisma.Decimal(body.depthCm) : null,
      heightCm: body.heightCm != null ? new Prisma.Decimal(body.heightCm) : null,
      color: body.color ?? null,
      fabric: body.fabric ?? null,
      sizeLabel: body.sizeLabel ?? null,
      isDefault,
      isActive: true,
    },
  })

  return mapProductVariantDto(row)
}
