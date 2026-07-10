/**
 * Satış Kaynağı Analitiği DTO'ları (backend `salesSourceAnalyticsDto.ts` ile eş).
 *
 * @typedef {'IN_STORE' | 'EXTERNAL' | 'STOCK' | 'UNKNOWN'} SalesSourceBucketGroup
 *
 * @typedef {Object} SalesSourceAnalyticsRowDto
 * @property {string} key
 * @property {string} label
 * @property {SalesSourceBucketGroup} group
 * @property {number} salesCount
 * @property {number} orderCount
 * @property {number} unitsSold
 * @property {string} revenue
 * @property {string} purchaseCost
 * @property {string} profit
 * @property {number} profitMarginPct
 * @property {string} collected
 * @property {string} openBalance
 * @property {number} revenueSharePct
 *
 * @typedef {Object} SalesSourceAnalyticsTotalsDto
 * @property {number} salesCount
 * @property {number} orderCount
 * @property {number} unitsSold
 * @property {string} revenue
 * @property {string} purchaseCost
 * @property {string} profit
 * @property {number} profitMarginPct
 * @property {string} collected
 * @property {string} openBalance
 *
 * @typedef {Object} SalesSourceAnalyticsResponseDto
 * @property {SalesSourceAnalyticsRowDto[]} rows
 * @property {SalesSourceAnalyticsTotalsDto} totals
 * @property {Object} filters
 * @property {string} currency
 * @property {string} generatedAt
 */

export {}
