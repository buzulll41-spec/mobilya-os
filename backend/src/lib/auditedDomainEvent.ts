import type { Prisma } from '@prisma/client'
import type { AuthUserContext } from './authUser.js'
import { mergeActorIntoPayload, resolveOperationActor } from './operationActor.js'

export function buildAuditedEventPayload(
  basePayload: Record<string, unknown>,
  authUser: AuthUserContext | undefined,
  eventType: string,
): Record<string, unknown> {
  return mergeActorIntoPayload(
    basePayload,
    resolveOperationActor(undefined, authUser, eventType),
  )
}

export function domainEventCreateInput(
  aggregateId: string,
  aggregateType: string,
  type: string,
  correlationId: string,
  occurredAt: Date,
  basePayload: Record<string, unknown>,
  authUser?: AuthUserContext,
): Prisma.DomainEventCreateInput {
  return {
    type,
    aggregateType,
    aggregateId,
    occurredAt,
    correlationId,
    payload: buildAuditedEventPayload(basePayload, authUser, type) as Prisma.InputJsonValue,
  }
}
