import type {
  LlmCallOptions,
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmProvider,
  LlmStreamChunk,
} from '../../../../contracts/llmDto.js'
import type { AiLlmConfig } from '../../../../config/aiConfig.js'

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
}

/**
 * FAZ 43 — Google Gemini provider adapter.
 */
export class GeminiProvider implements LlmProvider {
  readonly id = 'gemini' as const
  private readonly config: AiLlmConfig

  constructor(config: AiLlmConfig) {
    this.config = config
  }

  private get apiKey(): string {
    const key = this.config.geminiApiKey
    if (!key) throw new Error('GEMINI_API_KEY is not configured')
    return key
  }

  private toGeminiContents(messages: LlmGenerateRequest['messages']) {
    const system = messages.find((m) => m.role === 'system')?.content ?? ''
    const rest = messages.filter((m) => m.role !== 'system')
    return {
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      contents: rest.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    }
  }

  async generate(request: LlmGenerateRequest, options?: LlmCallOptions): Promise<LlmGenerateResponse> {
    const started = Date.now()
    const model = request.model.includes('gemini') ? request.model : 'gemini-2.0-flash'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`

    const { systemInstruction, contents } = this.toGeminiContents(request.messages)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.2,
        maxOutputTokens: request.maxTokens ?? 1200,
        ...(request.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }
    if (systemInstruction) body.systemInstruction = systemInstruction

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: options?.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      const err = new Error(`Gemini API error ${res.status}: ${errText.slice(0, 400)}`) as Error & {
        status?: number
      }
      err.status = res.status
      throw err
    }

    const data = (await res.json()) as GeminiResponse
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    const promptTokens = data.usageMetadata?.promptTokenCount ?? 0
    const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0

    return {
      content: text,
      toolCalls: [],
      model,
      providerId: this.id,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: data.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens,
      },
      latencyMs: Date.now() - started,
    }
  }

  async *stream(
    request: LlmGenerateRequest,
    options?: LlmCallOptions,
  ): AsyncIterable<LlmStreamChunk> {
    const response = await this.generate(request, options)
    const mid = Math.max(1, Math.floor(response.content.length / 2))
    yield { type: 'delta', content: response.content.slice(0, mid) }
    yield { type: 'delta', content: response.content.slice(mid) }
    yield { type: 'done', content: response.content, usage: response.usage }
  }
}
