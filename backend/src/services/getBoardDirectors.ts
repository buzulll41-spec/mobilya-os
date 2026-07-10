import type { PrismaClient } from '@prisma/client'

import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

import type { BoardDirectorsResponseDto } from '../contracts/boardDirectorsDto.js'

import { assembleBoardDirectors, gatherBoardContext } from './boardDirectorsEngine.js'



export async function getBoardDirectors(

  prisma: PrismaClient,

): Promise<BoardDirectorsResponseDto> {

  try {

    const ctx = await gatherBoardContext(prisma)

    return assembleBoardDirectors(ctx)

  } catch (err) {

    assertServiceErrorMapped(err)

    throw err

  }

}


