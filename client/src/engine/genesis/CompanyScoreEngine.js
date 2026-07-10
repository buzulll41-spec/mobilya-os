import { GENESIS_SCORE_DIMENSION } from '../../contracts/v1/genesis.js'
import { buildExecutionSummaryLocal } from '../../services/ai-tools/mockAiToolExecutionStore.js'
import { getAiCompanyStatus } from '../../services/company-brain/companyBrainStore.js'
import { getCompanyManagerDailyStats } from '../../services/company-manager/companyManagerStore.js'
import { listGlobalMemories } from '../../services/genesis/globalMemoryStore.js'
import { getLastGenesisBoardMeeting } from '../../services/genesis/genesisStore.js'

/**
 * @param {number} value
 * @param {number} max
 */
function clampScore(value, max = 100) {
  return Math.max(0, Math.min(max, Math.round(value)))
}

/**
 * @param {{
 *   domains?: ReturnType<import('../company-manager/PriorityEngine.js').scoreOperationalDomains>
 *   orchestrationActive?: number
 *   memoryCount?: number
 *   predictionCount?: number
 *   todayIso?: string
 * }} input
 */
export function computeGenesisCompanyScore(input) {
  const {
    domains,
    orchestrationActive = 0,
    memoryCount = listGlobalMemories(100).length,
    predictionCount = 0,
    todayIso = new Date().toISOString().slice(0, 10),
  } = input

  const execSummary = buildExecutionSummaryLocal(todayIso)
  const stats = getCompanyManagerDailyStats()
  const aiStatus = getAiCompanyStatus()
  const board = getLastGenesisBoardMeeting()

  const critical = domains?.criticalOrders ?? 0
  const riskScore = clampScore(100 - critical * 12 - (domains?.collection?.pressure ?? 0) * 3)

  const dimensions = [
    {
      id: GENESIS_SCORE_DIMENSION.COMPANY_INTELLIGENCE,
      label: 'Şirket Zekası',
      score: clampScore((aiStatus?.running ?? 0) * 20 + (stats.decisionsToday > 0 ? 25 : 10) + 35),
      weight: 15,
    },
    {
      id: GENESIS_SCORE_DIMENSION.AUTOMATION,
      label: 'Automation',
      score: clampScore(
        (execSummary.today ?? 0) * 8 +
          (aiStatus?.activeTasks ?? 0) * 4 +
          orchestrationActive * 10,
      ),
      weight: 12,
    },
    {
      id: GENESIS_SCORE_DIMENSION.RISK,
      label: 'Risk',
      score: riskScore,
      weight: 14,
    },
    {
      id: GENESIS_SCORE_DIMENSION.DECISION_QUALITY,
      label: 'Decision Quality',
      score: clampScore(
        stats.decisionsToday * 6 +
          (stats.tasksCancelled === 0 ? 30 : 20) +
          (board ? 15 : 5),
      ),
      weight: 13,
    },
    {
      id: GENESIS_SCORE_DIMENSION.EXECUTION,
      label: 'Execution',
      score: clampScore(
        (execSummary.success ?? 0) * 10 +
          (stats.tasksCompleted ?? 0) * 5 +
          (aiStatus?.completedTasks ?? 0) * 4,
      ),
      weight: 14,
    },
    {
      id: GENESIS_SCORE_DIMENSION.LEARNING,
      label: 'Learning',
      score: clampScore(memoryCount * 4 + (board?.insights?.length ?? 0) * 8),
      weight: 10,
    },
    {
      id: GENESIS_SCORE_DIMENSION.PREDICTION,
      label: 'Prediction',
      score: clampScore(40 + predictionCount * 12),
      weight: 11,
    },
    {
      id: GENESIS_SCORE_DIMENSION.MEMORY,
      label: 'Memory',
      score: clampScore(Math.min(100, memoryCount * 3 + 25)),
      weight: 11,
    },
  ]

  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0)
  const totalScore = clampScore(
    dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight,
  )

  return { totalScore, dimensions }
}

export {}
