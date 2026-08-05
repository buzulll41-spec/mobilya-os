import type { PrismaClient } from '@prisma/client'
import type { SalesOrderWithRelations } from '../projection/salesOrderListItemProjection.js'
import { AppHttpError } from '../errors/apiError.js'

export async function loadSalesOrderWithRelations(
  prisma: PrismaClient,
  orderId: string,
): Promise<SalesOrderWithRelations> {
  const row = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        include: {
          product: { select: { category: true, suiteType: true } },
        },
      },
      payments: true,
      shipments: { include: { lines: true } },
      missingItems: { select: { status: true } },
    },
  })
  if (!row) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }
  return row as SalesOrderWithRelations
}
