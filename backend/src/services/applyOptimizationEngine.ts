import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { OptimizationApplyResponseDto } from '../contracts/optimizationEngineDto.js'
import { applyOptimizationRun } from './optimizationEngine.js'

export async function applyOptimizationEngine(
  prisma: PrismaClient,
): Promise<OptimizationApplyResponseDto> {
  try {
    const result = await applyOptimizationRun(prisma)
    return {
      status: result.status,
      appliedChanges: result.appliedChanges,
      runAt: result.runAt,
      meta: { depoKatiExcluded: true, virtualOnly: true },
    }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
