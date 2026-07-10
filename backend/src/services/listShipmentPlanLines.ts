import type { PrismaClient } from '@prisma/client'
import { isMissingItemResolvedStatus } from '../constants/missingItemStatuses.js'
import {
  computeShipmentPlanLines,
  type ShipmentPlanLineDto,
} from './computeLineAvailability.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'

export async function listShipmentPlanLines(
  prisma: PrismaClient,
  orderId: string,
): Promise<ShipmentPlanLineDto[]> {
  const row = await loadSalesOrderWithRelations(prisma, orderId)
  const missingRows = await prisma.orderMissingItem.findMany({
    where: { orderId },
    select: { lineId: true, status: true },
  })
  const openMissingLineIds = new Set<string>()
  for (const m of missingRows) {
    if (isMissingItemResolvedStatus(m.status)) continue
    if (m.lineId) openMissingLineIds.add(m.lineId)
  }
  return computeShipmentPlanLines(row.lines, row.shipments, openMissingLineIds)
}
