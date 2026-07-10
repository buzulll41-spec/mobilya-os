import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { EnterpriseCommandCenterResponseDto } from '../contracts/enterpriseCommandCenterDto.js'
import {
  assembleEnterpriseCommandCenter,
  gatherEnterpriseCommandCenterContext,
} from './enterpriseCommandCenterEngine.js'

export async function getEnterpriseCommandCenter(
  prisma: PrismaClient,
): Promise<EnterpriseCommandCenterResponseDto> {
  try {
    const ctx = await gatherEnterpriseCommandCenterContext(prisma)
    return assembleEnterpriseCommandCenter(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
