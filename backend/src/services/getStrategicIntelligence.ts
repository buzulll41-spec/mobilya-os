import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { StrategicIntelligenceResponseDto } from '../contracts/strategicIntelligenceDto.js'
import {
  assembleStrategicIntelligence,
  gatherStrategicContext,
} from './strategicIntelligenceEngine.js'

export async function getStrategicIntelligence(
  prisma: PrismaClient,
): Promise<StrategicIntelligenceResponseDto> {
  try {
    const ctx = await gatherStrategicContext(prisma)
    return assembleStrategicIntelligence(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
