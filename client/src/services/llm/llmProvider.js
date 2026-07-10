import { getApiBaseUrl } from '../../config/dataSource.js'
import { getGeminiModel, getLlmProviderId, getOpenAiModel } from '../../config/llmConfig.js'

/**
 * @typedef {Object} LlmMessage
 * @property {'system' | 'user' | 'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {Object} LlmCompletionResult
 * @property {string} content
 * @property {string} providerId
 * @property {string} model
 * @property {number} [latencyMs]
 * @property {{ totalTokens?: number }} [usage]
 */

/**
 * @param {LlmMessage[]} messages
 * @param {{ fallback?: string }} [options]
 * @returns {Promise<LlmCompletionResult>}
 */
export async function completeLlmChat(messages, options = {}) {
  const providerId = getLlmProviderId()
  const started = Date.now()

  if (providerId === 'mock') {
    return {
      content: options.fallback ?? 'Mock LLM yanıtı.',
      providerId: 'mock',
      model: 'mock-copilot-v1',
      latencyMs: Date.now() - started,
    }
  }

  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/ai/ceo/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, providerId }),
      })
      if (res.ok) {
        const body = await res.json()
        if (body?.content) {
          return {
            content: String(body.content),
            providerId: String(body.providerId ?? providerId),
            model: String(body.model ?? getModelForProvider(providerId)),
            latencyMs: Date.now() - started,
            usage: body.usage,
          }
        }
      }
    } catch {
      /* fall through to mock fallback */
    }
  }

  return {
    content: options.fallback ?? 'LLM kullanılamıyor — mock yanıt.',
    providerId: 'mock',
    model: 'mock-fallback',
    latencyMs: Date.now() - started,
  }
}

/** @param {import('../../contracts/v1/ceoCopilot.js').LlmProviderId} providerId */
function getModelForProvider(providerId) {
  if (providerId === 'openai') return getOpenAiModel()
  if (providerId === 'gemini') return getGeminiModel()
  return 'mock'
}

export function getActiveLlmProviderLabel() {
  const id = getLlmProviderId()
  if (id === 'openai') return `OpenAI · ${getOpenAiModel()}`
  if (id === 'gemini') return `Gemini · ${getGeminiModel()}`
  return 'Mock Copilot'
}
