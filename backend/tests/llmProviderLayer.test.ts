import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LlmProvider } from '../src/contracts/llmDto.js'
import { resetAiLlmConfigForTests } from '../src/config/aiConfig.js'
import { MockProvider } from '../src/services/ai/llm/providers/MockProvider.js'
import {
  getProvider,
  initProviderFactory,
  registerProvider,
  resetProviderFactoryForTests,
} from '../src/services/ai/llm/ProviderFactory.js'
import {
  LLMService,
  getLlmUsageLog,
  resetLLMServiceForTests,
} from '../src/services/ai/LLMService.js'
import { buildWorkerPrompt } from '../src/services/ai/prompt/PromptBuilder.js'
import { resetAiWorkerRuntime, runAiWorkerTask } from '../src/services/ai/AiWorkerService.js'
import { resetErpMemoryStore } from '../src/services/ai/memory/ErpMemoryStore.js'

describe('ProviderFactory', () => {
  beforeEach(() => {
    resetProviderFactoryForTests()
    resetAiLlmConfigForTests()
    process.env.AI_LLM_PROVIDER = 'mock'
  })

  it('mock provider kayıtlı', () => {
    initProviderFactory()
    const p = getProvider('mock')
    expect(p.id).toBe('mock')
  })

  it('openai ve gemini provider kayıtlı', () => {
    initProviderFactory()
    expect(getProvider('openai').id).toBe('openai')
    expect(getProvider('gemini').id).toBe('gemini')
  })
})

describe('LLMService.generate', () => {
  beforeEach(() => {
    resetProviderFactoryForTests()
    resetLLMServiceForTests()
    resetAiLlmConfigForTests()
    process.env.AI_LLM_PROVIDER = 'mock'
    process.env.AI_LLM_COST_TRACKING = 'true'
    initProviderFactory()
  })

  it('provider.generate() çağrılır ve usage döner', async () => {
    const service = new LLMService(getProvider('mock'))
    const res = await service.generate(
      {
        model: 'mock-model',
        messages: [{ role: 'user', content: 'test S-24089' }],
        jsonMode: true,
      },
      { runId: 'run-1', workerId: 'dw-sales-follow-up' },
    )
    expect(res.providerId).toBe('mock')
    expect(res.usage.totalTokens).toBeGreaterThan(0)
    expect(res.costUsd).toBe(0)
  })

  it('streaming mock provider chunk üretir', async () => {
    const service = new LLMService(getProvider('mock'))
    const chunks = []
    for await (const c of service.streamGenerate({
      model: 'mock-model',
      messages: [{ role: 'user', content: 'stream test' }],
    })) {
      chunks.push(c)
    }
    expect(chunks.some((c) => c.type === 'delta')).toBe(true)
    expect(chunks.some((c) => c.type === 'done')).toBe(true)
  })

  it('cost tracking usage log yazar', async () => {
    const service = new LLMService(getProvider('mock'))
    await service.generate(
      { model: 'mock-model', messages: [{ role: 'user', content: 'cost' }] },
      { runId: 'run-cost', workerId: 'dw-collection' },
    )
    expect(getLlmUsageLog().some((u) => u.runId === 'run-cost')).toBe(true)
  })

  it('retry başarısız non-retryable hatada durur', async () => {
    const failing: LlmProvider = {
      id: 'mock',
      generate: vi.fn().mockRejectedValue(Object.assign(new Error('bad request'), { status: 400 })),
    }
    registerProvider(failing)
    const service = new LLMService(failing)
    await expect(
      service.generate({ model: 'm', messages: [{ role: 'user', content: 'x' }] }, { maxRetries: 2 }),
    ).rejects.toThrow('bad request')
    expect(failing.generate).toHaveBeenCalledTimes(1)
  })
})

describe('PromptBuilder', () => {
  it('context memory tools baseline birleştirir', async () => {
    const prisma = {
      salesOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'S-1',
          customerName: 'Test',
          customerPhone: '0532',
          productSummary: 'Koltuk',
          displayStatus: 'Aktif',
          totalAmount: { toString: () => '1000' },
          paidAmount: { toString: () => '500' },
          remainingAmount: { toString: () => '500' },
          dueDate: null,
          lines: [],
          payments: [],
          missingItems: [],
        }),
      },
      domainEvent: { findMany: vi.fn().mockResolvedValue([]) },
    }

    const built = await buildWorkerPrompt(prisma as never, {
      workerId: 'dw-sales-follow-up',
      orderId: 'S-1',
      memoryContext: 'memory line',
      businessSnapshot: { stage: 'sales' },
    })

    expect(built.messages).toHaveLength(2)
    expect(built.messages[1]?.content).toContain('memory line')
    expect(built.messages[1]?.content).toContain('LLM Tools')
    expect(built.tools.length).toBeGreaterThan(0)
  })
})

describe('executeWorker integration', () => {
  beforeEach(() => {
    resetAiWorkerRuntime()
    resetErpMemoryStore()
    resetProviderFactoryForTests()
    resetAiLlmConfigForTests()
    process.env.AI_WORKER_ENABLED = 'true'
    process.env.AI_LLM_PROVIDER = 'mock'
    process.env.AI_WORKER_MODEL = 'mock-model'
    initProviderFactory()
  })

  it('runAiWorkerTask mock provider ile assessment döner', async () => {
    const prisma = {
      salesOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'S-TEST-001',
          customerName: 'Test',
          customerPhone: '0532',
          productSummary: 'Koltuk',
          displayStatus: 'Bekleniyor',
          totalAmount: { toString: () => '10000' },
          paidAmount: { toString: () => '3000' },
          remainingAmount: { toString: () => '7000' },
          dueDate: null,
          lines: [],
          payments: [],
          missingItems: [],
        }),
      },
      domainEvent: { findMany: vi.fn().mockResolvedValue([]) },
      aIWorkerMemory: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'mem-1',
          ...data,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      },
    }

    const res = await runAiWorkerTask(prisma as never, {
      workerId: 'dw-sales-follow-up',
      orderId: 'S-TEST-001',
      ruleBaseline: {
        orderId: 'S-TEST-001',
        customerName: 'Test',
        phone: '0532',
        priority: 'HIGH',
        score: 70,
        reasons: ['rule'],
        taskTitle: 'Rule title',
        taskDescription: 'Rule desc',
        eligible: true,
      },
    })

    expect(res.providerId).toBe('mock')
    expect(res.usage?.totalTokens).toBeGreaterThan(0)
    expect(res.assessment.taskTitle).toBeTruthy()
  })
})
