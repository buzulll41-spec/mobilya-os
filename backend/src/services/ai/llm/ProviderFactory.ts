import type { LlmProvider, LlmProviderId } from '../../../contracts/llmDto.js'
import { loadAiLlmConfig, resetAiLlmConfigForTests, type AiLlmConfig } from '../../../config/aiConfig.js'
import { GeminiProvider } from './providers/GeminiProvider.js'
import { MockProvider } from './providers/MockProvider.js'
import { OpenAIProvider } from './providers/OpenAIProvider.js'

const registry = new Map<LlmProviderId, LlmProvider>()
let initialized = false

function registerBuiltInProviders(config: AiLlmConfig): void {
  if (!registry.has('mock')) {
    registry.set('mock', new MockProvider())
  }
  if (!registry.has('openai')) {
    registry.set('openai', new OpenAIProvider(config))
  }
  if (!registry.has('gemini')) {
    registry.set('gemini', new GeminiProvider(config))
  }
}

export function initProviderFactory(): void {
  const config = loadAiLlmConfig()
  registerBuiltInProviders(config)
  initialized = true
}

export function registerProvider(provider: LlmProvider): void {
  registry.set(provider.id, provider)
}

export function resetProviderFactoryForTests(): void {
  registry.clear()
  initialized = false
  resetAiLlmConfigForTests()
}

export function getProvider(id: LlmProviderId): LlmProvider {
  if (!initialized) initProviderFactory()
  const provider = registry.get(id)
  if (!provider) throw new Error(`LLM provider not registered: ${id}`)
  return provider
}

export function resolveActiveProvider(): LlmProvider {
  const config = loadAiLlmConfig()
  if (!initialized) initProviderFactory()
  return getProvider(config.providerId)
}

export function listRegisteredProviderIds(): LlmProviderId[] {
  if (!initialized) initProviderFactory()
  return [...registry.keys()]
}

/** @deprecated use initProviderFactory */
export function initLlmProviders(): void {
  initProviderFactory()
}

/** @deprecated use registerProvider */
export function registerLlmProvider(provider: LlmProvider): void {
  registerProvider(provider)
}

/** @deprecated use resetProviderFactoryForTests */
export function resetLlmProvidersForTests(): void {
  resetProviderFactoryForTests()
}

/** @deprecated use getProvider */
export function getLlmProvider(id: LlmProviderId): LlmProvider {
  return getProvider(id)
}

/** @deprecated use resolveActiveProvider */
export function resolveActiveLlmProvider(): LlmProvider {
  return resolveActiveProvider()
}

export function isLlmInitialized(): boolean {
  return initialized
}
