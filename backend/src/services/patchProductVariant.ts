import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  mapProductVariantDto,
  type ProductMasterVariantDto,
} from '../contracts/productVariantDto.js'
import { isVariantStockStatus } from '../constants/variantStockStatus.js'

export type PatchProductVariantRequest = Partial<{
  variantCode: string
  barcode: string | null
  name: string
  attributes: Record<string, string>
  priceDelta: number | null
  costDelta: number | null
  salePrice: number | null
  purchasePrice: number | null
  stockQuantity: number | null
  stockStatus: string | null
  widthCm: number | null
  depthCm: number | null
  heightCm: number | null
  color: string | null
  fabric: string | null
  sizeLabel: string | null
  isDefault: boolean
  isActive: boolean
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

function parseDelta(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parseDimension(v: unknown, field: string): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

function parseStockQuantity(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n < 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { stockQuantity: 'Invalid' })
  }
  return n
}

function parseAttributes(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new AppHttpError(400, 'attributes geçersiz', 'Bad Request')
  }
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) out[k.trim()] = val.trim()
  }
  return out
}

export function assertValidPatchProductVariantRequest(body: unknown): PatchProductVariantRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const patch: PatchProductVariantRequest = {}

  if ('variantCode' in o) {
    const variantCode = typeof o.variantCode === 'string' ? o.variantCode.trim() : ''
    if (!variantCode) {
      throw new AppHttpError(400, 'Varyant kodu boş olamaz', 'Bad Request', { variantCode: 'Required' })
    }
    patch.variantCode = variantCode
  }
  if ('name' in o) {
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name) throw new AppHttpError(400, 'Varyant adı boş olamaz', 'Bad Request', { name: 'Required' })
    patch.name = name
  }
  if ('barcode' in o) patch.barcode = o.barcode === null ? null : (optString(o.barcode) ?? null)
  if ('attributes' in o) patch.attributes = parseAttributes(o.attributes)
  if ('priceDelta' in o) {
    patch.priceDelta = o.priceDelta === null ? null : parseDelta(o.priceDelta, 'priceDelta')
  }
  if ('costDelta' in o) {
    patch.costDelta = o.costDelta === null ? null : parseDelta(o.costDelta, 'costDelta')
  }
  if ('salePrice' in o) {
    patch.salePrice = o.salePrice === null ? null : parseMoney(o.salePrice, 'salePrice')
  }
  if ('purchasePrice' in o) {
    patch.purchasePrice = o.purchasePrice === null ? null : parseMoney(o.purchasePrice, 'purchasePrice')
  }
  if ('stockQuantity' in o) {
    patch.stockQuantity = o.stockQuantity === null ? null : parseStockQuantity(o.stockQuantity)
  }
  if ('stockStatus' in o) {
    if (o.stockStatus === null || o.stockStatus === '') {
      patch.stockStatus = null
    } else {
      const s = String(o.stockStatus).trim()
      if (!isVariantStockStatus(s)) {
        throw new AppHttpError(400, 'Geçersiz stok durumu', 'Bad Request')
      }
      patch.stockStatus = s
    }
  }
  if ('widthCm' in o) {
    patch.widthCm = o.widthCm === null ? null : parseDimension(o.widthCm, 'widthCm')
  }
  if ('depthCm' in o) {
    patch.depthCm = o.depthCm === null ? null : parseDimension(o.depthCm, 'depthCm')
  }
  if ('heightCm' in o) {
    patch.heightCm = o.heightCm === null ? null : parseDimension(o.heightCm, 'heightCm')
  }
  if ('color' in o) patch.color = o.color === null ? null : (optString(o.color) ?? null)
  if ('fabric' in o) patch.fabric = o.fabric === null ? null : (optString(o.fabric) ?? null)
  if ('sizeLabel' in o) {
    patch.sizeLabel = o.sizeLabel === null ? null : (optString(o.sizeLabel) ?? null)
  }
  if ('isDefault' in o && typeof o.isDefault === 'boolean') patch.isDefault = o.isDefault
  if ('isActive' in o && typeof o.isActive === 'boolean') patch.isActive = o.isActive

  if (Object.keys(patch).length === 0) {
    throw new AppHttpError(400, 'Güncellenecek alan yok', 'Bad Request')
  }

  return patch
}

export async function patchProductVariant(
  prisma: PrismaClient,
  productId: string,
  variantId: string,
  body: PatchProductVariantRequest,
): Promise<ProductMasterVariantDto> {
  const existing = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
  })
  if (!existing) {
    throw new AppHttpError(404, 'Varyant kaydı bulunamadı', 'Not Found')
  }

  if (body.variantCode && body.variantCode !== existing.variantCode) {
    const dup = await prisma.productVariant.findUnique({ where: { variantCode: body.variantCode } })
    if (dup) throw new AppHttpError(409, 'Bu varyant kodu zaten kullanılıyor', 'Conflict')
  }

  if (body.barcode && body.barcode !== existing.barcode) {
    const dup = await prisma.productVariant.findUnique({ where: { barcode: body.barcode } })
    if (dup) throw new AppHttpError(409, 'Bu barkod zaten kullanılıyor', 'Conflict')
  }

  if (body.isDefault === true) {
    await prisma.productVariant.updateMany({
      where: { productId, isDefault: true, id: { not: variantId } },
      data: { isDefault: false },
    })
  }

  const row = await prisma.productVariant.update({
    where: { id: variantId },
    data: {
      ...(body.variantCode !== undefined ? { variantCode: body.variantCode } : {}),
      ...(body.barcode !== undefined ? { barcode: body.barcode } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.attributes !== undefined ? { attributes: body.attributes } : {}),
      ...(body.priceDelta !== undefined
        ? { priceDelta: body.priceDelta != null ? new Prisma.Decimal(body.priceDelta) : null }
        : {}),
      ...(body.costDelta !== undefined
        ? { costDelta: body.costDelta != null ? new Prisma.Decimal(body.costDelta) : null }
        : {}),
      ...(body.salePrice !== undefined
        ? { salePrice: body.salePrice != null ? new Prisma.Decimal(body.salePrice) : null }
        : {}),
      ...(body.purchasePrice !== undefined
        ? {
            purchasePrice:
              body.purchasePrice != null ? new Prisma.Decimal(body.purchasePrice) : null,
          }
        : {}),
      ...(body.stockQuantity !== undefined ? { stockQuantity: body.stockQuantity } : {}),
      ...(body.stockStatus !== undefined ? { stockStatus: body.stockStatus } : {}),
      ...(body.widthCm !== undefined
        ? { widthCm: body.widthCm != null ? new Prisma.Decimal(body.widthCm) : null }
        : {}),
      ...(body.depthCm !== undefined
        ? { depthCm: body.depthCm != null ? new Prisma.Decimal(body.depthCm) : null }
        : {}),
      ...(body.heightCm !== undefined
        ? { heightCm: body.heightCm != null ? new Prisma.Decimal(body.heightCm) : null }
        : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.fabric !== undefined ? { fabric: body.fabric } : {}),
      ...(body.sizeLabel !== undefined ? { sizeLabel: body.sizeLabel } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  })

  return mapProductVariantDto(row)
}
