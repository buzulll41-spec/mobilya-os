/** FAZ 107 — Self Optimization Engine contracts. */

/**
 * @typedef {Object} WorkerStrategyDto
 * @property {string} label
 * @property {number} predictionWeight 0-1
 * @property {boolean} humanApprovalRequired
 * @property {number} aggressiveness 0-1
 * @property {number} confidenceMultiplier 0.5-1.5
 */

/**
 * @typedef {Object} WorkerOptimizationProfileDto
 * @property {string} workerId
 * @property {string} workerLabel
 * @property {number} optimizationScore 0-100
 * @property {number} strategyVersion
 * @property {WorkerStrategyDto} currentStrategy
 * @property {WorkerStrategyDto | null} previousStrategy
 * @property {string} lastOptimizedAt
 */

/**
 * @typedef {Object} OptimizationMetricsDto
 * @property {number} predictionAccuracy
 * @property {number} learningScore
 * @property {number} decisionScore
 * @property {number} executionSuccess
 * @property {number} approvalRate
 * @property {number} riskReduction
 */

/**
 * @typedef {Object} OptimizationHistoryRecordDto
 * @property {string} id
 * @property {string} workerId
 * @property {number} strategyVersion
 * @property {WorkerStrategyDto} previousStrategy
 * @property {WorkerStrategyDto} currentStrategy
 * @property {number} optimizationScore
 * @property {string} reason
 * @property {string} occurredAt
 */

/**
 * @typedef {Object} CompanyOptimizationSummaryDto
 * @property {WorkerOptimizationProfileDto[]} workers
 * @property {OptimizationHistoryRecordDto[]} recentHistory
 * @property {number} avgOptimizationScore
 * @property {string} mostImprovedWorkerId
 * @property {string} mostStrategyChangesWorkerId
 * @property {{ durationMs: number }} meta
 */

export {}
