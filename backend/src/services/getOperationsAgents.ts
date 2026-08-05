import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { OperationsAgentsResponseDto } from '../contracts/operationsAgentDto.js'
import { assembleOperationsAgentsResponse, gatherAgentContext } from './operationsAgentsEngine.js'

export async function getOperationsAgents(prisma: PrismaClient): Promise<OperationsAgentsResponseDto> {
  try {
    const ctx = await gatherAgentContext(prisma)
    return assembleOperationsAgentsResponse(ctx)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
