import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { FutureEngineResponseDto } from '../contracts/futureEngineDto.js'
import { assembleEnterpriseFuture, gatherEnterpriseFutureContext } from './enterpriseFutureEngine.js'

export async function getFutureEngine(prisma: PrismaClient): Promise<FutureEngineResponseDto> {
  try {
    const ctx = await gatherEnterpriseFutureContext(prisma)
    return assembleEnterpriseFuture(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
