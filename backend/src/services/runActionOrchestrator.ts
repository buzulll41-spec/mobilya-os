import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { ActionOrchestratorResponseDto } from '../contracts/actionOrchestratorDto.js'

import { applyOrchestratorRun } from './actionOrchestratorEngine.js'



export async function runActionOrchestrator(prisma: PrismaClient): Promise<ActionOrchestratorResponseDto> {

  try {

    return await applyOrchestratorRun(prisma)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}

