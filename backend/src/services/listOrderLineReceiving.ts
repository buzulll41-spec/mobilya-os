import type { PrismaClient } from '@prisma/client'
import { isMissingItemResolvedStatus } from '../constants/missingItemStatuses.js'
import {
  mapOrderLineReceivingDto,
  mapOrderReadinessSummaryDto,
  type OrderLineReceivingDto,
  type OrderReadinessSummaryDto,
} from '../contracts/incomingGoodsDto.js'
import { AppHttpError } from '../errors/apiError.js'

export type OrderLineReceivingResponse = {
  lines: OrderLineReceivingDto[]
  summary: OrderReadinessSummaryDto
}

export async function listOrderLineReceiving(
  prisma: PrismaClient,
  orderId: string,
): Promise<OrderLineReceivingResponse> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        orderBy: { title: 'asc' },
        include: {
          product: {
            select: { id: true, defaultSupplierId: true, purchasePrice: true },
          },
        },
      },
    },
  })
  if (!order) throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')

  const missingRows = await prisma.orderMissingItem.findMany({
    where: { orderId },
    select: { lineId: true, status: true },
  })
  const openMissingLineIds = new Set<string>()
  for (const m of missingRows) {
    if (isMissingItemResolvedStatus(m.status)) continue
    if (m.lineId) openMissingLineIds.add(m.lineId)
  }

  const lines = order.lines.map((ln) =>
    mapOrderLineReceivingDto(ln, openMissingLineIds.has(ln.id)),
  )
  return { lines, summary: mapOrderReadinessSummaryDto(lines) }
}
