import type { PrismaClient } from '@prisma/client'
import {
  mapIncomingGoodsRecordDto,
  type IncomingGoodsRecordDto,
} from '../contracts/incomingGoodsDto.js'
import { parseIsoDateOnly, toIsoDateString } from '../lib/isoDate.js'

export type ListIncomingGoodsQuery = {
  receivedAt?: string
  purpose?: string
  supplierId?: string
}

export async function listIncomingGoods(
  prisma: PrismaClient,
  query: ListIncomingGoodsQuery = {},
): Promise<IncomingGoodsRecordDto[]> {
  const where: {
    receivedAt?: Date
    purpose?: string
    supplierId?: string
  } = {}

  if (query.receivedAt) {
    where.receivedAt = parseIsoDateOnly(query.receivedAt)
  }
  if (query.purpose) where.purpose = query.purpose
  if (query.supplierId) where.supplierId = query.supplierId

  const rows = await prisma.incomingGoodsRecord.findMany({
    where,
    include: { supplier: { select: { companyName: true } } },
    orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
    take: 200,
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

  return rows.map((row) => {
    const order = row.salesOrderId ? orderById.get(row.salesOrderId) : undefined
    return mapIncomingGoodsRecordDto(
      row,
      order
        ? { orderNumber: order.id, customerName: order.customerName }
        : null,
    )
  })
}

export function todayIsoDate(): string {
  return process.env.DEMO_TODAY ?? toIsoDateString(new Date())
}
