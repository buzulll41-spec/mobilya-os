import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { GoalEngineResponseDto } from '../contracts/goalEngineDto.js'
import { assembleGoalEngine, gatherGoalEngineContext } from './goalEngine.js'

export async function getGoalEngine(prisma: PrismaClient): Promise<GoalEngineResponseDto> {
  try {
    const ctx = await gatherGoalEngineContext(prisma)
    return assembleGoalEngine(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
