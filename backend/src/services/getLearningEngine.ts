import type { PrismaClient } from '@prisma/client'



import { assertServiceErrorMapped } from '../errors/mapServiceError.js'



import type { LearningEngineResponseDto } from '../contracts/learningEngineDto.js'



import { assembleLearningEngine, gatherLearningEngineContext } from './learningEngine.js'



export async function getLearningEngine(prisma: PrismaClient): Promise<LearningEngineResponseDto> {

  try {

    const ctx = await gatherLearningEngineContext(prisma)

    return assembleLearningEngine(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}


