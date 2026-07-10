import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { CeoIntelligenceResponseDto } from '../contracts/ceoIntelligenceDto.js'
import { assembleCeoIntelligence, gatherCeoIntelligenceContext } from './ceoIntelligenceEngine.js'

export async function getCeoIntelligence(
  prisma: PrismaClient,
): Promise<CeoIntelligenceResponseDto> {
  try {
    const ctx = await gatherCeoIntelligenceContext(prisma)
    return assembleCeoIntelligence(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
