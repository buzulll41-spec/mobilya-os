/**
 * Otonom CEO DTO'ları (backend `ceoIntelligenceDto.ts` ile eş).
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 *
 * @typedef {'FOCUS_COLLECTION'|'FOCUS_GROWTH'|'FOCUS_PROFITABILITY'|'FOCUS_OPERATIONS'|'FOCUS_RISK_REDUCTION'|'OPEN_NEW_STORE'|'DELAY_NEW_STORE'|'HIRE_SALES_TEAM'|'INCREASE_CAPACITY'|'OPTIMIZE_SUPPLIERS'} CeoDecision
 *
 * @typedef {Object} CeoProblemItemDto
 * @property {string} id
 * @property {string} title
 * @property {'CRITICAL'|'WARNING'|'INFO'} severity
 * @property {string} description
 *
 * @typedef {Object} CeoOpportunityItemDto
 * @property {string} id
 * @property {string} title
 * @property {string} impact
 * @property {string} description
 *
 * @typedef {Object} CeoIntelligenceSummaryDto
 * @property {number} ceoScore
 * @property {string} ceoScoreBand
 * @property {CeoDecision} ceoDecision
 * @property {number} companyHealthScore
 * @property {number} boardScore
 * @property {string} boardDecision
 * @property {number} sourcesRead
 * @property {string} generatedAt
 *
 * @typedef {Object} CeoIntelligenceResponseDto
 * @property {CeoIntelligenceSummaryDto} summary
 * @property {number} ceoScore
 * @property {CeoDecision} ceoDecision
 * @property {string[]} ceoReason
 * @property {CeoProblemItemDto[]} topProblems
 * @property {CeoOpportunityItemDto[]} topOpportunities
 * @property {string[]} todayActions
 * @property {string[]} next30Days
 * @property {string[]} next90Days
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: true; sources: string[] }} meta
 */

export {}
