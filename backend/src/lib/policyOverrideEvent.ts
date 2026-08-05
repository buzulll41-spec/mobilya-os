import type { Prisma } from '@prisma/client'
import type { AuthUserContext } from './authUser.js'
import { mergeActorIntoPayload, resolveOperationActor } from './operationActor.js'

export const POLICY_OVERRIDE_EVENT_TYPE = 'policy.override'

export type PolicyOverrideEventInput = {
  orderId: string
  code: string
  reason: string
  context: string
  overrides?: string[]
  metadata?: Record<string, unknown>
  authUser?: AuthUserContext
}

export function buildPolicyOverridePayload(input: PolicyOverrideEventInput): Record<string, unknown> {
  const actor = resolveOperationActor(input.metadata, input.authUser, POLICY_OVERRIDE_EVENT_TYPE)
  const base: Record<string, unknown> = {
    code: input.code,
    reason: input.reason,
    context: input.context,
    ...(input.overrides?.length ? { overrides: input.overrides } : {}),
    ...(input.metadata ?? {}),
  }
  return mergeActorIntoPayload(base, actor)
}

export function policyOverrideEventCreateData(
  input: PolicyOverrideEventInput,
  occurredAt: Date,
): Prisma.DomainEventCreateInput {
  const payload = buildPolicyOverridePayload(input)
  return {
    type: POLICY_OVERRIDE_EVENT_TYPE,
    aggregateType: 'SalesOrder',
    aggregateId: input.orderId,
    occurredAt,
    correlationId: `corr-${input.orderId}-policy-${input.code}-${occurredAt.getTime()}`,
    payload: payload as Prisma.InputJsonValue,
  }
}
