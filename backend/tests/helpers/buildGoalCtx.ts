import { assembleActionOrchestrator } from '../../src/services/actionOrchestratorEngine.js'
import { assembleBusinessBrain } from '../../src/services/businessBrainEngine.js'
import { assembleGroupChairman } from '../../src/services/groupChairmanEngine.js'
import { assembleHoldingCenter } from '../../src/services/holdingCenterEngine.js'
import { assembleLearningEngine } from '../../src/services/learningEngine.js'
import { assembleOperationsAgentsResponse } from '../../src/services/operationsAgentsEngine.js'
import { assembleOptimizationEngine } from '../../src/services/optimizationEngine.js'
import { assemblePerformanceFeedback } from '../../src/services/performanceFeedbackEngine.js'
import { buildInvestorCtx } from '../investorIntelligence.test.js'

export function buildGoalCtx(opts: Parameters<typeof buildInvestorCtx>[0] = {}) {
  const investorCtx = buildInvestorCtx(opts)
  const holdingReport = assembleHoldingCenter({ investorCtx, today: investorCtx.strategic.today })
  const groupReport = assembleGroupChairman({ investorCtx, today: investorCtx.strategic.today, holdingReport })
  const brain = assembleBusinessBrain({
    investorCtx,
    today: investorCtx.strategic.today,
    holdingReport,
    groupReport,
  })
  const agents = assembleOperationsAgentsResponse({ ...investorCtx.strategic, runTimestamps: new Map() })
  const orchestratorCtx = { brain, ceo: investorCtx.strategic, agents, today: brain.today }
  const orchestrator = assembleActionOrchestrator(orchestratorCtx)
  const base = { ...orchestratorCtx, orchestrator, agents }
  const learning = assembleLearningEngine(base)
  const feedback = assemblePerformanceFeedback(base)
  const optimization = assembleOptimizationEngine({ ...base, learning, feedback })
  return { ...base, learning, feedback, optimization }
}
