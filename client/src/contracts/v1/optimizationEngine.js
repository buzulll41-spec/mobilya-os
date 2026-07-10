/**
 * @typedef {Object} StrategyOptimizationDto
 * @property {string} strategy
 * @property {number} currentWeight
 * @property {number} recommendedWeight
 * @property {number} successRate
 * @property {string} reason
 */

/**
 * @typedef {Object} AgentOptimizationDto
 * @property {string} agent
 * @property {number} currentWeight
 * @property {number} recommendedWeight
 * @property {number} successRate
 * @property {number} impactScore
 * @property {string} reason
 */

/**
 * @typedef {Object} RecommendedChangeDto
 * @property {string} id
 * @property {string} targetType
 * @property {string} target
 * @property {string} currentValue
 * @property {string} recommendedValue
 * @property {number} impact
 * @property {string} reason
 * @property {'P1' | 'P2' | 'P3'} priority
 */

/**
 * @typedef {Object} OptimizationEngineResponseDto
 * @property {number} optimizationScore
 * @property {string} optimizationDecision
 * @property {StrategyOptimizationDto[]} strategyOptimizations
 * @property {AgentOptimizationDto[]} agentOptimizations
 * @property {RecommendedChangeDto[]} recommendedChanges
 * @property {string[]} managementBriefing
 * @property {string} today
 * @property {string} generatedAt
 * @property {'PENDING' | 'APPLIED'} applyStatus
 * @property {string | null} lastAppliedAt
 * @property {{ depoKatiExcluded: boolean, virtualOnly: boolean }} meta
 */

/**
 * @typedef {Object} OptimizationApplyResponseDto
 * @property {'APPLIED'} status
 * @property {number} appliedChanges
 * @property {string} runAt
 * @property {{ depoKatiExcluded: boolean, virtualOnly: boolean }} meta
 */

export {}
