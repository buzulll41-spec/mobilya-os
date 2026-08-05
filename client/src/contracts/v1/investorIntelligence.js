/**

 * Yatırımcı Merkezi DTO'ları (backend `investorIntelligenceDto.ts` ile eş).

 */



/** @typedef {'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'CRITICAL'} CompanyRating */

/** @typedef {'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID' | 'CRITICAL'} InvestmentDecision */

/** @typedef {'READY' | 'PARTIAL' | 'NOT_READY'} NewStoreReadiness */

/** @typedef {'LOW' | 'MEDIUM' | 'HIGH'} GrowthPotential */

/** @typedef {'LOW' | 'MEDIUM' | 'HIGH'} FinancingNeed */

/** @typedef {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} InvestmentRisk */

/** @typedef {'DECLINING' | 'STABLE' | 'GROWING' | 'FAST_GROWING'} ValuationTrend */



/**

 * @typedef {Object} InvestorScoreComponentsDto

 * @property {number} profitabilityScore

 * @property {number} growthScore

 * @property {number} collectionScore

 * @property {number} riskScore

 * @property {number} cashFlowScore

 * @property {number} stabilityScore

 */



/**

 * @typedef {Object} NewStoreReadinessDto

 * @property {NewStoreReadiness} status

 * @property {string[]} reasons

 */



/**

 * @typedef {Object} InvestorRecommendationDto

 * @property {string} id

 * @property {number} priority

 * @property {string} title

 * @property {string} category

 * @property {string} description

 */



/**

 * @typedef {Object} InvestorSummaryDto

 * @property {number} investorScore

 * @property {string} investorScoreBand

 * @property {CompanyRating} companyRating

 * @property {InvestmentDecision} investmentDecision

 * @property {NewStoreReadiness} newStoreReadiness

 * @property {GrowthPotential} growthPotential

 * @property {FinancingNeed} financingNeed

 * @property {InvestmentRisk} investmentRisk

 * @property {ValuationTrend} valuationTrend

 * @property {number} futureScore

 * @property {number} chairmanScore

 * @property {number} ceoScore

 * @property {number} companyHealthScore

 * @property {number} sourcesRead

 * @property {string} generatedAt

 */



/**

 * @typedef {Object} InvestorIntelligenceResponseDto

 * @property {InvestorSummaryDto} summary

 * @property {number} investorScore

 * @property {InvestorScoreComponentsDto} scoreComponents

 * @property {CompanyRating} companyRating

 * @property {InvestmentDecision} investmentDecision

 * @property {NewStoreReadinessDto} newStoreReadiness

 * @property {GrowthPotential} growthPotential

 * @property {FinancingNeed} financingNeed

 * @property {InvestmentRisk} investmentRisk

 * @property {ValuationTrend} valuationTrend

 * @property {string[]} strengths

 * @property {string[]} weaknesses

 * @property {string[]} opportunities

 * @property {string[]} threats

 * @property {string[]} investorBriefing

 * @property {InvestorRecommendationDto[]} topRecommendations

 * @property {string} today

 * @property {string} generatedAt

 * @property {{ depoKatiExcluded: true, sources: string[] }} meta

 */



export {}

