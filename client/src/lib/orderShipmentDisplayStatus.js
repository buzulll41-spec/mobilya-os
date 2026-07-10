import { SHIPMENT_OPERATION_STATUS } from '../contracts/v1/shipmentStatuses.js'
import { SHIPMENT_PLAN_STATUS } from '../constants/shipmentPlanStatuses.js'

export const ORDER_SHIPMENT_DISPLAY = /** @type {const} */ ({
  SHIPMENT_PLANNED: 'Sevk Planlandı',
  DISPATCHED: 'Yola Çıktı',
  PENDING_DELIVERY_CONFIRM: 'Teslim Onayı Bekliyor',
  DELIVERED: 'Teslim Edildi',
})

/**
 * @param {string} lineDerivedStatus
 * @param {{ status: string; plannedShipDate?: string | null }[]} shipments
 * @param {{ status: string } | null | undefined} [plan]
 */
export function resolveShipmentAwareDisplayStatus(lineDerivedStatus, shipments, plan) {
  if (lineDerivedStatus === ORDER_SHIPMENT_DISPLAY.DELIVERED) {
    return ORDER_SHIPMENT_DISPLAY.DELIVERED
  }

  const planStatus = plan?.status ?? null
  if (planStatus === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    return ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM
  }

  const sorted = [...(shipments ?? [])].sort((a, b) => {
    const da = a.plannedShipDate ? Date.parse(`${a.plannedShipDate}T12:00:00`) : 0
    const db = b.plannedShipDate ? Date.parse(`${b.plannedShipDate}T12:00:00`) : 0
    return db - da
  })
  const latest = sorted[0]
  const shipStatus = String(latest?.status ?? '').toUpperCase()

  if (shipStatus === SHIPMENT_OPERATION_STATUS.DELIVERED) {
    return ORDER_SHIPMENT_DISPLAY.DELIVERED
  }
  if (shipStatus === SHIPMENT_OPERATION_STATUS.DISPATCHED) {
    return ORDER_SHIPMENT_DISPLAY.DISPATCHED
  }
  if (planStatus && ['PLANNED', 'APPLIED', 'IN_TRANSIT'].includes(planStatus)) {
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

/**
 * Sipariş listesi Sevk kolonu — displayStatus ile senkron.
 * @param {string | null | undefined} displayStatus
 * @returns {string | null}
 */
export function shipmentColumnLabelFromDisplayStatus(displayStatus) {
  switch (displayStatus) {
    case ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED:
      return 'Planlandı'
    case ORDER_SHIPMENT_DISPLAY.DISPATCHED:
      return 'Yolda'
    case ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM:
      return 'Onay Bekliyor'
    case ORDER_SHIPMENT_DISPLAY.DELIVERED:
      return 'Teslim'
    default:
      return null
  }
}
