/**
 * Holding Yönetim Merkezi DTO'ları (backend `holdingCenterDto.ts` ile eş).
 */

/** @typedef {'EVTREND' | 'MONESKO' | 'USTANET' | 'ATLAS_CONNECT' | 'MOBILYA_OS'} HoldingCompanyId */
/** @typedef {'INVEST' | 'GROW' | 'MAINTAIN' | 'REDUCE' | 'EXIT'} HoldingDecision */

/**
 * @typedef {Object} HoldingCompanyDto
 * @property {HoldingCompanyId} id
 * @property {string} name
 * @property {string} sector
 * @property {number} companyScore
 * @property {number} companyHealth
 * @property {number} riskScore
 * @property {number} growthScore
 * @property {number} profitabilityScore
 * @property {number} revenueTl
 * @property {number} investmentRank
 */

/**
 * @typedef {Object} CapitalAllocationDto
 * @property {HoldingCompanyId} companyId
 * @property {string} companyName
 * @property {number} percentage
 */

/**
 * @typedef {Object} CompanyRankingDto
 * @property {HoldingCompanyId} companyId
 * @property {string} companyName
 * @property {number} rank
 * @property {number} score
 */

/**
 * @typedef {Object} HoldingSummaryDto
 * @property {number} holdingScore
 * @property {string} holdingScoreBand
 * @property {HoldingDecision} holdingDecision
 * @property {string} bestCompany
 * @property {string} worstCompany
 * @property {number} companyCount
 * @property {number} capitalAllocationTotal
 * @property {string} generatedAt
 */

/**
 * @typedef {Object} HoldingCenterResponseDto
 * @property {HoldingSummaryDto} summary
 * @property {number} holdingScore
 * @property {HoldingDecision} holdingDecision
 * @property {HoldingCompanyDto[]} companies
 * @property {CapitalAllocationDto[]} capitalAllocation
 * @property {CompanyRankingDto[]} growthRanking
 * @property {CompanyRankingDto[]} riskRanking
 * @property {CompanyRankingDto[]} profitabilityRanking
 * @property {CompanyRankingDto[]} investmentRanking
 * @property {string} bestCompany
 * @property {string} worstCompany
 * @property {string[]} holdingOpportunities
 * @property {string[]} holdingRisks
 * @property {string[]} holdingBriefing
 * @property {string[]} fiveYearVision
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: true, sources: string[] }} meta
 */

export {}
