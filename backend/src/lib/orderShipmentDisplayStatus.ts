import type { Prisma } from '@prisma/client'
import { SHIPMENT_OPERATION_STATUS } from '../constants/shipmentStatuses.js'
import { SHIPMENT_PLAN_STATUS } from '../constants/shipmentPlanStatuses.js'

type Tx = Prisma.TransactionClient

export const ORDER_SHIPMENT_DISPLAY = {
  SHIPMENT_PLANNED: 'Sevk Planlandı',
  DISPATCHED: 'Yola Çıktı',
  PENDING_DELIVERY_CONFIRM: 'Teslim Onayı Bekliyor',
  DELIVERED: 'Teslim Edildi',
} as const

type ShipmentLike = { status: string; plannedShipDate?: Date | null }
type PlanLike = { status: string } | null | undefined

/**
 * Sevk planı / sevkiyat durumuna göre sipariş listesi görünüm durumunu türetir.
 */
export function resolveShipmentAwareDisplayStatus(
  lineDerivedStatus: string,
  shipments: ShipmentLike[],
  plan?: PlanLike,
): string {
  if (lineDerivedStatus === ORDER_SHIPMENT_DISPLAY.DELIVERED) {
    return ORDER_SHIPMENT_DISPLAY.DELIVERED
  }

  const planStatus = plan?.status ?? null
  if (planStatus === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    return ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM
  }

  const sorted = [...shipments].sort((a, b) => {
    const da = a.plannedShipDate?.getTime?.() ?? 0
    const db = b.plannedShipDate?.getTime?.() ?? 0
    return db - da
  })
  const latest = sorted[0]
  const shipStatus = latest?.status?.toUpperCase?.() ?? ''

  if (shipStatus === SHIPMENT_OPERATION_STATUS.DELIVERED) {
    return ORDER_SHIPMENT_DISPLAY.DELIVERED
  }
  if (shipStatus === SHIPMENT_OPERATION_STATUS.DISPATCHED) {
    return ORDER_SHIPMENT_DISPLAY.DISPATCHED
  }
  if (
    planStatus &&
    ['PLANNED', 'APPLIED', 'IN_TRANSIT'].includes(planStatus)
  ) {
    return ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED
  }
  if (
    shipStatus === SHIPMENT_OPERATION_STATUS.PLANNED ||
    shipStatus === SHIPMENT_OPERATION_STATUS.LOADED
  ) {
    return ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED
  }

  return lineDerivedStatus
}

export async function syncOrderShipmentDisplayStatus(
  tx: Tx,
  orderId: string,
  displayStatus: string,
): Promise<void> {
  await tx.salesOrder.update({
    where: { id: orderId },
    data: { displayStatus, version: { increment: 1 } },
  })
}
