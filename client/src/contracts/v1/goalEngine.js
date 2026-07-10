/**
 * @typedef {Object} ActiveGoalDto
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {'P1' | 'P2' | 'P3'} priority
 * @property {string} currentValue
 * @property {string} targetValue
 * @property {number} progressPercent
 * @property {'ON_TRACK' | 'AT_RISK' | 'FAILED' | 'ACHIEVED'} status
 * @property {string} reason
 */

/**
 * @typedef {Object} GoalProgressDto
 * @property {string} goalId
 * @property {string} startValue
 * @property {string} currentValue
 * @property {string} targetValue
 * @property {number} progressPercent
 * @property {string} estimatedCompletion
 * @property {'UP' | 'DOWN' | 'FLAT'} trend
 */

/**
 * @typedef {Object} GoalEngineResponseDto
 * @property {number} goalScore
 * @property {string} goalDecision
 * @property {ActiveGoalDto[]} activeGoals
 * @property {GoalProgressDto[]} goalProgress
 * @property {object[]} goalRisks
 * @property {object[]} goalOpportunities
 * @property {string[]} managementBriefing
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: boolean }} meta
 */

export {}
