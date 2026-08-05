/**
 * @typedef {Object} StrategyPerformanceDto
 * @property {string} strategy
 * @property {number} executionCount
 * @property {number} successRate
 * @property {number} avgImpact
 */

/**
 * @typedef {Object} ImpactAnalysisDto
 * @property {number} collectionImpact
 * @property {number} profitImpact
 * @property {number} riskImpact
 * @property {number} shipmentImpact
 * @property {number} operationsImpact
 * @property {string} summary
 */

/**
 * @typedef {Object} StrategyLessonDto
 * @property {string} strategy
 * @property {string} lesson
 * @property {number} successRate
 */

/**
 * @typedef {Object} PerformanceFeedbackResponseDto
 * @property {number} feedbackScore
 * @property {string} activeStrategy
 * @property {StrategyPerformanceDto[]} strategyPerformance
 * @property {StrategyPerformanceDto[]} successfulStrategies
 * @property {StrategyPerformanceDto[]} failedStrategies
 * @property {ImpactAnalysisDto} impactAnalysis
 * @property {StrategyLessonDto[]} lessonsLearned
 * @property {string} recommendation
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: boolean, sources: string[] }} meta
 */

export {}
