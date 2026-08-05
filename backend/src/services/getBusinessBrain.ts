import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { BusinessBrainResponseDto } from '../contracts/businessBrainDto.js'

import { assembleBusinessBrain, gatherBusinessBrainContext } from './businessBrainEngine.js'



export async function getBusinessBrain(prisma: PrismaClient): Promise<BusinessBrainResponseDto> {

  try {

    const ctx = await gatherBusinessBrainContext(prisma)

    return assembleBusinessBrain(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}

