import type { PrismaClient } from '@prisma/client'
import {
  isPlanEligibleForConfirmationQueue,
  isPlanTerminalForQueue,
  SHIPMENT_PLAN_EVENT,
  SHIPMENT_PLAN_STATUS,
} from '../constants/shipmentPlanStatuses.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'
import {
  ORDER_SHIPMENT_DISPLAY,
  syncOrderShipmentDisplayStatus,
} from '../lib/orderShipmentDisplayStatus.js'

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Promotes overdue planned/in-transit shipment plans into the delivery confirmation queue.
 * Same-day plans (plannedDate === today) are never promoted.
 */
export async function processDeliveryConfirmationQueue(
  prisma: PrismaClient,
  todayIso: string,
  options?: { authUser?: AuthUserContext },
): Promise<number> {
  const today = new Date(`${todayIso}T00:00:00.000Z`)
  const now = new Date()

  const candidates = await prisma.shipmentPlan.findMany({
    where: {
      plannedDate: { lt: today },
      status: { in: [SHIPMENT_PLAN_STATUS.PLANNED, SHIPMENT_PLAN_STATUS.APPLIED, SHIPMENT_PLAN_STATUS.IN_TRANSIT] },
    },
    include: { salesOrder: { select: { id: true, displayStatus: true } } },
  })

  let promoted = 0
  for (const plan of candidates) {
    if (plan.salesOrder.displayStatus === 'Teslim Edildi') continue
    if (!isPlanEligibleForConfirmationQueue(plan.status)) continue
    if (isPlanTerminalForQueue(plan.status)) continue

    await prisma.$transaction(async (tx) => {
      await tx.shipmentPlan.update({
        where: { id: plan.id },
        data: { status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM, updatedAt: now },
      })
      await syncOrderShipmentDisplayStatus(
        tx,
        plan.salesOrderId,
        ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM,
      )
      await tx.domainEvent.create({
        data: domainEventCreateInput(
          plan.salesOrderId,
          'SalesOrder',
          SHIPMENT_PLAN_EVENT.CONFIRMATION_REQUIRED,
          `corr-${plan.salesOrderId}-delivery-confirm-${plan.id}`,
          now,
          {
            planId: plan.id,
            plannedDate: isoDate(plan.plannedDate),
            previousStatus: plan.status,
          },
          options?.authUser,
        ),
      })
    })
    promoted += 1
  }

  return promoted
}
