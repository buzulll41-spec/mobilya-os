/**
 * FAZ 43 — Provider-agnostic LLM contracts (extended).
 */

export type LlmRole = 'system' | 'user' | 'assistant' | 'tool'

export type LlmMessage = {
  role: LlmRole
  content: string
  name?: string
  toolCallId?: string
}

export type LlmToolParameterSchema = {
  type: 'object'
  properties: Record<string, { type: string; description?: string; enum?: string[] }>
  required?: string[]
}

export type LlmToolDefinition = {
  name: string
  description: string
  parameters: LlmToolParameterSchema
}

export type LlmToolCall = {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export type LlmGenerateRequest = {
  model: string
  messages: LlmMessage[]
  tools?: LlmToolDefinition[]
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

/** @deprecated use LlmGenerateRequest */
export type LlmCompletionRequest = LlmGenerateRequest

export type LlmUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type LlmGenerateResponse = {
  content: string
  toolCalls: LlmToolCall[]
  model: string
  providerId: LlmProviderId
  usage: LlmUsage
  costUsd?: number
  latencyMs?: number
  attemptCount?: number
}

/** @deprecated use LlmGenerateResponse */
export type LlmCompletionResponse = LlmGenerateResponse

export type LlmStreamChunk = {
  type: 'delta' | 'tool_call' | 'done' | 'error'
  content?: string
  toolCall?: Partial<LlmToolCall>
  usage?: LlmUsage
  error?: string
}

export type LlmCallOptions = {
  timeoutMs?: number
  maxRetries?: number
  signal?: AbortSignal
  runId?: string
  workerId?: string
}

export type LlmProviderId = 'mock' | 'openai' | 'gemini' | 'anthropic' | 'local'

/** FAZ 43 — Provider interface */
export interface LlmProvider {
  readonly id: LlmProviderId
  generate(request: LlmGenerateRequest, options?: LlmCallOptions): Promise<LlmGenerateResponse>
  stream?(
    request: LlmGenerateRequest,
    options?: LlmCallOptions,
  ): AsyncIterable<LlmStreamChunk>
}

export type AiWorkerAssessment = {
  orderId: string
  customerName: string
  phone: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  score: number
  reasons: string[]
  taskTitle: string
  taskDescription: string
  eligible: boolean
  recommendedAction?: string
  confidence?: number
}

export type AiWorkerRunRequest = {
  workerId: string
  orderId: string
  taskId?: string
  taskTitle?: string
  businessSnapshot?: Record<string, unknown>
  orderContext?: Record<string, unknown>
  ruleBaseline?: AiWorkerAssessment
  executeTools?: boolean
}

export type AiWorkerRunResponse = {
  runId: string
  workerId: string
  assessment: AiWorkerAssessment
  providerId: LlmProviderId
  model: string
  promptVersion: string
  toolCalls: LlmToolCall[]
  toolResults: AiToolResult[]
  memorySummary?: string
  usage?: LlmUsage
  costUsd?: number
  latencyMs?: number
}

export type AiToolResult = {
  toolName: string
  success: boolean
  output?: unknown
  error?: string
}

export type AiWorkerConfigResponse = {
  enabled: boolean
  providerId: LlmProviderId
  model: string
  temperature: number
  maxTokens: number
  streamingEnabled: boolean
  costTrackingEnabled: boolean
  workers: string[]
  promptVersions: Record<string, string>
}

export type LlmUsageRecord = {
  runId: string
  workerId: string
  providerId: LlmProviderId
  model: string
  usage: LlmUsage
  costUsd: number
  latencyMs: number
  createdAt: string
}
