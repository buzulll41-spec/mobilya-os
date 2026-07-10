/**
 * @typedef {'COLLECTION_FIRST' | 'AGGRESSIVE_GROWTH' | 'CONTROLLED_GROWTH' | 'DEFENSIVE_MODE' | 'STORE_EXPANSION' | 'SUPPLIER_RESTRUCTURE' | 'COST_REDUCTION' | 'PROFITABILITY_RECOVERY' | 'INVESTMENT_WINDOW' | 'WAIT_AND_MONITOR'} PrimaryDecision
 */

/**
 * @typedef {Object} BusinessBrainResponseDto
 * @property {number} brainScore
 * @property {number} operationsScore
 * @property {number} financeScore
 * @property {number} growthScore
 * @property {number} riskScore
 * @property {number} futureScore
 * @property {number} investmentScore
 * @property {PrimaryDecision} primaryDecision
 * @property {string[]} todayActions
 * @property {string[]} plan30Days
 * @property {string[]} plan90Days
 * @property {string[]} plan365Days
 * @property {string[]} topRisks
 * @property {string[]} topOpportunities
 * @property {string[]} managementBriefing
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: boolean, sources: string[] }} meta
 */

export {}
