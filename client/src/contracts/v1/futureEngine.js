/**
 * Kurumsal Gelecek Motoru DTO'ları (backend `futureEngineDto.ts` ile eş).
 *
 * @typedef {'BASELINE'|'AGGRESSIVE_GROWTH'|'DEFENSIVE'|'COLLECTION_FIRST'|'EXPANSION'|'CRISIS'} FutureScenarioId
 * @typedef {'RECOMMENDED'|'NEUTRAL'|'AVOID'} ScenarioVerdict
 * @typedef {30|90|180|365} FutureHorizonDays
 *
 * @typedef {Object} FutureMetricsDto
 * @property {string} revenue
 * @property {string} profit
 * @property {string} cashFlow
 * @property {string} openBalance
 * @property {number} risk
 * @property {number} shipmentLoad
 * @property {number} staffLoad
 * @property {number} supplierRisk
 * @property {number} collectionRate
 * @property {number} companyHealth
 *
 * @typedef {Object} FutureScenarioDto
 * @property {FutureScenarioId} scenarioId
 * @property {string} scenarioName
 * @property {ScenarioVerdict} verdict
 * @property {string} verdictLabel
 * @property {string} basis
 * @property {{ days: FutureHorizonDays; metrics: FutureMetricsDto }[]} horizons
 *
 * @typedef {Object} FutureEngineResponseDto
 * @property {Object} summary
 * @property {number} futureScore
 * @property {FutureScenarioDto[]} scenarios
 * @property {FutureScenarioDto} bestScenario
 * @property {FutureScenarioDto} worstScenario
 * @property {string[]} managementBriefing
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: true; virtualOnly: true; sources: string[] }} meta
 */

export {}
