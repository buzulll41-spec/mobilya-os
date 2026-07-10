import type { PrismaClient } from '@prisma/client'

export type DomainEventDto = {
  id: string
  type: string
  aggregateType: string
  aggregateId: string
  occurredAt: string
  correlationId: string
  payloadSchemaVersion: string
  payload: Record<string, unknown>
}

export function mapRow(row: {
  id: string
  type: string
  aggregateType: string
  aggregateId: string
  occurredAt: Date
  correlationId: string
  payloadSchemaVersion: string
  payload: unknown
}): DomainEventDto {
  const aggregateType =
    row.aggregateType === 'SALES_ORDER' ? 'SalesOrder' : row.aggregateType
  return {
    id: row.id,
    type: row.type,
    aggregateType,
    aggregateId: row.aggregateId,
    occurredAt: row.occurredAt.toISOString(),
    correlationId: row.correlationId,
    payloadSchemaVersion: row.payloadSchemaVersion,
    payload:
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
  }
}

export async function listDomainEvents(prisma: PrismaClient): Promise<DomainEventDto[]> {
  const rows = await prisma.domainEvent.findMany({
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(mapRow)
}

export async function listDomainEventsForOrder(
  prisma: PrismaClient,
  orderId: string,
): Promise<DomainEventDto[]> {
  const rows = await prisma.domainEvent.findMany({
    where: { aggregateId: orderId },
    orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
  })
  return rows.map(mapRow)
}
