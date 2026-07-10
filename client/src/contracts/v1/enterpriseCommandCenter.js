/**
 * @typedef {Object} TodayActionDto
 * @property {string} id
 * @property {'P1' | 'P2' | 'P3'} priority
 * @property {string} source
 * @property {string} action
 */

/**
 * @typedef {Object} CriticalRiskDto
 * @property {string} id
 * @property {string} severity
 * @property {string} source
 * @property {string} title
 * @property {string} recommendation
 */

/**
 * @typedef {Object} OpportunityDto
 * @property {string} id
 * @property {string} source
 * @property {string} title
 * @property {number} impact
 * @property {string} recommendation
 */

/**
 * @typedef {Object} GoalStatusSummaryDto
 * @property {number} total
 * @property {number} atRisk
 * @property {number} achieved
 */

/**
 * @typedef {Object} LearningStrategySummaryDto
 * @property {string} strategy
 * @property {number} successRate
 * @property {number} impactScore
 */

/**
 * @typedef {Object} LearningSummaryDto
 * @property {LearningStrategySummaryDto[]} topSuccessful
 * @property {LearningStrategySummaryDto[]} bottomFailed
 */

/**
 * @typedef {Object} OptimizationSummaryDto
 * @property {number} strategyChanges
 * @property {number} agentChanges
 * @property {string | null} topStrategyChange
 * @property {string | null} topAgentChange
 */

/**
 * @typedef {Object} OperationsSummaryDto
 * @property {number} openCases
 * @property {number} criticalCases
 * @property {number} pendingTasks
 * @property {number} automationQueue
 */

/**
 * @typedef {Object} EnterpriseCommandCenterResponseDto
 * @property {number} companyHealthScore
 * @property {TodayActionDto[]} todayActions
 * @property {CriticalRiskDto[]} criticalRisks
 * @property {OpportunityDto[]} opportunities
 * @property {GoalStatusSummaryDto} goalStatus
 * @property {LearningSummaryDto} learningSummary
 * @property {OptimizationSummaryDto} optimizationSummary
 * @property {OperationsSummaryDto} operationsSummary
 * @property {string[]} managementBriefing
 * @property {'FOCUS_COLLECTION' | 'FOCUS_GROWTH' | 'BALANCED_MODE'} commandDecision
 * @property {string} today
 * @property {string} generatedAt
 * @property {string} currency
 * @property {{ depoKatiExcluded: boolean }} meta
 */

export {}
