import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { GroupChairmanResponseDto } from '../contracts/groupChairmanDto.js'

import { assembleGroupChairman, gatherGroupChairmanContext } from './groupChairmanEngine.js'



export async function getGroupChairman(prisma: PrismaClient): Promise<GroupChairmanResponseDto> {

  try {

    const ctx = await gatherGroupChairmanContext(prisma)

    return assembleGroupChairman(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}

