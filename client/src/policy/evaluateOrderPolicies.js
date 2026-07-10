import { findReceivingRiskViolations } from '../mappers/receiving/productReadiness.js'
import { POLICY_CODE, POLICY_SEVERITY } from './policyTypes.js'

/**
 * @param {string[] | undefined} overrides
 * @param {string} code
 */
function hasOverride(overrides, code) {
  return Array.isArray(overrides) && overrides.includes(code)
}

/**
 * @param {import('./policyTypes.js').PolicyViolation[]} violations
 * @param {string[] | undefined} overrides
 */
function finalize(violations, overrides) {
  const blocking = violations.filter(
    (v) =>
      v.severity === POLICY_SEVERITY.BLOCKING &&
      !(v.allowOverride && hasOverride(overrides, String(v.code))),
  )
  return { violations, blocking, canProceed: blocking.length === 0 }
}

/**
 * @param {{
 *   planLines: import('../mappers/shipment/computeShipmentPlanLines.js').ShipmentPlanLineVm[]
 *   selected: { orderLineId: string, qty: number }[]
 *   allowReceivingRisk?: boolean
 *   policyOverrides?: string[]
 *   openMissingLineIds?: Set<string>
 * }} input
 */
export function evaluateShipmentCreatePolicies(input) {
  /** @type {import('./policyTypes.js').PolicyViolation[]} */
  const violations = []

  if (!input.allowReceivingRisk) {
    const notReceived = findReceivingRiskViolations(input.planLines, input.selected).filter(
      (v) => v.reason === 'not_received',
    )
    if (notReceived.length) {
      violations.push({
        code: POLICY_CODE.SHIPMENT_NOT_RECEIVED,
        message: 'Bu ürün henüz fiziksel olarak gelmedi.',
        severity: POLICY_SEVERITY.BLOCKING,
        allowOverride: true,
      })
    }
  }

  const openMissing = input.openMissingLineIds ?? new Set()
  if (openMissing.size > 0) {
    for (const row of input.selected) {
      if (openMissing.has(row.orderLineId)) {
        violations.push({
          code: POLICY_CODE.SHIPMENT_OPEN_MISSING,
          message: 'Açık SSH kaydı olan satır sevk planına dahil edilemez.',
          severity: POLICY_SEVERITY.BLOCKING,
          allowOverride: false,
        })
        break
      }
    }
  }

  return finalize(violations, input.policyOverrides)
}

/**
 * @param {{
 *   targetStatus: string
 *   order: { totalAmount: number, remainingAmount: number, isFullyPaid: boolean }
 *   openMissingCount: number
 *   policyOverrides?: string[]
 * }} input
 */
export function evaluateOrderStatusChangePolicies(input) {
  /** @type {import('./policyTypes.js').PolicyViolation[]} */
  const violations = []

  if (input.targetStatus === 'Teslim Edildi') {
    if (input.openMissingCount > 0) {
      violations.push({
        code: POLICY_CODE.ORDER_DELIVER_OPEN_MISSING,
        message: 'Açık SSH varken sipariş teslim edilemez.',
        severity: POLICY_SEVERITY.BLOCKING,
        allowOverride: true,
      })
    }
    if (!input.order.isFullyPaid && input.order.remainingAmount > 0.009) {
      violations.push({
        code: POLICY_CODE.ORDER_DELIVER_UNPAID,
        message: 'Eksik tahsilat varken sipariş teslim edilemez.',
        severity: POLICY_SEVERITY.BLOCKING,
        allowOverride: false,
      })
    }
  }

  return finalize(violations, input.policyOverrides)
}

/**
 * @param {{ canProceed: boolean, blocking: { message?: string }[] }} evaluation
 * @param {string} [fallbackMessage]
 */
export function assertPolicyAllowsProceed(evaluation, fallbackMessage = 'İşlem politika nedeniyle engellendi') {
  if (evaluation.canProceed) return
  const first = evaluation.blocking[0]
  throw new Error(first?.message ?? fallbackMessage)
}
