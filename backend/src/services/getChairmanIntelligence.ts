import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { ChairmanIntelligenceResponseDto } from '../contracts/chairmanDto.js'
import { assembleChairmanIntelligence, gatherChairmanContext } from './chairmanEngine.js'

export async function getChairmanIntelligence(
  prisma: PrismaClient,
): Promise<ChairmanIntelligenceResponseDto> {
  try {
    const ctx = await gatherChairmanContext(prisma)
    return assembleChairmanIntelligence(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
