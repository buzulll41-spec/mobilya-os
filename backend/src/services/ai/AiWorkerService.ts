import type { PrismaClient } from '@prisma/client'

import type {

  AiWorkerConfigResponse,

  AiWorkerRunRequest,

  AiWorkerRunResponse,

} from '../../contracts/llmDto.js'

import { loadAiLlmConfig, isAiWorkerEnabled, resolveAiModel } from '../../config/aiConfig.js'

import { resetMemoryInfrastructureForTests } from '../memory/MemoryService.js'

import { listAllWorkerPromptVersions } from './prompt/PromptEngine.js'

import { executeWorker, getLLMService, resetLLMServiceForTests } from './LLMService.js'

import { initProviderFactory, resetProviderFactoryForTests } from './llm/ProviderFactory.js'



const PIPELINE_WORKERS = [

  'dw-sales-follow-up',

  'dw-collection',

  'dw-shipment',

  'dw-procurement',

] as const



let initialized = false



function ensureInit(): void {

  if (!initialized) {

    initProviderFactory()

    initialized = true

  }

}



export function getAiWorkerConfig(): AiWorkerConfigResponse {

  ensureInit()

  const config = loadAiLlmConfig()

  return {

    enabled: isAiWorkerEnabled(),

    providerId: config.providerId,

    model: resolveAiModel(),

    temperature: config.temperature,

    maxTokens: config.maxTokens,

    streamingEnabled: config.streamingEnabled,

    costTrackingEnabled: config.costTrackingEnabled,

    workers: [...PIPELINE_WORKERS],

    promptVersions: listAllWorkerPromptVersions(),

  }

}



export async function runAiWorkerTask(

  prisma: PrismaClient,

  req: AiWorkerRunRequest,

): Promise<AiWorkerRunResponse> {

  ensureInit()

  return executeWorker(prisma, req)

}



export function resetAiWorkerRuntime(): void {

  initialized = false

  resetProviderFactoryForTests()

  resetLLMServiceForTests()

  resetMemoryInfrastructureForTests()

}



export { getLLMService, executeWorker }


