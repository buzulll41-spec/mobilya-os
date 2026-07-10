/** FAZ 106 — Decision Quality Engine contracts. */

export const DECISION_QUALITY_SOURCE = {
  COMPANY_MANAGER: 'company_manager',
  AI_WORKER: 'ai_worker',
}

export const DECISION_CRITERIA = {
  PREDICTION_ACCURACY: 'predictionAccuracy',
  LEARNING_SCORE: 'learningScore',
  EXECUTION_SUCCESS: 'executionSuccess',
  APPROVAL_RATE: 'approvalRate',
  USER_FEEDBACK: 'userFeedback',
  BUSINESS_IMPACT: 'businessImpact',
  TIME_SAVED: 'timeSaved',
  RISK_REDUCTION: 'riskReduction',
}

/**
 * @typedef {Object} DecisionCriteriaScores
 * @property {number} predictionAccuracy
 * @property {number} learningScore
 * @property {number} executionSuccess
 * @property {number} approvalRate
 * @property {number} userFeedback
 * @property {number} businessImpact
 * @property {number} timeSaved
 * @property {number} riskReduction
 */

/**
 * @typedef {Object} DecisionQualityRecordDto
 * @property {string} id
 * @property {typeof DECISION_QUALITY_SOURCE[keyof typeof DECISION_QUALITY_SOURCE]} source
 * @property {string} workerId
 * @property {string} decisionType
 * @property {string} [orderId]
 * @property {string} message
 * @property {string} occurredAt
 * @property {DecisionCriteriaScores} criteria
 * @property {number} decisionScore
 * @property {number} confidence
 */

/**
 * @typedef {Object} WorkerDecisionSummaryDto
 * @property {string} workerId
 * @property {string} workerLabel
 * @property {number} decisionCount
 * @property {number} avgDecisionScore
 * @property {number} avgConfidence
 */

/**
 * @typedef {Object} CompanyDecisionSummaryDto
 * @property {number} totalDecisions
 * @property {number} avgDecisionScore
 * @property {number} avgConfidence
 * @property {number} avgPredictionAccuracy
 * @property {number} avgLearningScore
 * @property {WorkerDecisionSummaryDto[]} topWorkers
 * @property {WorkerDecisionSummaryDto[]} lowQualityDecisions
 * @property {DecisionQualityRecordDto[]} riskReductionLeaders
 * @property {{ last30DaysAvgScore: number, last30DaysCount: number, durationMs: number }} meta
 */

export {}
