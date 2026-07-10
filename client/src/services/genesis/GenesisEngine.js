import { GENESIS_LIVING_PHASE } from '../../contracts/v1/genesis.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import { scoreOperationalDomains } from '../../engine/company-manager/PriorityEngine.js'
import { applyGoalWeightsToDomains } from '../../engine/company-brain/GoalEngineBridge.js'
import { getCompanyGoals } from '../company-goals/companyGoalsStore.js'
import { runCompanyBrainScan } from '../company-brain/CompanyBrain.js'
import { getOrchestrationSnapshot } from '../../engine/workerOrchestrator.js'
import { getAllDomainEventsSnapshot } from '../mockDomainEventStore.js'
import { appendCompanyManagerDecisions } from '../company-manager/companyManagerStore.js'
import { applyCompanyManagerDecisions } from '../../engine/company-manager/WorkerCoordinator.js'
import { publishCompanyBrainDecisionEvents } from '../company-brain/companyBrainAudit.js'
import { getCompanyManagerDailyStats } from '../company-manager/companyManagerStore.js'
import { getAiCompanyStatus } from '../company-brain/companyBrainStore.js'
import { getLastCompanyBrainScan } from '../company-brain/companyBrainStore.js'
import { buildExecutionSummaryLocal } from '../ai-tools/mockAiToolExecutionStore.js'
import { listGlobalMemories } from './globalMemoryStore.js'
import {
  appendCeoChatExchange,
  getCeoChatHistory,
  getGenesisCompanyScore,
  getGenesisLivingState,
  getGenesisPredictions,
  getLastGenesisBoardMeeting,
  getLastGenesisScenario,
  recordGenesisBoardMeeting,
  recordGenesisCompanyScore,
  recordGenesisPredictions,
  recordGenesisScenario,
  updateGenesisLivingState,
} from './genesisStore.js'
import { computeGenesisCompanyScore } from '../../engine/genesis/CompanyScoreEngine.js'
import { buildGenesisPredictions } from '../../engine/genesis/PredictionEngine.js'
import { buildSelfImprovementDecisions } from '../../engine/genesis/SelfImprovementEngine.js'
import { runDigitalBoardMeeting } from '../../engine/genesis/BoardMeetingEngine.js'
import { handleCeoChatMessage as handleCeoChatMessageEngine } from '../../engine/genesis/CeoChatEngine.js'
import { getGenesisBoardMeetingHour } from '../../config/genesisConfig.js'
import { COMPANY_MANAGER_DECISION } from '../../contracts/v1/aiCompanyManager.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const PHASES = [
  GENESIS_LIVING_PHASE.OBSERVE,
  GENESIS_LIVING_PHASE.DECIDE,
  GENESIS_LIVING_PHASE.ACT,
  GENESIS_LIVING_PHASE.LEARN,
  GENESIS_LIVING_PHASE.NOTIFY,
]

let decisionSeq = 0
let lastRiskScore = 0

function nextDecisionId() {
  decisionSeq += 1
  return `gen-dec-${Date.now()}-${decisionSeq}`
}

/**
 * @param {CompanyManagerDecisionDto['type']} type
 * @param {string} message
 * @param {Partial<import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto>} [extra]
 * @param {string} [todayIso]
 */
function buildGenesisDecision(type, message, extra = {}, todayIso) {
  return {
    id: nextDecisionId(),
    type,
    message,
    occurredAt: `${todayIso}T${new Date().toISOString().slice(11, 23)}Z`,
    ...extra,
  }
}

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string }} ctx
 */
function analyzeRisk(ctx) {
  const domainEvents = getAllDomainEventsSnapshot()
  const snapshots = BusinessEngine.computeOrderSnapshots(ctx.orders, ctx.dtos, ctx.todayIso)
  const domains = scoreOperationalDomains({
    snapshots: [...snapshots.values()],
    domainEvents,
    todayIso: ctx.todayIso,
  })
  const { weightedDomains, metrics } = applyGoalWeightsToDomains(domains, getCompanyGoals())
  const riskScore =
    weightedDomains.criticalOrders * 15 +
    weightedDomains.collection.pressure * 8 +
    weightedDomains.shipment.pressure * 6

  return { domains: weightedDomains, metrics, riskScore }
}

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string, goalEngine?: unknown }} ctx
 */
export function runGenesisHeartbeat(ctx) {
  const { riskScore, domains, metrics } = analyzeRisk(ctx)
  const prevRisk = lastRiskScore
  lastRiskScore = riskScore

  const phase = PHASES[Math.floor(Date.now() / 1000) % PHASES.length]
  const riskLevel = riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low'

  updateGenesisLivingState({
    phase,
    riskLevel,
    riskScore,
    heartbeatCount: getGenesisLivingState().heartbeatCount + 1,
    lastHeartbeatAt: new Date().toISOString(),
    ...(riskScore !== prevRisk ? { lastRiskChangeAt: new Date().toISOString() } : {}),
  })

  const predictions = buildGenesisPredictions({ domains, metrics, todayIso: ctx.todayIso })
  recordGenesisPredictions(predictions)

  const orchestration = getOrchestrationSnapshot()
  const score = computeGenesisCompanyScore({
    domains,
    orchestrationActive: orchestration.activeByOrderId?.size ?? 0,
    memoryCount: listGlobalMemories(100).length,
    predictionCount: predictions.length,
    todayIso: ctx.todayIso,
  })
  recordGenesisCompanyScore(score)

  /** Risk arttı → mini karar + CEO bilgilendir */
  if (riskScore > prevRisk + 5) {
    const decisions = [
      buildGenesisDecision(
        COMPANY_MANAGER_DECISION.CEO_NOTIFY,
        'Risk arttı — Genesis karar döngüsü başlatıldı',
        { workerId: AI_COMPANY_MANAGER_WORKER_ID, reason: `Risk ${prevRisk} → ${riskScore}` },
        ctx.todayIso,
      ),
    ]
    appendCompanyManagerDecisions(decisions)
    applyCompanyManagerDecisions(decisions)
  }

  return { phase, riskLevel, riskScore, predictions, score }
}

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string, goalEngine?: unknown, apply?: boolean }} ctx
 */
export function runGenesisBrainCycle(ctx) {
  const brain = runCompanyBrainScan(ctx)

  const selfImprove = buildSelfImprovementDecisions({
    todayIso: ctx.todayIso,
    buildDecision: (type, message, extra = {}) =>
      buildGenesisDecision(type, message, extra, ctx.todayIso),
  })

  if (selfImprove.length) {
    appendCompanyManagerDecisions(selfImprove)
    if (ctx.apply !== false) {
      applyCompanyManagerDecisions(selfImprove)
      publishCompanyBrainDecisionEvents([...brain.decisions, ...selfImprove], brain.scenario ?? 'BALANCED')
    }
  }

  const { domains, metrics } = analyzeRisk(ctx)
  const predictions = buildGenesisPredictions({ domains, metrics, todayIso: ctx.todayIso })
  recordGenesisPredictions(predictions)
  recordGenesisScenario(brain.scenario ?? 'BALANCED')

  const orchestration = getOrchestrationSnapshot()
  const score = computeGenesisCompanyScore({
    domains,
    orchestrationActive: orchestration.activeByOrderId?.size ?? 0,
    memoryCount: listGlobalMemories(100).length,
    predictionCount: predictions.length,
    todayIso: ctx.todayIso,
  })
  recordGenesisCompanyScore(score)

  return { ...brain, selfImprovementDecisions: selfImprove, predictions, score }
}

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string }} ctx
 */
export function maybeRunBoardMeeting(ctx) {
  const now = new Date()
  const day = ctx.todayIso
  const hour = getGenesisBoardMeetingHour()

  if (now.getHours() !== hour) return null
  if (getLastGenesisBoardMeeting()?.meetingAt.slice(0, 10) === day) return null

  const scan = getLastCompanyBrainScan()
  const stats = getCompanyManagerDailyStats()
  const predictions = getGenesisPredictions()

  const meeting = runDigitalBoardMeeting({
    todayIso: day,
    scenario: getLastGenesisScenario(),
    stats,
    predictions,
  })

  recordGenesisBoardMeeting(meeting)
  return meeting
}

/**
 * @param {string} message
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string }} ctx
 */
export function processCeoChat(message, ctx) {
  const exchange = handleCeoChatMessageEngine(message, ctx)
  appendCeoChatExchange(exchange.ceo, exchange.genesis)
  return exchange
}

export function getGenesisSnapshot() {
  const living = getGenesisLivingState()
  const score = getGenesisCompanyScore()
  const predictions = getGenesisPredictions()
  const board = getLastGenesisBoardMeeting()
  const aiStatus = getAiCompanyStatus()
  const stats = getCompanyManagerDailyStats()
  const execSummary = buildExecutionSummaryLocal(new Date().toISOString().slice(0, 10))

  return {
    living,
    companyScore: score ?? { totalScore: 0, dimensions: [] },
    predictions,
    boardMeeting: board,
    aiCompanyStatus: aiStatus,
    dailyStats: stats,
    toolExecutions: execSummary,
    chatHistory: getCeoChatHistory(10),
    orchestration: getOrchestrationSnapshot(),
  }
}

export {}
