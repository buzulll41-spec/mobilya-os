/**
 * FAZ 43 — backward-compatible re-exports.
 */
export {
  initProviderFactory as initLlmProviders,
  registerProvider as registerLlmProvider,
  resetProviderFactoryForTests as resetLlmProvidersForTests,
  getProvider as getLlmProvider,
  resolveActiveProvider as resolveActiveLlmProvider,
  isLlmInitialized,
} from './ProviderFactory.js'

export { isAiWorkerEnabled, resolveAiModel } from '../../../config/aiConfig.js'
