/**
 * Otonom Şirket Başkanı DTO'ları (backend `chairmanDto.ts` ile eş).
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 *
 * @typedef {'MAINTAIN_DIRECTION'|'FOCUS_GROWTH'|'FOCUS_PROFITABILITY'|'FOCUS_COLLECTION'|'FOCUS_DIGITALIZATION'|'FOCUS_EXPANSION'|'PREPARE_NEW_BRANCH'|'STABILIZE_FIRST'} ChairmanDecision
 * @typedef {'ALIGNED'|'PARTIAL'|'MISALIGNED'} AlignmentStatus
 *
 * @typedef {Object} ChairmanThreatItemDto
 * @property {string} id
 * @property {string} title
 * @property {'CRITICAL'|'WARNING'|'INFO'} severity
 * @property {'1Y'|'3Y'|'5Y'} horizon
 * @property {string} description
 *
 * @typedef {Object} ChairmanOpportunityItemDto
 * @property {string} id
 * @property {string} title
 * @property {string} impact
 * @property {'1Y'|'3Y'|'5Y'} horizon
 * @property {string} description
 *
 * @typedef {Object} AlignmentDto
 * @property {number} score
 * @property {AlignmentStatus} status
 * @property {string} summary
 * @property {string[]} details
 *
 * @typedef {Object} ChairmanSummaryDto
 * @property {number} chairmanScore
 * @property {string} chairmanScoreBand
 * @property {ChairmanDecision} chairmanDecision
 * @property {number} ceoScore
 * @property {number} boardScore
 * @property {number} companyHealthScore
 * @property {number} sourcesRead
 * @property {string} generatedAt
 *
 * @typedef {Object} ChairmanIntelligenceResponseDto
 * @property {ChairmanSummaryDto} summary
 * @property {number} chairmanScore
 * @property {ChairmanDecision} chairmanDecision
 * @property {string[]} chairmanReason
 * @property {string[]} oneYearPlan
 * @property {string[]} threeYearPlan
 * @property {string[]} fiveYearVision
 * @property {ChairmanThreatItemDto[]} topThreats
 * @property {ChairmanOpportunityItemDto[]} topOpportunities
 * @property {AlignmentDto} boardAlignment
 * @property {AlignmentDto} ceoAlignment
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: true; sources: string[] }} meta
 */

export {}
