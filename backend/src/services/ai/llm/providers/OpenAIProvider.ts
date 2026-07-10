import type {
  LlmCallOptions,
  LlmGenerateRequest,
  LlmGenerateResponse,
  LlmProvider,
  LlmStreamChunk,
  LlmToolCall,
} from '../../../../contracts/llmDto.js'
import type { AiLlmConfig } from '../../../../config/aiConfig.js'

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: Array<{
        id: string
        type: string
        function: { name: string; arguments: string }
      }>
    }
    delta?: {
      content?: string | null
      tool_calls?: Array<{
        index?: number
        id?: string
        function?: { name?: string; arguments?: string }
      }>
    }
  }>
  model?: string
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
}

function parseToolCalls(raw: OpenAiChatResponse): LlmToolCall[] {
  const calls = raw.choices?.[0]?.message?.tool_calls ?? []
  return calls.map((c) => {
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(c.function.arguments || '{}') as Record<string, unknown>
    } catch {
      args = {}
    }
    return { id: c.id, name: c.function.name, arguments: args }
  })
}

function buildBody(request: LlmGenerateRequest, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: request.model,
    messages: request.messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    })),
    temperature: request.temperature ?? 0.2,
    max_tokens: request.maxTokens ?? 1200,
    stream,
  }

  if (request.tools?.length) {
    body.tools = request.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
  }

  if (request.jsonMode && !stream) {
    body.response_format = { type: 'json_object' }
  }

  return body
}

/**
 * FAZ 43 — OpenAI provider adapter.
 */
export class OpenAIProvider implements LlmProvider {
  readonly id = 'openai' as const
  private readonly config: AiLlmConfig

  constructor(config: AiLlmConfig) {
    this.config = config
  }

  private get apiKey(): string {
    const key = this.config.openaiApiKey
    if (!key) throw new Error('OPENAI_API_KEY is not configured')
    return key
  }

  async generate(request: LlmGenerateRequest, options?: LlmCallOptions): Promise<LlmGenerateResponse> {
    const started = Date.now()
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildBody(request, false)),
      signal: options?.signal,
    })

    if (!res.ok) {
      const errText = await res.text()
      const err = new Error(`OpenAI API error ${res.status}: ${errText.slice(0, 400)}`) as Error & {
        status?: number
      }
      err.status = res.status
      throw err
    }

    const data = (await res.json()) as OpenAiChatResponse
    const promptTokens = data.usage?.prompt_tokens ?? 0
    const completionTokens = data.usage?.completion_tokens ?? 0

    return {
      content: data.choices?.[0]?.message?.content ?? '',
      toolCalls: parseToolCalls(data),
      model: data.model ?? request.model,
      providerId: this.id,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: data.usage?.total_tokens ?? promptTokens + completionTokens,
      },
      latencyMs: Date.now() - started,
    }
  }

  async *stream(
    request: LlmGenerateRequest,
    options?: LlmCallOptions,
  ): AsyncIterable<LlmStreamChunk> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildBody(request, true)),
      signal: options?.signal,
    })

    if (!res.ok || !res.body) {
      yield { type: 'error', error: `OpenAI stream error ${res.status}` }
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          yield { type: 'done' }
          return
        }
        try {
          const parsed = JSON.parse(payload) as OpenAiChatResponse
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) yield { type: 'delta', content: delta }
        } catch {
          /* ignore partial SSE */
        }
      }
    }

    yield { type: 'done' }
  }
}
