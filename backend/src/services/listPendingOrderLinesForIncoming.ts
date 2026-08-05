import type { PrismaClient } from '@prisma/client'
import {
  mapPendingOrderLineForIncoming,
  type PendingOrderLineForIncomingDto,
} from '../contracts/incomingGoodsDto.js'
import { decimalToNumber } from '../lib/money.js'
import {
  isOrderLinePendingForIncomingEntry,
  matchesIncomingPendingSearch,
} from '../lib/incomingPendingLineRules.js'

const CLOSED_STATUSES = new Set(['Teslim Edildi', 'İptal'])

export async function listPendingOrderLinesForIncoming(
  prisma: PrismaClient,
  q?: string,
): Promise<PendingOrderLineForIncomingDto[]> {
  const lines = await prisma.orderLine.findMany({
    include: {
      salesOrder: {
        select: { id: true, customerName: true, dueDate: true, displayStatus: true },
      },
    },
    orderBy: [{ salesOrder: { dueDate: 'asc' } }, { title: 'asc' }],
    take: 800,
  })

  const out: PendingOrderLineForIncomingDto[] = []

  for (const line of lines) {
    if (CLOSED_STATUSES.has(line.salesOrder.displayStatus)) continue

    const ordered = decimalToNumber(line.qtyOrdered)
    const received = decimalToNumber(line.qtyReceived)
    if (
      !isOrderLinePendingForIncomingEntry({
        supplyStatus: line.supplyStatus,
        warehouseEntryStatus: line.warehouseEntryStatus,
        shipmentReady: line.shipmentReady,
        qtyOrdered: ordered,
        qtyReceived: received,
      })
    ) {
      continue
    }

    if (
      !matchesIncomingPendingSearch(
        {
          customerName: line.salesOrder.customerName,
          orderNumber: line.salesOrder.id,
          salesOrderId: line.salesOrder.id,
          productTitle: line.title,
          supplierName: line.supplierNameSnapshot,
        },
        q,
      )
    ) {
      continue
    }

    out.push(mapPendingOrderLineForIncoming(line, line.salesOrder))
  }

  return out.slice(0, 100)
}
