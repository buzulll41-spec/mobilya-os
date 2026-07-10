/**
 * Kârlılık Analitiği DTO'ları (backend `profitabilityAnalyticsDto.ts` ile eş).
 *
 * @typedef {'source'|'salesPerson'|'supplier'|'category'|'brand'|'product'|'month'|'year'} ProfitabilityGroupBy
 * @typedef {'NONE'|'MEDIUM'|'HIGH'} ProfitabilityRiskLevel
 *
 * @typedef {Object} ProfitabilityRowDto
 * @property {string} key
 * @property {string} label
 * @property {ProfitabilityGroupBy} groupBy
 * @property {number} salesCount
 * @property {number} orderCount
 * @property {number} unitsSold
 * @property {string} revenue
 * @property {string} purchaseCost
 * @property {string} grossProfit
 * @property {number} profitMarginPct
 * @property {string} collected
 * @property {string} openBalance
 * @property {string} riskyReceivable
 * @property {string} realizedProfit
 * @property {string} pendingProfit
 * @property {number} revenueSharePct
 * @property {number} profitSharePct
 * @property {Object} detail
 *
 * @typedef {Object} ProfitabilityResponseDto
 * @property {ProfitabilityGroupBy} groupBy
 * @property {ProfitabilityRowDto[]} rows
 * @property {Object} summary
 * @property {Object} totals
 * @property {Object} breakdowns
 * @property {Object} filters
 * @property {string} currency
 * @property {string} generatedAt
 */

export {}
