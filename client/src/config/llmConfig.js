/** @typedef {import('../contracts/v1/ceoCopilot.js').LlmProviderId} LlmProviderId */

/** @returns {LlmProviderId} */
export function getLlmProviderId() {
  const raw =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_LLM_PROVIDER : undefined
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase()
    if (lower === 'openai' || lower === 'gemini') return lower
  }
  return 'mock'
}

export function getOpenAiModel() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_OPENAI_MODEL : undefined
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'gpt-4o-mini'
}

export function getGeminiModel() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GEMINI_MODEL : undefined
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'gemini-1.5-flash'
}

export function isLlmRemoteEnabled() {
  return getLlmProviderId() !== 'mock'
}
