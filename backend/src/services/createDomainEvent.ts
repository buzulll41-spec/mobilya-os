import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { mergeActorIntoPayload, resolveOperationActor, type OperationActorWire } from '../lib/operationActor.js'
import { mapRow, type DomainEventDto } from './listDomainEvents.js'
import { ingestMemoryFromDomainEvent } from './memory/MemoryService.js'

/** İstemciden append edilebilen operasyon event tipleri. */
export const CLIENT_APPENDABLE_DOMAIN_EVENT_TYPES = [
  'sales.contract_printed',
  'shipment.dispatch_sheet_printed',
  'dispatch.advice.generated',
  'dispatch.auto_planned',
  'dispatch.risk_detected',
] as const

export type ClientAppendableDomainEventType = (typeof CLIENT_APPENDABLE_DOMAIN_EVENT_TYPES)[number]

export type PostDomainEventRequest = {
  type: string
  salesOrderId: string
  metadata?: Record<string, unknown>
}

function isClientAppendableType(type: string): type is ClientAppendableDomainEventType {
  return (CLIENT_APPENDABLE_DOMAIN_EVENT_TYPES as readonly string[]).includes(type)
}

export function assertValidPostDomainEventRequest(body: unknown): PostDomainEventRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const type = typeof o.type === 'string' ? o.type.trim() : ''
  const salesOrderId =
    typeof o.salesOrderId === 'string'
      ? o.salesOrderId.trim()
      : typeof o.aggregateId === 'string'
        ? o.aggregateId.trim()
        : ''

  const details: Record<string, string> = {}
  if (!type) details.type = 'Required'
  if (!salesOrderId) details.salesOrderId = 'Required'
  if (type && !isClientAppendableType(type)) {
    details.type = `Unsupported type; allowed: ${CLIENT_APPENDABLE_DOMAIN_EVENT_TYPES.join(', ')}`
  }

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  const metadata =
    o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata)
      ? (o.metadata as Record<string, unknown>)
      : undefined

  return { type, salesOrderId, ...(metadata ? { metadata } : {}) }
}

export async function createDomainEvent(
  prisma: PrismaClient,
  body: PostDomainEventRequest,
  options?: { authUser?: AuthUserContext },
): Promise<DomainEventDto> {
  const order = await prisma.salesOrder.findUnique({ where: { id: body.salesOrderId } })
  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }

  const now = new Date()
  const actor: OperationActorWire = resolveOperationActor(body.metadata, options?.authUser, body.type)

  const basePayload: Record<string, unknown> = {
    ...(body.metadata ?? {}),
    source: body.metadata?.source ?? 'client',
  }

  if (body.type === 'sales.contract_printed') {
    basePayload.printedBy = basePayload.printedBy ?? actor.actorName
    basePayload.printedAt = basePayload.printedAt ?? actor.at
    basePayload.source = basePayload.source ?? 'contract_preview'
  }

  if (body.type === 'shipment.dispatch_sheet_printed') {
    basePayload.printedBy = basePayload.printedBy ?? actor.actorName
    basePayload.printedAt = basePayload.printedAt ?? actor.at
    basePayload.source = basePayload.source ?? 'dispatch_sheet_preview'
  }

  if (body.type === 'dispatch.advice.generated') {
    basePayload.generatedBy = basePayload.generatedBy ?? actor.actorName
    basePayload.generatedAt = basePayload.generatedAt ?? actor.at
  }

  if (body.type === 'dispatch.auto_planned') {
    basePayload.plannedBy = basePayload.plannedBy ?? actor.actorName
    basePayload.plannedAt = basePayload.plannedAt ?? actor.at
  }

  if (body.type === 'dispatch.risk_detected') {
    basePayload.detectedBy = basePayload.detectedBy ?? actor.actorName
    basePayload.detectedAt = basePayload.detectedAt ?? actor.at
  }

  const payload = mergeActorIntoPayload(basePayload, actor)
  const correlationId = `corr-${body.salesOrderId}-${body.type}-${now.getTime()}`

  const row = await prisma.domainEvent.create({
    data: {
      type: body.type,
      aggregateType: 'SalesOrder',
      aggregateId: body.salesOrderId,
      occurredAt: now,
      correlationId,
      payload: payload as Prisma.InputJsonValue,
    },
  })

  await ingestMemoryFromDomainEvent(
    prisma,
    {
      id: row.id,
      type: row.type,
      aggregateId: row.aggregateId,
      occurredAt: row.occurredAt,
      payload: payload,
    },
    { customerName: order.customerName, orderLabel: order.id },
  ).catch(() => undefined)

  return mapRow(row)
}
