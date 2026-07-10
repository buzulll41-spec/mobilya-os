import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { OptimizationEngineResponseDto } from '../contracts/optimizationEngineDto.js'
import { assembleOptimizationEngine, gatherOptimizationEngineContext } from './optimizationEngine.js'

export async function getOptimizationEngine(
  prisma: PrismaClient,
): Promise<OptimizationEngineResponseDto> {
  try {
    const ctx = await gatherOptimizationEngineContext(prisma)
    return assembleOptimizationEngine(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
