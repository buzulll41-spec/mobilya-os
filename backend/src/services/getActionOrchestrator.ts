import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { ActionOrchestratorResponseDto } from '../contracts/actionOrchestratorDto.js'

import { assembleActionOrchestrator, gatherOrchestratorContext } from './actionOrchestratorEngine.js'



export async function getActionOrchestrator(prisma: PrismaClient): Promise<ActionOrchestratorResponseDto> {

  try {

    const ctx = await gatherOrchestratorContext(prisma)

    return assembleActionOrchestrator(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}

