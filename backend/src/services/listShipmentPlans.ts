import type { PrismaClient } from '@prisma/client'
import { mapShipmentPlanRow, type ShipmentPlanDto } from '../contracts/shipmentPlanDto.js'
import { processDeliveryConfirmationQueue } from './deliveryConfirmationQueue.js'
import type { AuthUserContext } from '../lib/authUser.js'

export type ListShipmentPlansQuery = {
  plannedDate?: string
  salesOrderId?: string
}

export async function listShipmentPlans(
  prisma: PrismaClient,
  query: ListShipmentPlansQuery = {},
  options?: { authUser?: AuthUserContext },
): Promise<ShipmentPlanDto[]> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  await processDeliveryConfirmationQueue(prisma, todayIso, options)

  const where: {
    plannedDate?: Date
    salesOrderId?: string
  } = {}

  if (query.plannedDate && /^\d{4}-\d{2}-\d{2}$/.test(query.plannedDate)) {
    where.plannedDate = new Date(`${query.plannedDate}T00:00:00.000Z`)
  }
  if (query.salesOrderId) {
    where.salesOrderId = query.salesOrderId
  }

  const rows = await prisma.shipmentPlan.findMany({
    where,
    orderBy: [{ plannedDate: 'asc' }, { plannedTime: 'asc' }, { updatedAt: 'desc' }],
  })

  return rows.map(mapShipmentPlanRow)
}
