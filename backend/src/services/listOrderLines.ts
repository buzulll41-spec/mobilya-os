import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import type { OrderLineDetailDto } from '../contracts/orderLineDto.js'
import { configurationSummaryFromJson } from '../lib/buildLineCommercialSnapshot.js'
import { decimalToNumber } from '../lib/money.js'
import { parseLineConfiguration, type LineConfiguration } from '../constants/productConfigurationSchema.js'

function mapConfiguration(raw: unknown): LineConfiguration | null {
  const parsed = parseLineConfiguration(raw)
  return parsed ?? null
}

export async function listOrderLines(
  prisma: PrismaClient,
  orderId: string,
): Promise<OrderLineDetailDto[]> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    select: {
      lines: {
        orderBy: { id: 'asc' },
        include: {
          product: { select: { category: true } },
        },
      },
    },
  })

  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }

  return order.lines.map((ln) => ({
    id: ln.id,
    salesOrderId: ln.salesOrderId,
    title: ln.title,
    productTitleSnapshot: ln.productTitleSnapshot ?? ln.title,
    productId: ln.productId,
    productGroup: ln.product?.category ?? ln.productGroupSnapshot ?? null,
    productGroupSnapshot: ln.productGroupSnapshot ?? ln.product?.category ?? null,
    unitPrice: ln.unitPrice != null ? decimalToNumber(ln.unitPrice) : null,
    lineTotal: ln.lineTotal != null ? decimalToNumber(ln.lineTotal) : null,
    qtyOrdered: ln.qtyOrdered.toString(),
    qtyReceived: ln.qtyReceived.toString(),
    supplierId: ln.supplierId,
    supplierNameSnapshot: ln.supplierNameSnapshot,
    configuration: mapConfiguration(ln.configuration),
    configurationSummary: configurationSummaryFromJson(ln.configurationSummary),
    soldSalesSourceType: ln.soldSalesSourceType ?? null,
    soldDisplayFloor: ln.soldDisplayFloor ?? null,
    soldExternalSupplyType: ln.soldExternalSupplyType ?? null,
    soldUnitCost: ln.soldUnitCost != null ? decimalToNumber(ln.soldUnitCost) : null,
    supplyStatus: ln.supplyStatus,
    supplyChannel: ln.supplyChannel,
    supplySentAt: ln.supplySentAt?.toISOString() ?? null,
    supplySentByUserId: ln.supplySentByUserId,
    supplySentByName: ln.supplySentByName,
    warehouseEntryStatus: ln.warehouseEntryStatus,
    shipmentReady: ln.shipmentReady,
  }))
}
