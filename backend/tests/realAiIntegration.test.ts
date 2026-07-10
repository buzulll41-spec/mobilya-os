import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LlmProvider } from '../src/contracts/llmDto.js'

import { resetErpMemoryStore } from '../src/services/ai/memory/ErpMemoryStore.js'

import {

  getPromptTemplate,

  listAllWorkerPromptVersions,

  renderPrompt,

} from '../src/services/ai/prompt/PromptEngine.js'

import { formatBaselineForPrompt } from '../src/services/ai/context/ContextBuilder.js'

import { getToolsForWorker } from '../src/services/ai/tools/ToolRegistry.js'

import {

  getAiWorkerConfig,

  resetAiWorkerRuntime,

  runAiWorkerTask,

} from '../src/services/ai/AiWorkerService.js'

import {

  initProviderFactory,

  registerProvider,

  resetProviderFactoryForTests,

} from '../src/services/ai/llm/ProviderFactory.js'

import { MockProvider } from '../src/services/ai/llm/providers/MockProvider.js'

import { resetAiLlmConfigForTests } from '../src/config/aiConfig.js'



describe('PromptEngine versioned prompts', () => {

  it('4 worker için v1 prompt üretir', () => {

    const workers = [

      'dw-sales-follow-up',

      'dw-collection',

      'dw-shipment',

      'dw-procurement',

    ]

    for (const w of workers) {

      const t = getPromptTemplate(w, 'v1')

      expect(t.version).toBe('v1')

      const rendered = renderPrompt(t, {

        context: 'ctx',

        memory: 'mem',

        baseline: 'base',

      })

      expect(rendered.system).toContain('MOBILYA OS')

      expect(rendered.user).toContain('ctx')

    }

    expect(Object.keys(listAllWorkerPromptVersions())).toHaveLength(4)

  })

})



describe('ToolRegistry worker tools', () => {

  it('her worker kendi tool setine sahip', () => {

    expect(getToolsForWorker('dw-sales-follow-up')[0]?.name).toBe('log_sales_follow_up')

    expect(getToolsForWorker('dw-collection')[0]?.name).toBe('create_collection_reminder')

    expect(getToolsForWorker('dw-shipment')[0]?.name).toBe('plan_shipment_action')

    expect(getToolsForWorker('dw-procurement')[0]?.name).toBe('create_procurement_task')

  })

})



describe('AiWorkerService with mock LLM', () => {

  beforeEach(() => {

    resetAiWorkerRuntime()

    resetErpMemoryStore()

    resetProviderFactoryForTests()

    resetAiLlmConfigForTests()

    registerProvider(new MockProvider())

    initProviderFactory()

    process.env.AI_WORKER_ENABLED = 'true'

    process.env.AI_LLM_PROVIDER = 'mock'

    process.env.AI_WORKER_MODEL = 'mock-model'

  })



  it('config endpoint verisi üretir', () => {

    const cfg = getAiWorkerConfig()

    expect(cfg.workers).toContain('dw-sales-follow-up')

    expect(cfg.promptVersions['dw-collection']).toBe('v1')

    expect(cfg.providerId).toBe('mock')

    expect(typeof cfg.temperature).toBe('number')

  })



  it('runAiWorkerTask mock LLM assessment döner', async () => {

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

      domainEvent: {

        findMany: vi.fn().mockResolvedValue([]),

      },

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



    expect(res.assessment.taskTitle).toContain('Mock')

    expect(res.providerId).toBe('mock')

    expect(res.promptVersion).toBe('v1')

    expect(res.runId).toMatch(/^airun-/)

  })



  it('formatBaselineForPrompt JSON üretir', () => {

    const text = formatBaselineForPrompt({

      orderId: 'S-1',

      customerName: 'A',

      phone: '',

      priority: 'HIGH',

      score: 1,

      reasons: [],

      taskTitle: 't',

      taskDescription: 'd',

      eligible: true,

    })

    expect(text).toContain('S-1')

  })

})


