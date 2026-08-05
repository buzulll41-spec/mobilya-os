import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import type { LineConfiguration } from '../constants/productConfigurationSchema.js'
import { computeLineTotal, roundMoney } from './commerceFinance.js'
import { decimalToNumber } from './money.js'
import type { CreateOrderLineInput } from './orderLineCreate.js'
import { buildOrderItemSalesSnapshot } from '../services/buildOrderItemSalesSnapshot.js'

export type RawCreateOrderLine = {
  title?: string
  quantity: number
  unitPrice: number
  productGroup?: string
  sortOrder: number
  productId?: string
  supplierId?: string
  supplierNameSnapshot?: string
  configuration?: LineConfiguration
  soldSalesSourceType?: string
  soldDisplayFloor?: string
  soldExternalSupplyType?: string
  soldUnitCost?: number
}

/**
 * productId varsa katalogdan başlık / grup doldurur; title yine zorunlu kalır.
 */
export async function resolveCreateOrderLines(
  prisma: PrismaClient,
  rawLines: RawCreateOrderLine[],
): Promise<CreateOrderLineInput[]> {
  const productIds = [...new Set(rawLines.map((l) => l.productId).filter(Boolean))] as string[]
  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            productName: true,
            category: true,
            suiteType: true,
            isActive: true,
            defaultSupplierId: true,
            defaultSupplier: { select: { id: true, companyName: true, isActive: true } },
            salesSourceType: true,
            displayFloor: true,
            externalSupplyType: true,
            purchasePrice: true,
            wholesalePrice: true,
            wholesaleDiscountRate: true,
          },
        })
      : []
  const byId = new Map(products.map((p) => [p.id, p]))

  /** @type {CreateOrderLineInput[]} */
  const out = []

  for (const raw of rawLines) {
    let title = typeof raw.title === 'string' ? raw.title.trim() : ''
    let productGroup = raw.productGroup?.trim()

    if (raw.productId) {
      const product = byId.get(raw.productId)
      if (!product) {
        throw new AppHttpError(400, 'Ürün kartı bulunamadı', 'Bad Request', {
          productId: raw.productId,
        })
      }
      if (!product.isActive) {
        throw new AppHttpError(400, 'Pasif ürün kartı siparişe eklenemez', 'Bad Request', {
          productId: raw.productId,
        })
      }
      if (!title) title = product.productName
      if (!productGroup) productGroup = product.category
    }

    if (!title) {
      throw new AppHttpError(400, 'Satır başlığı veya geçerli productId gerekli', 'Bad Request')
    }

    const quantity = raw.quantity
    const unitPrice = roundMoney(raw.unitPrice)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new AppHttpError(400, 'Geçersiz satır adedi', 'Bad Request')
    }
    const lineTotal = computeLineTotal(quantity, unitPrice)
    if (lineTotal <= 0) {
      throw new AppHttpError(400, 'Satır tutarı sıfır olamaz', 'Bad Request')
    }

    let supplierId = raw.supplierId?.trim()
    let supplierNameSnapshot = raw.supplierNameSnapshot?.trim()
    const product = raw.productId ? byId.get(raw.productId) : undefined
    if (product?.defaultSupplierId && !supplierId) {
      supplierId = product.defaultSupplierId
      supplierNameSnapshot = product.defaultSupplier?.companyName ?? supplierNameSnapshot
    }

    // Satış kaynağı snapshot — merkezi iş kuralları (buildOrderItemSalesSnapshot).
    // Explicit kalem değeri > ürün kartı; physicalLocation/Depo asla kullanılmaz.
    const snapshot = buildOrderItemSalesSnapshot({
      salesSourceType: raw.soldSalesSourceType ?? product?.salesSourceType ?? null,
      displayFloor: raw.soldDisplayFloor ?? product?.displayFloor ?? null,
      externalSupplyType: raw.soldExternalSupplyType ?? product?.externalSupplyType ?? null,
      purchasePrice: product?.purchasePrice ?? null,
      unitCostOverride:
        typeof raw.soldUnitCost === 'number' && Number.isFinite(raw.soldUnitCost)
          ? raw.soldUnitCost
          : null,
    })

    const soldWholesalePrice =
      product != null ? decimalToNumber(product.wholesalePrice) : undefined
    const soldWholesaleDiscountRate =
      product != null ? decimalToNumber(product.wholesaleDiscountRate) : undefined

    out.push({
      title,
      quantity,
      unitPrice,
      lineTotal,
      sortOrder: raw.sortOrder,
      ...(productGroup ? { productGroup } : {}),
      ...(raw.productId ? { productId: raw.productId } : {}),
      ...(raw.configuration ? { configuration: raw.configuration } : {}),
      ...(supplierId ? { supplierId } : {}),
      ...(supplierNameSnapshot ? { supplierNameSnapshot } : {}),
      // Satış kaynağı tipi her zaman yazılır (çözülemezse UNKNOWN).
      soldSalesSourceType: snapshot.soldSalesSourceType,
      // Maliyet her zaman yazılır (yoksa 0).
      soldUnitCost: snapshot.soldUnitCost,
      ...(soldWholesalePrice != null && soldWholesalePrice > 0
        ? { soldWholesalePrice: roundMoney(soldWholesalePrice) }
        : {}),
      ...(soldWholesaleDiscountRate != null
        ? { soldWholesaleDiscountRate: roundMoney(soldWholesaleDiscountRate) }
        : {}),
      ...(snapshot.soldDisplayFloor ? { soldDisplayFloor: snapshot.soldDisplayFloor } : {}),
      ...(snapshot.soldExternalSupplyType
        ? { soldExternalSupplyType: snapshot.soldExternalSupplyType }
        : {}),
    })
  }

  return out
}
