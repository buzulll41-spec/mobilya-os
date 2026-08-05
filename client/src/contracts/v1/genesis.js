/**
 * FAZ 100 — MOBILYA OS Genesis (living digital company).
 */

/** @typedef {'observe' | 'decide' | 'act' | 'learn' | 'notify'} GenesisLivingPhase */

export const GENESIS_LIVING_PHASE = /** @type {const} */ ({
  OBSERVE: 'observe',
  DECIDE: 'decide',
  ACT: 'act',
  LEARN: 'learn',
  NOTIFY: 'notify',
})

/** @typedef {keyof typeof GENESIS_SCORE_DIMENSION} GenesisScoreDimensionKey */

export const GENESIS_SCORE_DIMENSION = /** @type {const} */ ({
  COMPANY_INTELLIGENCE: 'companyIntelligence',
  AUTOMATION: 'automation',
  RISK: 'risk',
  DECISION_QUALITY: 'decisionQuality',
  EXECUTION: 'execution',
  LEARNING: 'learning',
  PREDICTION: 'prediction',
  MEMORY: 'memory',
})

/**
 * @typedef {Object} GenesisScoreDimension
 * @property {GenesisScoreDimensionKey} id
 * @property {string} label
 * @property {number} score
 * @property {number} weight
 */

/**
 * @typedef {Object} GenesisPredictionDto
 * @property {string} id
 * @property {string} label
 * @property {string} detail
 * @property {'high' | 'medium' | 'low'} severity
 * @property {string} horizon
 */

/**
 * @typedef {Object} BoardMeetingUtterance
 * @property {string} speaker
 * @property {string} role
 * @property {string} message
 */

/**
 * @typedef {Object} GlobalMemoryEntry
 * @property {string} id
 * @property {'strategy' | 'failure' | 'customer' | 'supplier' | 'historical'} category
 * @property {string} title
 * @property {string} detail
 * @property {boolean} success
 * @property {string} occurredAt
 */

/**
 * @typedef {Object} CeoChatMessage
 * @property {string} id
 * @property {'ceo' | 'genesis'} role
 * @property {string} content
 * @property {string} occurredAt
 * @property {string[]} [actionsTaken]
 */

export {}
