import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { HoldingCenterResponseDto } from '../contracts/holdingCenterDto.js'
import { assembleHoldingCenter, gatherHoldingContext } from './holdingCenterEngine.js'

export async function getHoldingCenter(prisma: PrismaClient): Promise<HoldingCenterResponseDto> {
  try {
    const ctx = await gatherHoldingContext(prisma)
    return assembleHoldingCenter(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
