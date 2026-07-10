import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import type { GoalUpdateResponseDto } from '../contracts/goalEngineDto.js'
import {
  assembleGoalEngine,
  gatherGoalEngineContext,
  virtualUpdateGoalProgress,
} from './goalEngine.js'

export async function updateGoalProgress(
  prisma: PrismaClient,
  goalId: string,
): Promise<GoalUpdateResponseDto> {
  try {
    const ctx = await gatherGoalEngineContext(prisma)
    const report = assembleGoalEngine(ctx)
    const goal = report.activeGoals.find((g) => g.id === goalId)
    if (!goal) {
      throw new AppHttpError(404, `Goal not found: ${goalId}`, 'NOT_FOUND')
    }

    const updated = virtualUpdateGoalProgress(goalId, 5)
    if (!updated) {
      throw new AppHttpError(500, 'Goal update failed', 'INTERNAL')
    }

    const refreshed = assembleGoalEngine(ctx)
    const refreshedGoal = refreshed.activeGoals.find((g) => g.id === goalId)!

    return {
      status: 'UPDATED',
      goalId,
      progressPercent: refreshedGoal.progressPercent,
      updatedAt: updated.updatedAt,
      meta: { depoKatiExcluded: true },
    }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
