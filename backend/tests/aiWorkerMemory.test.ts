import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildDemoSeedMemories,
  buildMemoriesFromDomainEvent,
  resolveWorkerCode,
} from '../src/services/memory/memoryFromDomainEvent.js'
import {
  assertMemoryInfrastructureReady,
  buildCeoLearnedInsights,
  buildWorkerMemoryContextText,
  createMemory,
  ingestMemoryFromDomainEvent,
  listMemories,
  resetAllMemoriesForTests,
  resetMemoryInfrastructureForTests,
} from '../src/services/memory/MemoryService.js'
import { MEMORY_IMPORTANCE } from '../src/contracts/aiWorkerMemoryDto.js'

function createMockPrisma() {
  /** @type {Map<string, Record<string, unknown>>} */
  const rows = new Map()
  let seq = 0

  return {
    rows,
    prisma: {
      aIWorkerMemory: {
        findFirst: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
          for (const row of rows.values()) {
            if (where?.id && row.id !== where.id) continue
            if (where?.sourceEvent && row.sourceEvent !== where.sourceEvent) continue
            if (where?.workerCode && row.workerCode !== where.workerCode) continue
            if (where?.entityType && row.entityType !== where.entityType) continue
            if (where?.entityId && row.entityId !== where.entityId) continue
            if (where?.active === true && row.active !== true) continue
            return row
          }
          return null
        }),
        findMany: vi.fn(async ({ where, take }: { where?: Record<string, unknown>; take?: number }) => {
          let list = [...rows.values()]
          if (where?.workerCode) list = list.filter((r) => r.workerCode === where.workerCode)
          if (where?.active === true) list = list.filter((r) => r.active === true)
          if (where?.importance?.in) {
            const allowed = where.importance.in as string[]
            list = list.filter((r) => allowed.includes(String(r.importance)))
          }
          list.sort(
            (a, b) =>
              new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
          )
          return (take ? list.slice(0, take) : list).map((r) => ({
            ...r,
            createdAt: new Date(String(r.createdAt)),
            updatedAt: new Date(String(r.updatedAt)),
          }))
        }),
        count: vi.fn(async () => rows.size),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          seq += 1
          const now = new Date()
          const row = {
            id: `mem-${seq}`,
            ...data,
            active: data.active ?? true,
            createdAt: now,
            updatedAt: now,
          }
          rows.set(String(row.id), row)
          return row
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = rows.get(where.id)
          if (!row) throw new Error('not found')
          const next = { ...row, ...data, updatedAt: new Date() }
          rows.set(where.id, next)
          return next
        }),
        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          rows.delete(where.id)
        }),
        deleteMany: vi.fn(async () => {
          rows.clear()
        }),
      },
      domainEvent: {
        findMany: vi.fn(async () => []),
      },
      salesOrder: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          customerName: 'Ayşe Yılmaz',
        })),
      },
    },
  }
}

describe('memoryFromDomainEvent', () => {
  it('sipariş ve risk eventlerinden memory üretir', () => {
    const placed = buildMemoriesFromDomainEvent(
      { id: 'e1', type: 'order.placed', aggregateId: 'S-24089' },
      { customerName: 'Ayşe Yılmaz', orderLabel: 'S-24089' },
    )
    expect(placed[0]?.memoryType).toBe('ORDER')

    const risk = buildMemoriesFromDomainEvent(
      {
        id: 'e2',
        type: 'risk.escalated',
        aggregateId: 'S-24089',
        payload: { reason: 'overdue_partial_shipment', signals: ['termin_overdue'] },
      },
      { customerName: 'Ayşe Yılmaz' },
    )
    expect(risk.some((m) => m.content.includes('sevk') || m.content.includes('termin'))).toBe(true)
    expect(risk.some((m) => m.memoryType === 'CUSTOMER')).toBe(true)
  })

  it('demo seed örnek memory içerir', () => {
    const seeds = buildDemoSeedMemories()
    expect(seeds.some((m) => m.content.includes('Ayşe Yılmaz'))).toBe(true)
    expect(seeds.some((m) => m.entityId === 'Nova Home')).toBe(true)
  })
})

describe('MemoryService', () => {
  beforeEach(() => {
    resetMemoryInfrastructureForTests()
  })

  it('memory oluşturma ve okuma', async () => {
    const { prisma } = createMockPrisma()
    const row = await createMemory(prisma as never, {
      workerCode: 'AI_COLLECTION',
      entityType: 'ORDER',
      entityId: 'S-24089',
      memoryType: 'ORDER',
      title: 'Test',
      content: 'S-24089 tahsilat gecikmesi nedeniyle kritik risk oluşturdu.',
      importance: MEMORY_IMPORTANCE.CRITICAL,
      sourceEvent: 'test-1',
    })
    expect(row.id).toMatch(/^mem-/)

    const list = await listMemories(prisma as never, { workerCode: 'AI_COLLECTION' })
    expect(list).toHaveLength(1)
  })

  it('domain event ingestion', async () => {
    const { prisma } = createMockPrisma()
    const created = await ingestMemoryFromDomainEvent(
      prisma as never,
      {
        id: 'dom-1',
        type: 'payment.posted',
        aggregateId: 'S-24102',
        occurredAt: new Date().toISOString(),
      },
      { customerName: 'Mehmet Kaya', orderLabel: 'S-24102' },
    )
    expect(created.length).toBeGreaterThan(0)
    expect(created[0]?.memoryType).toBe('PAYMENT')
  })

  it('worker context metni üretir', async () => {
    const { prisma } = createMockPrisma()
    await createMemory(prisma as never, {
      workerCode: 'AI_SALES_FOLLOW_UP',
      entityType: 'CUSTOMER',
      entityId: 'Ayşe Yılmaz',
      memoryType: 'CUSTOMER',
      title: 'Termin',
      content: 'Ayşe Yılmaz termin gecikmelerinde hassas davranıyor.',
      importance: MEMORY_IMPORTANCE.HIGH,
    })

    const text = await buildWorkerMemoryContextText(prisma as never, {
      workerCode: resolveWorkerCode('dw-sales-follow-up'),
      customerName: 'Ayşe Yılmaz',
    })
    expect(text).toContain('Ayşe Yılmaz')
  })

  it('CEO learned insights kritik kayıtları döner', async () => {
    const { prisma } = createMockPrisma()
    await createMemory(prisma as never, {
      workerCode: 'AI_PROCUREMENT',
      entityType: 'SUPPLIER',
      entityId: 'Vega Mobilya',
      memoryType: 'SUPPLIER',
      title: 'Gecikme',
      content: 'Vega Mobilya tedarik sürecinde tekrar gecikme sinyali gösteriyor.',
      importance: MEMORY_IMPORTANCE.CRITICAL,
    })

    const insights = await buildCeoLearnedInsights(prisma as never, 3)
    expect(insights[0]?.message).toContain('AI Procurement')
    expect(insights[0]?.message).toContain('Vega Mobilya')
  })

  it('assertMemoryInfrastructureReady tablo erişimini doğrular', async () => {
    const { prisma } = createMockPrisma()
    await assertMemoryInfrastructureReady(prisma as never)
    expect(prisma.aIWorkerMemory.findFirst).toHaveBeenCalled()
  })

  it('resetAllMemoriesForTests store temizler', async () => {
    const { prisma } = createMockPrisma()
    await createMemory(prisma as never, {
      workerCode: 'AI_SHIPMENT',
      entityType: 'ORDER',
      entityId: 'S-1',
      memoryType: 'SHIPMENT',
      title: 'Sevk',
      content: 'test',
      importance: MEMORY_IMPORTANCE.NORMAL,
    })
    await resetAllMemoriesForTests(prisma as never)
    expect(await listMemories(prisma as never)).toHaveLength(0)
  })
})
