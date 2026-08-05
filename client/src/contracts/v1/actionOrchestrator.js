/**
 * @typedef {'PLANNED' | 'APPLIED'} OrchestratorRunStatus
 */

/**
 * @typedef {Object} PriorityOverrideDto
 * @property {string} target
 * @property {'ACTION_CATEGORY' | 'CASE_CATEGORY' | 'JOB_TYPE' | 'AGENT'} targetType
 * @property {number} boost
 * @property {string} [effectivePriority]
 * @property {string} reason
 */

/**
 * @typedef {Object} AffectedItemDto
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {string} originalPriority
 * @property {string} boostedPriority
 * @property {number} boost
 */

/**
 * @typedef {Object} ActionOrchestratorResponseDto
 * @property {number} orchestratorScore
 * @property {string} activeStrategy
 * @property {number} brainScore
 * @property {AffectedItemDto[]} affectedTasks
 * @property {AffectedItemDto[]} affectedCases
 * @property {AffectedItemDto[]} affectedJobs
 * @property {AffectedItemDto[]} affectedAgents
 * @property {string[]} executionPlan
 * @property {PriorityOverrideDto[]} priorityOverrides
 * @property {string | null} lastRunAt
 * @property {OrchestratorRunStatus} runStatus
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: boolean, sources: string[] }} meta
 */

export {}
