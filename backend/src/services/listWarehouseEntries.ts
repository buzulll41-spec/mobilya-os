import type { PrismaClient } from '@prisma/client'
import { decimalToNumber } from '../lib/money.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { INCOMING_GOODS_PURPOSE } from '../constants/incomingGoodsPurpose.js'
import {
  PHYSICAL_LOCATION,
  isPhysicalLocation,
  physicalLocationLabelTr,
  type PhysicalLocation,
} from '../constants/physicalLocations.js'
import {
  STOCK_STATUS,
  stockStatusLabelTr,
  type StockStatus,
} from '../constants/stockStatuses.js'
import type { WarehouseEntryDto } from '../contracts/warehouseEntryDto.js'

export type ListWarehouseEntriesQuery = {
  supplierId?: string
  physicalLocation?: string
  stockStatus?: string
  q?: string
}

function fmtQty(n: number): string {
  return (Math.round(n * 100) / 100).toString()
}

/**
 * Gelen ürün amacına göre stok durumunu türet (salt-okunur).
 * - CUSTOMER_ORDER → müşteri için bekliyor (rezerve)
 * - STOCK          → stokta
 * - DISPLAY        → stokta (teşhirde)
 */
function deriveStockStatus(purpose: string): StockStatus {
  if (purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) return STOCK_STATUS.CUSTOMER_HOLD
  return STOCK_STATUS.IN_STOCK
}

/**
 * Fiziksel lokasyonu çöz: ürün kartındaki physicalLocation öncelikli,
 * yoksa amaca göre makul varsayılan (müşteri → bekleme alanı, diğer → depo katı).
 */
function derivePhysicalLocation(
  purpose: string,
  productPhysicalLocation: string | null,
): PhysicalLocation {
  if (productPhysicalLocation && isPhysicalLocation(productPhysicalLocation)) {
    return productPhysicalLocation
  }
  if (purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) return PHYSICAL_LOCATION.CUSTOMER_HOLD_AREA
  return PHYSICAL_LOCATION.WAREHOUSE_FLOOR
}

export async function listWarehouseEntries(
  prisma: PrismaClient,
  query: ListWarehouseEntriesQuery = {},
): Promise<WarehouseEntryDto[]> {
  try {
    const where: { supplierId?: string } = {}
    if (query.supplierId) where.supplierId = query.supplierId

    const rows = await prisma.incomingGoodsRecord.findMany({
      where,
      include: {
        supplier: { select: { companyName: true } },
        product: { select: { physicalLocation: true } },
      },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    })

    const orderIds = [
      ...new Set(rows.map((r) => r.salesOrderId).filter((id): id is string => Boolean(id))),
    ]
    const orders =
      orderIds.length > 0
        ? await prisma.salesOrder.findMany({
            where: { id: { in: orderIds } },
            select: { id: true, customerName: true },
          })
        : []
    const orderById = new Map(orders.map((o) => [o.id, o]))

    const q = query.q?.trim().toLocaleLowerCase('tr')
    const fPhysical = query.physicalLocation?.trim() || undefined
    const fStatus = query.stockStatus?.trim() || undefined

    const out: WarehouseEntryDto[] = []
    for (const row of rows) {
      const order = row.salesOrderId ? orderById.get(row.salesOrderId) : undefined
      const physical = derivePhysicalLocation(row.purpose, row.product?.physicalLocation ?? null)
      const status = deriveStockStatus(row.purpose)
      const reserved = row.purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER

      if (fPhysical && physical !== fPhysical) continue
      if (fStatus && status !== fStatus) continue
      if (q) {
        const hay = `${row.productTitle} ${order?.customerName ?? ''} ${row.salesOrderId ?? ''}`.toLocaleLowerCase('tr')
        if (!hay.includes(q)) continue
      }

      out.push({
        id: row.id,
        productId: row.productId ?? null,
        productTitle: row.productTitle,
        productGroup: row.productGroup ?? null,
        orderNumber: row.salesOrderId ?? null,
        customerName: order?.customerName ?? null,
        qty: fmtQty(decimalToNumber(row.qty)),
        receivedAt: row.receivedAt.toISOString().slice(0, 10),
        physicalLocation: physical,
        physicalLocationLabel: physicalLocationLabelTr(physical),
        stockStatus: status,
        stockStatusLabel: stockStatusLabelTr(status),
        reserved,
        linkedOrderId: row.salesOrderId ?? null,
        readyToShip: false,
        note: row.note ?? null,
        supplierId: row.supplierId,
        supplierName: row.supplier?.companyName ?? '',
      })
    }

    return out
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
