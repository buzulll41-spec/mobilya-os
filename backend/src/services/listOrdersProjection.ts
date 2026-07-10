import { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'

export async function listSalesOrderListItems(prisma: PrismaClient): Promise<SalesOrderListItemDto[]> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  let rows: SalesOrderWithRelations[]
  try {
    rows = (await prisma.salesOrder.findMany({
      include: {
        lines: true,
        payments: true,
        shipments: { include: { lines: true } },
        shipmentPlans: { take: 1, orderBy: { updatedAt: 'desc' } },
        missingItems: { select: { status: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })) as SalesOrderWithRelations[]
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }

  const items: SalesOrderListItemDto[] = []
  for (const row of rows) {
    try {
      items.push(projectSalesOrderListItemFromDbRow(row, todayIso))
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.error(`[listOrdersProjection] projection failed for order ${row.id}`, err)
      }
    }
  }
  return items
}
