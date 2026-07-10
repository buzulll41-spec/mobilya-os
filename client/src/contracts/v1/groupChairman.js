/**
 * @typedef {'AGGRESSIVE_GROWTH' | 'CONTROLLED_GROWTH' | 'MAINTAIN' | 'RESTRUCTURE' | 'DEFENSIVE' | 'CRISIS'} GroupDecision
 * @typedef {'INVEST' | 'BALANCE' | 'PROTECT' | 'CUT_COSTS'} CapitalStrategy
 * @typedef {'INVEST' | 'GROW' | 'MAINTAIN' | 'REDUCE' | 'EXIT'} CompanyChairmanDecision
 */

/**
 * @typedef {Object} CompanyDecisionDto
 * @property {string} companyId
 * @property {string} companyName
 * @property {CompanyChairmanDecision} decision
 * @property {string} reason
 */

/**
 * @typedef {Object} StrategicActionDto
 * @property {number} priority
 * @property {string} action
 * @property {'1Y' | '3Y' | '5Y'} horizon
 */

/**
 * @typedef {Object} CapitalAllocationItemDto
 * @property {string} companyId
 * @property {string} companyName
 * @property {number} percentage
 */

/**
 * @typedef {Object} AlignmentAnalysisDto
 * @property {number} ceoAlignment
 * @property {number} chairmanAlignment
 * @property {number} investorAlignment
 * @property {number} holdingAlignment
 * @property {number} overallAlignment
 * @property {string} summary
 */

/**
 * @typedef {Object} GroupChairmanSummaryDto
 * @property {number} groupChairmanScore
 * @property {string} groupChairmanScoreBand
 * @property {GroupDecision} groupDecision
 * @property {number} groupHealth
 * @property {CapitalStrategy} capitalStrategy
 * @property {number} companyCount
 * @property {number} capitalAllocationTotal
 * @property {string} generatedAt
 */

/**
 * @typedef {Object} GroupChairmanResponseDto
 * @property {GroupChairmanSummaryDto} summary
 * @property {number} groupChairmanScore
 * @property {GroupDecision} groupDecision
 * @property {number} groupHealth
 * @property {CapitalStrategy} capitalStrategy
 * @property {CompanyDecisionDto[]} companyDecisions
 * @property {string[]} oneYearPlan
 * @property {string[]} threeYearPlan
 * @property {string[]} fiveYearPlan
 * @property {string[]} groupThreats
 * @property {string[]} groupOpportunities
 * @property {StrategicActionDto[]} strategicActions
 * @property {CapitalAllocationItemDto[]} recommendedCapitalAllocation
 * @property {string[]} chairmanBriefing
 * @property {AlignmentAnalysisDto} alignmentAnalysis
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: boolean, sources: string[] }} meta
 */

export {}
