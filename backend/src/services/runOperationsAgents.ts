import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { AgentCode, OperationsAgentsResponseDto } from '../contracts/operationsAgentDto.js'
import {
  assembleOperationsAgentsResponse,
  gatherAgentContext,
  isValidAgentCode,
  recordAgentRun,
  runAllAgents,
  runSingleAgent,
} from './operationsAgentsEngine.js'

export async function runOperationsAgents(
  prisma: PrismaClient,
  agentCode?: string,
): Promise<OperationsAgentsResponseDto> {
  try {
    const ctx = await gatherAgentContext(prisma)

    if (agentCode) {
      if (!isValidAgentCode(agentCode)) {
        throw new AppHttpError(404, 'Operasyon ajanı bulunamadı', 'Not Found', { agentCode })
      }
      const result = runSingleAgent(ctx, agentCode as AgentCode)
      recordAgentRun(agentCode as AgentCode, result.ranAt)
      const refreshed = await gatherAgentContext(prisma)
      const subResults: Partial<Record<AgentCode, ReturnType<typeof runSingleAgent>>> = {
        [agentCode as AgentCode]: result,
      }
      if (agentCode !== 'EXECUTIVE_AGENT') {
        subResults.EXECUTIVE_AGENT = runSingleAgent(refreshed, 'EXECUTIVE_AGENT')
      }
      return assembleOperationsAgentsResponse(refreshed, subResults)
    }

    const results = runAllAgents(ctx)
    const refreshed = await gatherAgentContext(prisma)
    return assembleOperationsAgentsResponse(refreshed, results)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
