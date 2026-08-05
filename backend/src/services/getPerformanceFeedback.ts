import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { PerformanceFeedbackResponseDto } from '../contracts/performanceFeedbackDto.js'

import {

  assemblePerformanceFeedback,

  gatherPerformanceFeedbackContext,

} from './performanceFeedbackEngine.js'



export async function getPerformanceFeedback(

  prisma: PrismaClient,

): Promise<PerformanceFeedbackResponseDto> {

  try {

    const ctx = await gatherPerformanceFeedbackContext(prisma)

    return assemblePerformanceFeedback(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}

