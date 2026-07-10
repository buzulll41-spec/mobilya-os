/**
 * AI Operasyon Danışmanı DTO'ları (backend `operationsAdvisorDto.ts` ile eş).
 * Tavsiyeler kural tabanlı/deterministiktir; her tavsiye sorun-neden-etki-öneri
 * yapısını ve sayısal `evidence` dayanağını taşır.
 *
 * @typedef {'INFO'|'WARNING'|'CRITICAL'} AdvisorySeverity
 * @typedef {'PROFITABILITY'|'COLLECTION'|'SHIPMENT'|'DATA_QUALITY'|'RISK'|'SALES'|'SUPPLIER'|'OPERATIONS'} AdvisoryCategory
 *
 * @typedef {Object} AdvisoryDto
 * @property {string} id
 * @property {AdvisorySeverity} severity
 * @property {AdvisoryCategory} category
 * @property {string} title
 * @property {string} reason
 * @property {string} impact
 * @property {string} recommendation
 * @property {Record<string, string|number|boolean|null>} evidence
 * @property {string} createdAt
 *
 * @typedef {Object} OperationsAdvisorResponseDto
 * @property {Object} summary
 * @property {AdvisoryDto[]} advisories
 * @property {Object} filters
 * @property {string} currency
 * @property {string} today
 * @property {string} generatedAt
 */

export {}
