import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { OperationsAgentDetailDto } from '../contracts/operationsAgentDto.js'
import {
  assembleAgentDetail,
  gatherAgentContext,
  isValidAgentCode,
} from './operationsAgentsEngine.js'

export async function getOperationsAgentDetail(
  prisma: PrismaClient,
  agentCode: string,
): Promise<OperationsAgentDetailDto> {
  if (!isValidAgentCode(agentCode)) {
    throw new AppHttpError(404, 'Operasyon ajanı bulunamadı', 'Not Found', { agentCode })
  }
  try {
    const ctx = await gatherAgentContext(prisma)
    return assembleAgentDetail(ctx, agentCode)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
