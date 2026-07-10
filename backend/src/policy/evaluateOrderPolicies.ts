import { findReceivingRiskViolations } from '../lib/productReadiness.js'
import type { ShipmentPlanLineDto } from '../services/computeLineAvailability.js'
import type { SelectedShipmentLine } from '../services/computeLineAvailability.js'
import { POLICY_CODE, POLICY_SEVERITY, type PolicyEvaluation, type PolicyViolation } from './policyTypes.js'

export type OrderPolicyOrderSnapshot = {
  totalAmount: number
  remainingAmount: number
  isFullyPaid: boolean
}

export type EvaluateShipmentCreateInput = {
  operation: 'shipment_create'
  planLines: ShipmentPlanLineDto[]
  selected: SelectedShipmentLine[]
  allowReceivingRisk?: boolean
  policyOverrides?: string[]
  openMissingLineIds?: Set<string>
}

export type EvaluateOrderStatusChangeInput = {
  operation: 'order_status_change'
  targetStatus: string
  order: OrderPolicyOrderSnapshot
  openMissingCount: number
  policyOverrides?: string[]
}

export type PolicyInput = EvaluateShipmentCreateInput | EvaluateOrderStatusChangeInput

function hasOverride(overrides: string[] | undefined, code: string): boolean {
  return Array.isArray(overrides) && overrides.includes(code)
}

function finalize(violations: PolicyViolation[], overrides?: string[]): PolicyEvaluation {
  const blocking = violations.filter(
    (v) =>
      v.severity === POLICY_SEVERITY.BLOCKING &&
      !(v.allowOverride && hasOverride(overrides, String(v.code))),
  )
  return {
    violations,
    blocking,
    canProceed: blocking.length === 0,
  }
}

export function evaluateShipmentCreatePolicies(input: EvaluateShipmentCreateInput): PolicyEvaluation {
  const violations: PolicyViolation[] = []
  const overrides = input.policyOverrides

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

  const openMissing = input.openMissingLineIds ?? new Set<string>()
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

  return finalize(violations, overrides)
}

export function evaluateOrderStatusChangePolicies(
  input: EvaluateOrderStatusChangeInput,
): PolicyEvaluation {
  const violations: PolicyViolation[] = []
  const overrides = input.policyOverrides

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

  return finalize(violations, overrides)
}

export function assertPolicyAllowsProceed(
  evaluation: PolicyEvaluation,
  fallbackMessage = 'İşlem politika nedeniyle engellendi',
): void {
  if (evaluation.canProceed) return
  const first = evaluation.blocking[0]
  throw new Error(first?.message ?? fallbackMessage)
}
