import { COMPANY_MANAGER_DECISION } from '../../contracts/v1/aiCompanyManager.js'
import { WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'

/** @typedef {import('../../contracts/v1/decisionQuality.js').DecisionCriteriaScores} DecisionCriteriaScores */
/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

export const CRITERIA_WEIGHTS = {
  predictionAccuracy: 0.15,
  learningScore: 0.12,
  executionSuccess: 0.14,
  approvalRate: 0.1,
  userFeedback: 0.08,
  businessImpact: 0.15,
  timeSaved: 0.11,
  riskReduction: 0.15,
}

const clamp = (n) => Math.min(100, Math.max(0, Math.round(n)))

/**
 * @param {CompanyManagerDecisionDto | { type: string, priority?: string, orderId?: string, workerId?: string, targetWorkerId?: string, score?: number }} decision
 * @param {{
 *   predictionAccuracy?: number
 *   learningScore?: number
 *   predictionConfidence?: number
 *   executionSuccessRate?: number
 *   approvalRate?: number
 *   userFeedback?: number
 * }} signals
 */
export function scoreDecisionCriteria(decision, signals = {}) {
  const type = decision.type ?? 'UNKNOWN'
  const priority = decision.priority ?? 'NORMAL'
  const workerScore = 'score' in decision && typeof decision.score === 'number' ? decision.score : 55

  let businessImpact = 55
  let riskReduction = 50
  let timeSaved = 45
  let executionSuccess = signals.executionSuccessRate ?? 72

  if (type === COMPANY_MANAGER_DECISION.RISK_REDUCED) {
    riskReduction = 92
    businessImpact = 70
  } else if (type === COMPANY_MANAGER_DECISION.CREATE_TASK) {
    businessImpact = priority === WORKER_PRIORITY.CRITICAL ? 88 : 75
    timeSaved = 68
    executionSuccess = 78
  } else if (type === COMPANY_MANAGER_DECISION.COLLECTION_PRIORITY || type === COMPANY_MANAGER_DECISION.SHIPMENT_PRIORITY) {
    businessImpact = 82
    riskReduction = 74
    timeSaved = 60
  } else if (type === COMPANY_MANAGER_DECISION.CANCEL_TASK) {
    businessImpact = 48
    riskReduction = 55
    executionSuccess = 65
  } else if (type === COMPANY_MANAGER_DECISION.PROCUREMENT_STOP || type === COMPANY_MANAGER_DECISION.SHIPMENT_PAUSE) {
    businessImpact = 58
    riskReduction = 62
  }

  if ('score' in decision && typeof decision.score === 'number') {
    businessImpact = clamp((businessImpact + workerScore) / 2)
    executionSuccess = clamp((executionSuccess + workerScore) / 2)
  }

  return {
    predictionAccuracy: clamp(signals.predictionAccuracy ?? 65),
    learningScore: clamp(signals.learningScore ?? 68),
    executionSuccess: clamp(executionSuccess),
    approvalRate: clamp(signals.approvalRate ?? 70),
    userFeedback: clamp(signals.userFeedback ?? 72),
    businessImpact: clamp(businessImpact),
    timeSaved: clamp(timeSaved),
    riskReduction: clamp(riskReduction),
  }
}

/**
 * @param {DecisionCriteriaScores} criteria
 */
export function computeDecisionScore(criteria) {
  let sum = 0
  for (const [key, weight] of Object.entries(CRITERIA_WEIGHTS)) {
    sum += (criteria[key] ?? 0) * weight
  }
  return clamp(sum)
}

/**
 * @param {DecisionCriteriaScores} criteria
 * @param {number} decisionScore
 * @param {number} predictionConfidence
 * @param {number} learningScore
 */
export function computeDecisionConfidence(criteria, decisionScore, predictionConfidence, learningScore) {
  void criteria
  return clamp(decisionScore * 0.45 + predictionConfidence * 0.3 + learningScore * 0.25)
}

/**
 * @param {number} decisionScore
 * @param {number} predictionConfidence
 * @param {number} learningScore
 */
export function computeCombinedDistributionScore(decisionScore, predictionConfidence, learningScore) {
  return clamp(decisionScore * 0.4 + predictionConfidence * 0.35 + learningScore * 0.25)
}

export {}
