export const POLICY_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  BLOCKING: 'blocking',
} as const

export type PolicySeverity = (typeof POLICY_SEVERITY)[keyof typeof POLICY_SEVERITY]

export const POLICY_CODE = {
  SHIPMENT_NOT_RECEIVED: 'shipment.not_received',
  SHIPMENT_OPEN_MISSING: 'shipment.open_missing_ssh',
  ORDER_DELIVER_UNPAID: 'order.deliver.unpaid_balance',
  ORDER_DELIVER_OPEN_MISSING: 'order.deliver.open_missing_ssh',
} as const

export type PolicyCode = (typeof POLICY_CODE)[keyof typeof POLICY_CODE]

export type PolicyViolation = {
  code: PolicyCode | string
  message: string
  severity: PolicySeverity
  allowOverride: boolean
}

export type PolicyEvaluation = {
  violations: PolicyViolation[]
  blocking: PolicyViolation[]
  canProceed: boolean
}
