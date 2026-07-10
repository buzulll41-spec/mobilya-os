import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  approveExecution,
  buildExecutionSummary,
  executeTool,
  listExecutions,
  listRegisteredTools,
  rejectExecution,
  resetToolEngineForTests,
} from '../src/services/ai/tools/ToolEngine.js'
import { TOOL_EXECUTION_STATUS } from '../src/contracts/aiToolDto.js'

function createMockPrisma() {
  /** @type {Map<string, Record<string, unknown>>} */
  const rows = new Map()
  let seq = 0

  return {
    rows,
    prisma: {
      aIToolExecution: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null),
        findMany: vi.fn(async ({ where, take }: { where?: Record<string, unknown>; take?: number }) => {
          let list = [...rows.values()]
          if (where?.workerId) list = list.filter((r) => r.workerId === where.workerId)
          if (where?.status) list = list.filter((r) => r.status === where.status)
          if (where?.createdAt) {
            const gte = (where.createdAt as { gte: Date }).gte
            const lte = (where.createdAt as { lte: Date }).lte
            list = list.filter((r) => {
              const t = new Date(String(r.createdAt)).getTime()
              return t >= gte.getTime() && t <= lte.getTime()
            })
          }
          list.sort(
            (a, b) =>
              new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
          )
          return (take ? list.slice(0, take) : list).map((r) => ({
            ...r,
            createdAt: new Date(String(r.createdAt)),
            updatedAt: new Date(String(r.updatedAt)),
            approvedAt: r.approvedAt ? new Date(String(r.approvedAt)) : null,
            rejectedAt: r.rejectedAt ? new Date(String(r.rejectedAt)) : null,
          }))
        }),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          seq += 1
          const now = new Date()
          const row = { id: `exec-${seq}`, ...data, createdAt: now, updatedAt: now }
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
        deleteMany: vi.fn(async () => rows.clear()),
      },
      domainEvent: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: `dom-${Date.now()}`,
          ...data,
        })),
      },
      salesOrder: {
        findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
          id: where.id,
          customerName: 'Ayşe Yılmaz',
          displayStatus: 'Üretimde',
          totalAmount: { toString: () => '100000' },
          paidAmount: { toString: () => '30000' },
          remainingAmount: { toString: () => '70000' },
          dueDate: null,
        })),
      },
    },
  }
}

describe('ToolEngine registry', () => {
  beforeEach(() => {
    resetToolEngineForTests()
    delete process.env.AI_TOOL_EXECUTION_ENABLED
  })

  it('listRegisteredTools worker bazlı filtreler', () => {
    const salesTools = listRegisteredTools('dw-sales-follow-up')
    expect(salesTools.some((t) => t.name === 'getOrder')).toBe(true)
    expect(salesTools.some((t) => t.name === 'getCustomerBalance')).toBe(false)
  })
})

describe('ToolEngine execution', () => {
  beforeEach(() => {
    resetToolEngineForTests()
    delete process.env.AI_TOOL_EXECUTION_ENABLED
  })

  it('getOrder safe mode SUCCESS döner', async () => {
    const { prisma } = createMockPrisma()
    const res = await executeTool(prisma as never, {
      workerId: 'dw-sales-follow-up',
      toolName: 'getOrder',
      parameters: { orderId: 'S-24089' },
      orderId: 'S-24089',
    })
    expect(res.status).toBe(TOOL_EXECUTION_STATUS.SUCCESS)
    expect(res.safeMode).toBe(true)
    expect(res.result?.simulated).toBe(true)
  })

  it('changeDeliveryDate WAITING_APPROVAL üretir', async () => {
    const { prisma } = createMockPrisma()
    const res = await executeTool(prisma as never, {
      workerId: 'dw-sales-follow-up',
      toolName: 'changeDeliveryDate',
      parameters: { orderId: 'S-24089', newDate: '2026-05-20', reason: 'Test' },
    })
    expect(res.status).toBe(TOOL_EXECUTION_STATUS.WAITING_APPROVAL)
  })

  it('permission DENIED döner', async () => {
    const { prisma } = createMockPrisma()
    const res = await executeTool(prisma as never, {
      workerId: 'dw-collection',
      toolName: 'getOrder',
      parameters: { orderId: 'S-24089' },
    })
    expect(res.status).toBe(TOOL_EXECUTION_STATUS.DENIED)
  })

  it('NOT_FOUND bilinmeyen tool', async () => {
    const { prisma } = createMockPrisma()
    const res = await executeTool(prisma as never, {
      workerId: 'dw-sales-follow-up',
      toolName: 'unknownTool',
      parameters: {},
    })
    expect(res.status).toBe(TOOL_EXECUTION_STATUS.NOT_FOUND)
  })

  it('approve execution SUCCESS yapar', async () => {
    const { prisma, rows } = createMockPrisma()
    const pending = await executeTool(prisma as never, {
      workerId: 'dw-sales-follow-up',
      toolName: 'changeDeliveryDate',
      parameters: { orderId: 'S-24089', newDate: '2026-05-20', reason: 'Test' },
    })
    const approved = await approveExecution(prisma as never, pending.id, 'Murat Tekin', 'OK')
    expect(approved?.status).toBe(TOOL_EXECUTION_STATUS.SUCCESS)
    expect(rows.get(pending.id)?.managerName).toBe('Murat Tekin')
  })

  it('reject execution FAILED yapar', async () => {
    const { prisma } = createMockPrisma()
    const pending = await executeTool(prisma as never, {
      workerId: 'dw-collection',
      toolName: 'closeCollectionTask',
      parameters: { orderId: 'S-24089', resolution: 'Kapandı' },
    })
    const rejected = await rejectExecution(prisma as never, pending.id, 'Murat Tekin', 'Red')
    expect(rejected?.status).toBe(TOOL_EXECUTION_STATUS.FAILED)
    expect(rejected?.rejectedAt).toBeTruthy()
  })

  it('audit domain event yazar', async () => {
    const { prisma } = createMockPrisma()
    await executeTool(prisma as never, {
      workerId: 'dw-sales-follow-up',
      toolName: 'getOrder',
      parameters: { orderId: 'S-24089' },
    })
    expect(prisma.domainEvent.create).toHaveBeenCalled()
  })

  it('listExecutions ve summary', async () => {
    const { prisma } = createMockPrisma()
    await executeTool(prisma as never, {
      workerId: 'dw-sales-follow-up',
      toolName: 'getOrder',
      parameters: { orderId: 'S-24089' },
    })
    const list = await listExecutions(prisma as never, { workerId: 'dw-sales-follow-up' })
    expect(list.length).toBe(1)
    const summary = await buildExecutionSummary(prisma as never, new Date().toISOString().slice(0, 10))
    expect(summary.today).toBeGreaterThan(0)
  })
})
