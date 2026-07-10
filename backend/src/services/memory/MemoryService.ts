import type { PrismaClient } from '@prisma/client'
import type {
  AIWorkerMemoryDto,
  CeoLearnedInsightDto,
  CreateMemoryInput,
  WorkerMemoryContextQuery,
} from '../../contracts/aiWorkerMemoryDto.js'
import {
  WORKER_CODE_LABELS,
  buildDemoSeedMemories,
  buildMemoriesFromDomainEvent,
  resolveWorkerCode,
  type DomainEventLike,
  type MemoryEventContext,
} from './memoryFromDomainEvent.js'

let infrastructureReady = false

function mapRow(row: {
  id: string
  workerCode: string
  entityType: string
  entityId: string
  memoryType: string
  title: string
  content: string
  importance: string
  sourceEvent: string | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}): AIWorkerMemoryDto {
  return {
    id: row.id,
    workerCode: row.workerCode,
    entityType: row.entityType as AIWorkerMemoryDto['entityType'],
    entityId: row.entityId,
    memoryType: row.memoryType as AIWorkerMemoryDto['memoryType'],
    title: row.title,
    content: row.content,
    importance: row.importance as AIWorkerMemoryDto['importance'],
    sourceEvent: row.sourceEvent,
    active: row.active,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function resetMemoryInfrastructureForTests(): void {
  infrastructureReady = false
}

export async function assertMemoryInfrastructureReady(prisma: PrismaClient): Promise<void> {
  await prisma.aIWorkerMemory.findFirst({ select: { id: true } })
  if (!infrastructureReady) {
    await bootstrapMemoriesFromDomainEvents(prisma)
    infrastructureReady = true
  }
}

export function isMemoryInfrastructureReadySync(): boolean {
  return infrastructureReady
}

async function resolveOrderContext(
  prisma: PrismaClient,
  orderId: string,
): Promise<MemoryEventContext> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    select: { id: true, customerName: true },
  })
  if (!order) return { orderLabel: orderId }
  return {
    customerName: order.customerName,
    customerId: order.customerName,
    orderLabel: order.id,
  }
}

export async function createMemory(
  prisma: PrismaClient,
  input: CreateMemoryInput,
): Promise<AIWorkerMemoryDto> {
  const row = await prisma.aIWorkerMemory.create({
    data: {
      workerCode: input.workerCode,
      entityType: input.entityType,
      entityId: input.entityId,
      memoryType: input.memoryType,
      title: input.title,
      content: input.content,
      importance: input.importance,
      sourceEvent: input.sourceEvent ?? null,
      active: true,
    },
  })
  return mapRow(row)
}

export async function ingestMemoryFromDomainEvent(
  prisma: PrismaClient,
  event: DomainEventLike,
  ctx?: MemoryEventContext,
): Promise<AIWorkerMemoryDto[]> {
  const orderCtx = ctx ?? (await resolveOrderContext(prisma, event.aggregateId))
  const drafts = buildMemoriesFromDomainEvent(event, orderCtx)
  const created: AIWorkerMemoryDto[] = []

  for (const draft of drafts) {
    const existing = await prisma.aIWorkerMemory.findFirst({
      where: {
        workerCode: draft.workerCode,
        entityType: draft.entityType,
        entityId: draft.entityId,
        sourceEvent: draft.sourceEvent ?? null,
        active: true,
      },
    })
    if (existing) {
      created.push(mapRow(existing))
      continue
    }

    const row = await prisma.aIWorkerMemory.create({
      data: {
        workerCode: draft.workerCode,
        entityType: draft.entityType,
        entityId: draft.entityId,
        memoryType: draft.memoryType,
        title: draft.title,
        content: draft.content,
        importance: draft.importance,
        sourceEvent: draft.sourceEvent ?? null,
        active: true,
      },
    })
    created.push(mapRow(row))
  }

  return created
}

export async function bootstrapMemoriesFromDomainEvents(prisma: PrismaClient): Promise<number> {
  const count = await prisma.aIWorkerMemory.count()
  if (count > 0) return count

  const events = await prisma.domainEvent.findMany({
    orderBy: { occurredAt: 'asc' },
    take: 500,
  })

  for (const evt of events) {
    await ingestMemoryFromDomainEvent(prisma, {
      id: evt.id,
      type: evt.type,
      aggregateId: evt.aggregateId,
      occurredAt: evt.occurredAt,
      payload: (evt.payload ?? {}) as Record<string, unknown>,
    })
  }

  for (const seed of buildDemoSeedMemories()) {
    const exists = await prisma.aIWorkerMemory.findFirst({
      where: { sourceEvent: seed.sourceEvent ?? undefined },
    })
    if (!exists) {
      await createMemory(prisma, seed)
    }
  }

  return prisma.aIWorkerMemory.count()
}

export async function listMemories(
  prisma: PrismaClient,
  filters: {
    workerCode?: string
    active?: boolean
    importance?: string
    limit?: number
  } = {},
): Promise<AIWorkerMemoryDto[]> {
  const rows = await prisma.aIWorkerMemory.findMany({
    where: {
      ...(filters.workerCode ? { workerCode: filters.workerCode } : {}),
      ...(filters.active !== undefined ? { active: filters.active } : { active: true }),
      ...(filters.importance ? { importance: filters.importance } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit ?? 100,
  })
  return rows.map(mapRow)
}

export async function listMemoriesForWorkerContext(
  prisma: PrismaClient,
  query: WorkerMemoryContextQuery,
): Promise<AIWorkerMemoryDto[]> {
  const workerCode = resolveWorkerCode(query.workerCode)
  const limit = query.limit ?? 12
  const entityIds = [
    query.orderId,
    query.customerId,
    query.customerName,
    query.supplierId,
  ].filter(Boolean) as string[]

  const rows = await prisma.aIWorkerMemory.findMany({
    where: {
      workerCode,
      active: true,
      ...(entityIds.length
        ? {
            OR: entityIds.flatMap((id) => [
              { entityId: id },
              { entityType: 'GENERAL', entityId: 'global' },
            ]),
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 2,
  })

  const importanceRank: Record<string, number> = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
  }

  const sorted = rows
    .slice()
    .sort(
      (a: { importance: string; createdAt: Date }, b: { importance: string; createdAt: Date }) =>
        (importanceRank[a.importance] ?? 9) - (importanceRank[b.importance] ?? 9) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
    .slice(0, limit)

  if (sorted.length >= limit) return sorted.map(mapRow)

  const general = await prisma.aIWorkerMemory.findMany({
    where: { workerCode, active: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  const seen = new Set<string>()
  const merged = [...rows, ...general].filter((r) => {
    if (seen.has(r.id)) return false
    seen.add(r.id)
    return true
  })

  return merged.slice(0, limit).map(mapRow)
}

export async function buildWorkerMemoryContextText(
  prisma: PrismaClient,
  query: WorkerMemoryContextQuery,
): Promise<string> {
  const memories = await listMemoriesForWorkerContext(prisma, query)
  if (!memories.length) return '(no persistent ERP memories for this worker context)'

  return memories
    .map(
      (m, i) =>
        `${i + 1}. [${m.importance}] ${m.memoryType} · ${m.title}\n   ${m.content} (${m.createdAt.slice(0, 10)})`,
    )
    .join('\n')
}

export async function deactivateMemory(
  prisma: PrismaClient,
  id: string,
): Promise<AIWorkerMemoryDto | null> {
  try {
    const row = await prisma.aIWorkerMemory.update({
      where: { id },
      data: { active: false },
    })
    return mapRow(row)
  } catch {
    return null
  }
}

export async function deleteMemory(prisma: PrismaClient, id: string): Promise<boolean> {
  try {
    await prisma.aIWorkerMemory.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

export function formatCeoLearnedMessage(memory: AIWorkerMemoryDto): string {
  const workerLabel = WORKER_CODE_LABELS[memory.workerCode] ?? memory.workerCode
  const entity =
    memory.memoryType === 'SUPPLIER'
      ? `${memory.entityId}'ın`
      : memory.memoryType === 'CUSTOMER'
        ? `${memory.entityId}'ın`
        : `${memory.entityId} için`
  return `${workerLabel}, ${entity} ${memory.content.replace(/\.$/, '')} öğrendi.`
}

export async function buildCeoLearnedInsights(
  prisma: PrismaClient,
  limit = 6,
): Promise<CeoLearnedInsightDto[]> {
  const rows = await prisma.aIWorkerMemory.findMany({
    where: {
      active: true,
      importance: { in: ['CRITICAL', 'HIGH'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return rows.map((row: Parameters<typeof mapRow>[0]) => {
    const memory = mapRow(row)
    return {
      id: memory.id,
      workerCode: memory.workerCode,
      workerLabel: WORKER_CODE_LABELS[memory.workerCode] ?? memory.workerCode,
      message: formatCeoLearnedMessage(memory),
      importance: memory.importance,
      entityLabel: `${memory.memoryType} · ${memory.entityId}`,
      createdAt: memory.createdAt,
    }
  })
}

export async function resetAllMemoriesForTests(prisma: PrismaClient): Promise<void> {
  await prisma.aIWorkerMemory.deleteMany()
  infrastructureReady = false
}
