import type {
  LlmCallOptions,
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmProvider,
  LlmStreamChunk,
  LlmToolCall,
} from '../../../../contracts/llmDto.js'

export type MockProviderOptions = {
  content?: string
  toolCalls?: LlmToolCall[]
  model?: string
  streamChunks?: string[]
}

const DEFAULT_ASSESSMENT = {
  orderId: 'S-MOCK-001',
  customerName: 'Mock Müşteri',
  phone: '05320000000',
  priority: 'HIGH',
  score: 75,
  reasons: ['Mock provider assessment'],
  taskTitle: 'Mock görev — müşteri ile iletişim kur',
  taskDescription: 'Mock provider açıklaması',
  eligible: true,
  recommendedAction: 'Mock aksiyon',
  confidence: 0.85,
}

/**
 * FAZ 43 — Mock LLM provider (tests + offline demo).
 */
export class MockProvider implements LlmProvider {
  readonly id = 'mock' as const
  private readonly options: MockProviderOptions

  constructor(options: MockProviderOptions = {}) {
    this.options = options
  }

  async generate(request: LlmGenerateRequest, _options?: LlmCallOptions): Promise<LlmGenerateResponse> {
    const content =
      this.options.content ??
      JSON.stringify({
        ...DEFAULT_ASSESSMENT,
        orderId: request.messages.find((m: { content: string }) => m.content.includes('S-'))?.content.match(/S-\d+/)?.[0] ??
          DEFAULT_ASSESSMENT.orderId,
      })

    const promptTokens = request.messages.reduce((s: number, m: { content: string }) => s + Math.ceil(m.content.length / 4), 0)
    const completionTokens = Math.ceil(content.length / 4)

    return {
      content,
      toolCalls: this.options.toolCalls ?? [],
      model: this.options.model ?? request.model ?? 'mock-model',
      providerId: this.id,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      costUsd: 0,
      latencyMs: 5,
      attemptCount: 1,
    }
  }

  async *stream(
    request: LlmGenerateRequest,
    _options?: LlmCallOptions,
  ): AsyncIterable<LlmStreamChunk> {
    const full =
      this.options.content ??
      JSON.stringify(DEFAULT_ASSESSMENT)
    const chunks = this.options.streamChunks ?? [full.slice(0, 20), full.slice(20)]

    for (const part of chunks) {
      yield { type: 'delta', content: part }
    }

    const promptTokens = request.messages.reduce((s: number, m: { content: string }) => s + Math.ceil(m.content.length / 4), 0)
    yield {
      type: 'done',
      content: full,
      usage: {
        promptTokens,
        completionTokens: Math.ceil(full.length / 4),
        totalTokens: promptTokens + Math.ceil(full.length / 4),
      },
    }
  }
}
