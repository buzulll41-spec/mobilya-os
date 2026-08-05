/**
 * Veri Kalitesi Merkezi DTO'ları (backend `dataQualityDto.ts` ile eş).
 *
 * @typedef {'UNKNOWN_SOURCE' | 'MISSING_DISPLAY_FLOOR' | 'MISSING_EXTERNAL_SUPPLY_TYPE' | 'ZERO_COST' | 'SOURCE_CONFLICT'} DataQualityIssueCode
 * @typedef {'warning' | 'critical'} DataQualitySeverity
 * @typedef {'OK' | 'PROBLEM'} DataQualityStatus
 *
 * @typedef {Object} DataQualityIssueDto
 * @property {DataQualityIssueCode} code
 * @property {string} label
 * @property {DataQualitySeverity} severity
 * @property {number} penalty
 *
 * @typedef {Object} DataQualityRowDto
 * @property {string} orderLineId
 * @property {string} orderId
 * @property {string} orderDate
 * @property {string} customerName
 * @property {string} productTitle
 * @property {string | null} salesPerson
 * @property {string | null} soldSalesSourceType
 * @property {string} soldSalesSourceTypeLabel
 * @property {string | null} soldDisplayFloor
 * @property {string | null} soldDisplayFloorLabel
 * @property {string | null} soldExternalSupplyType
 * @property {string | null} soldExternalSupplyTypeLabel
 * @property {string} soldUnitCost
 * @property {number} qualityScore
 * @property {DataQualityStatus} status
 * @property {DataQualityIssueDto[]} issues
 *
 * @typedef {Object} DataQualityTotalsDto
 * @property {number} totalOrders
 * @property {number} totalRecords
 * @property {number} cleanRecords
 * @property {number} problemRecords
 * @property {number} unknownCount
 * @property {number} missingCostCount
 * @property {number} averageQualityScore
 *
 * @typedef {Object} DataQualityIssueCategoryDto
 * @property {DataQualityIssueCode} code
 * @property {string} label
 * @property {DataQualitySeverity} severity
 * @property {number} count
 *
 * @typedef {Object} DataQualityResponseDto
 * @property {DataQualityRowDto[]} rows
 * @property {DataQualityTotalsDto} totals
 * @property {DataQualityIssueCategoryDto[]} issueCategories
 * @property {Object} filters
 * @property {string} currency
 * @property {string} generatedAt
 */

export {}
