import type { PrismaClient } from '@prisma/client'
import { mapShipmentGroupRow, type ShipmentGroupDto } from '../contracts/shipmentPlanDto.js'

export async function listShipmentGroups(prisma: PrismaClient): Promise<ShipmentGroupDto[]> {
  const rows = await prisma.shipmentGroup.findMany({
    include: { plans: { select: { salesOrderId: true } } },
    orderBy: [{ createdAt: 'desc' }],
  })
  return rows.map(mapShipmentGroupRow)
}
