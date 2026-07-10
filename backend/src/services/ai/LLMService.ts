import type { PrismaClient } from '@prisma/client'
import type {
  AiWorkerRunRequest,
  AiWorkerRunResponse,
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmStreamChunk,
  LlmUsageRecord,
} from '../../contracts/llmDto.js'
import {
  estimateTokenCostUsd,
  isAiWorkerEnabled,
  loadAiLlmConfig,
  resolveAiModel,
} from '../../config/aiConfig.js'
import { appendErpMemory, summarizeErpMemory } from './memory/ErpMemoryStore.js'
import {
  assertMemoryInfrastructureReady,
  buildWorkerMemoryContextText,
} from '../memory/MemoryService.js'
import { resolveWorkerCode } from '../memory/memoryFromDomainEvent.js'
import { buildWorkerPrompt, parseWorkerAssessment } from './prompt/PromptBuilder.js'
import { executeToolCalls } from './tools/ToolRegistry.js'
import { resolveActiveProvider } from './llm/ProviderFactory.js'
import type { LlmCallOptions, LlmProvider } from '../../contracts/llmDto.js'

const usageLog: LlmUsageRecord[] = []

function isRetryableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  if (status === 429 || status === 502 || status === 503 || status === 504) return true
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('timeout') || msg.includes('ECONNRESET')
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw new Error('Aborted')
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`LLM timeout after ${timeoutMs}ms`)), timeoutMs)
    promise
      .then((v) => {
        clearTimeout(timer)
        resolve(v)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}

function recordUsage(entry: LlmUsageRecord): void {
  usageLog.unshift(entry)
  if (usageLog.length > 500) usageLog.pop()
}

export function getLlmUsageLog(): LlmUsageRecord[] {
  return usageLog.slice()
}

export function resetLlmUsageLogForTests(): void {
  usageLog.length = 0
}

export class LLMService {
  constructor(private readonly provider: LlmProvider = resolveActiveProvider()) {}

  async generate(
    request: LlmGenerateRequest,
    options: LlmCallOptions = {},
  ): Promise<LlmGenerateResponse> {
    const config = loadAiLlmConfig()
    const timeoutMs = options.timeoutMs ?? config.timeoutMs
    const maxRetries = options.maxRetries ?? config.maxRetries
    const merged: LlmGenerateRequest = {
      ...request,
      model: request.model ?? config.model,
      temperature: request.temperature ?? config.temperature,
      maxTokens: request.maxTokens ?? config.maxTokens,
    }

    let lastError: unknown
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const started = Date.now()
        const response = await withTimeout(
          this.provider.generate(merged, { ...options, signal: controller.signal }),
          timeoutMs + 100,
          controller.signal,
        )
        clearTimeout(timer)

        const costUsd = config.costTrackingEnabled
          ? estimateTokenCostUsd(response.model, response.usage.promptTokens, response.usage.completionTokens)
          : 0

        const enriched: LlmGenerateResponse = {
          ...response,
          costUsd,
          latencyMs: Date.now() - started,
          attemptCount: attempt,
        }

        if (config.costTrackingEnabled && options.runId && options.workerId) {
          recordUsage({
            runId: options.runId,
            workerId: options.workerId,
            providerId: response.providerId,
            model: response.model,
            usage: enriched.usage,
            costUsd,
            latencyMs: enriched.latencyMs ?? 0,
            createdAt: new Date().toISOString(),
          })
        }

        return enriched
      } catch (err) {
        clearTimeout(timer)
        lastError = err
        if (attempt > maxRetries || !isRetryableError(err)) break
        await new Promise((r) => setTimeout(r, 250 * attempt))
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError))
  }

  async *streamGenerate(
    request: LlmGenerateRequest,
    options: LlmCallOptions = {},
  ): AsyncIterable<LlmStreamChunk> {
    const config = loadAiLlmConfig()
    if (!config.streamingEnabled) {
      const full = await this.generate(request, options)
      yield { type: 'delta', content: full.content }
      yield { type: 'done', content: full.content, usage: full.usage }
      return
    }

    if (!this.provider.stream) {
      const full = await this.generate(request, options)
      yield { type: 'delta', content: full.content }
      yield { type: 'done', content: full.content, usage: full.usage }
      return
    }

    for await (const chunk of this.provider.stream(request, options)) {
      yield chunk
    }
  }

  async executeWorker(
    prisma: PrismaClient,
    req: AiWorkerRunRequest,
  ): Promise<AiWorkerRunResponse> {
    const runId = `airun-${req.workerId}-${req.orderId}-${Date.now()}`
    const config = loadAiLlmConfig()

    if (isAiWorkerEnabled()) {
      await assertMemoryInfrastructureReady(prisma)
    }

    const orderCtx = req.orderContext as Record<string, unknown> | undefined
    const fallback = parseWorkerAssessment('{}', req)

    const memoryContext = isAiWorkerEnabled()
      ? await buildWorkerMemoryContextText(prisma, {
          workerCode: resolveWorkerCode(req.workerId),
          orderId: req.orderId,
          customerName:
            typeof orderCtx?.customer === 'string'
              ? orderCtx.customer
              : typeof fallback.customerName === 'string'
                ? fallback.customerName
                : undefined,
        })
      : summarizeErpMemory(req.workerId, req.orderId)

    if (!isAiWorkerEnabled()) {
      return {
        runId,
        workerId: req.workerId,
        assessment: fallback,
        providerId: config.providerId,
        model: resolveAiModel(),
        promptVersion: 'v1',
        toolCalls: [],
        toolResults: [],
        memorySummary: memoryContext,
      }
    }

    const prompt = await buildWorkerPrompt(prisma, {
      ...req,
      memoryContext,
    })

    const completion = await this.generate(
      {
        model: config.model,
        messages: prompt.messages,
        tools: req.executeTools ? prompt.tools : undefined,
        jsonMode: true,
      },
      { runId, workerId: req.workerId },
    )

    const assessment = parseWorkerAssessment(completion.content, req)

    let toolResults: AiWorkerRunResponse['toolResults'] = []
    if (req.executeTools && completion.toolCalls.length) {
      toolResults = await executeToolCalls(
        { prisma, workerId: req.workerId, orderId: req.orderId, runId },
        completion.toolCalls.map((c) => ({ name: c.name, arguments: c.arguments })),
      )
    }

    appendErpMemory({
      workerId: req.workerId,
      orderId: req.orderId,
      runId,
      summary: assessment.taskTitle,
      assessment: {
        priority: assessment.priority,
        taskTitle: assessment.taskTitle,
        recommendedAction: assessment.recommendedAction,
      },
    })

    return {
      runId,
      workerId: req.workerId,
      assessment,
      providerId: completion.providerId,
      model: completion.model,
      promptVersion: prompt.promptVersion,
      toolCalls: completion.toolCalls,
      toolResults,
      memorySummary: memoryContext,
      usage: completion.usage,
      costUsd: completion.costUsd,
      latencyMs: completion.latencyMs,
    }
  }
}

let defaultService: LLMService | null = null

export function getLLMService(): LLMService {
  if (!defaultService) {
    defaultService = new LLMService()
  }
  return defaultService
}

export function resetLLMServiceForTests(): void {
  defaultService = null
  resetLlmUsageLogForTests()
}

export async function executeWorker(
  prisma: PrismaClient,
  req: AiWorkerRunRequest,
): Promise<AiWorkerRunResponse> {
  return getLLMService().executeWorker(prisma, req)
}
