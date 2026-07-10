/**
 * FAZ 43 — Centralized AI / LLM configuration.
 */

import type { LlmProviderId } from '../contracts/llmDto.js'

export type AiLlmConfig = {
  workersEnabled: boolean
  providerId: LlmProviderId
  model: string
  temperature: number
  maxTokens: number
  timeoutMs: number
  maxRetries: number
  streamingEnabled: boolean
  costTrackingEnabled: boolean
  openaiApiKey: string | null
  geminiApiKey: string | null
}

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function parseFloatEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

let cached: AiLlmConfig | null = null

export function loadAiLlmConfig(): AiLlmConfig {
  if (cached) return cached

  const providerId = (process.env.AI_LLM_PROVIDER ?? 'mock') as LlmProviderId

  cached = {
    workersEnabled: process.env.AI_WORKER_ENABLED === 'true',
    providerId,
    model: process.env.AI_WORKER_MODEL ?? 'gpt-4o-mini',
    temperature: parseFloatEnv('AI_LLM_TEMPERATURE', 0.2),
    maxTokens: parseIntEnv('AI_LLM_MAX_TOKENS', 1200),
    timeoutMs: parseIntEnv('AI_LLM_TIMEOUT_MS', 30_000),
    maxRetries: parseIntEnv('AI_LLM_MAX_RETRIES', 2),
    streamingEnabled: process.env.AI_LLM_STREAM_ENABLED !== 'false',
    costTrackingEnabled: process.env.AI_LLM_COST_TRACKING !== 'false',
    openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  }

  return cached
}

export function resetAiLlmConfigForTests(): void {
  cached = null
}

export function isAiWorkerEnabled(): boolean {
  return loadAiLlmConfig().workersEnabled
}

export function resolveAiModel(): string {
  return loadAiLlmConfig().model
}

/** USD per 1M tokens — simplified pricing table */
export const MODEL_COST_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'mock-model': { input: 0, output: 0 },
}

export function estimateTokenCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = MODEL_COST_PER_1M[model] ?? MODEL_COST_PER_1M['gpt-4o-mini']
  return (promptTokens / 1_000_000) * rates.input + (completionTokens / 1_000_000) * rates.output
}
