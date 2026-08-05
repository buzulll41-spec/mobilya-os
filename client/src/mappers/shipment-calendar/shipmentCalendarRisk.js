import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../../contracts/v1/shipmentStatuses.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'
import { remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {'ready' | 'risky' | 'critical' | 'in_transit'} ShipmentCalendarTone */

/**
 * @param {{
 *   inTransit?: boolean
 *   hasShipmentIssue?: boolean
 *   installationPending?: boolean
 *   openMissingCount?: number
 *   riskSeverity?: string
 *   dueDate?: string
 *   todayIso: string
 *   amount?: number
 *   paid?: boolean
 *   paidAmount?: number
 *   shipmentStatus?: string
 * }} ctx
 * @returns {ShipmentCalendarTone}
 */
export function resolveShipmentCalendarTone(ctx) {
  const rem = remainingBalance({
    amount: ctx.amount ?? 0,
    paid: ctx.paid,
    paidAmount: ctx.paidAmount,
  })
  const ratio = (ctx.amount ?? 0) > 0 ? rem / (ctx.amount ?? 1) : 0
  const overdue = ctx.dueDate ? isTerminOverdue({ dueDate: ctx.dueDate }, ctx.todayIso) : false

  if ((ctx.inTransit ?? false) || ctx.shipmentStatus === SHIPMENT_OPERATION_STATUS.DISPATCHED) {
    return 'in_transit'
  }

  if (
    (ctx.openMissingCount ?? 0) > 0 ||
    ctx.hasShipmentIssue ||
    ctx.riskSeverity === RISK_SEVERITY.CRITICAL ||
    overdue ||
    ratio >= 0.75
  ) {
    return 'critical'
  }

  if (
    ctx.installationPending ||
    ctx.riskSeverity === RISK_SEVERITY.HIGH ||
    ctx.riskSeverity === RISK_SEVERITY.MEDIUM ||
    ratio >= 0.45
  ) {
    return 'risky'
  }

  return 'ready'
}

/**
 * @param {ShipmentCalendarTone} tone
 */
export function shipmentCalendarToneLabel(tone) {
  switch (tone) {
    case 'in_transit':
      return 'Yolda'
    case 'critical':
      return 'Kritik'
    case 'risky':
      return 'Riskli'
    default:
      return 'Hazır'
  }
}
