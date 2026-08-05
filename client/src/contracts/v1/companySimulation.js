/**
 * Otonom Şirket Simülasyonu DTO'ları (backend `companySimulationDto.ts` ile eş).
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 *
 * @typedef {'COLLECTION_DROP'|'NEW_STORE'|'NEW_SALES_STAFF'|'NEW_VEHICLE'|'EXTERNAL_SUPPLY_INCREASE'|'BEST_CASE'|'WORST_CASE'} SimulationScenarioId
 *
 * @typedef {Object} SimulationInputDto
 * @property {number} [collectionChangePercent]
 * @property {number} [newStoreRevenue]
 * @property {number} [additionalSalesStaff]
 * @property {number} [additionalVehicles]
 * @property {number} [externalSupplyIncreasePercent]
 *
 * @typedef {Object} SimulationSnapshotDto
 * @property {number} companyHealthScore
 * @property {string} companyHealthBand
 * @property {number} riskScore
 * @property {string} revenue
 * @property {string} profit
 * @property {string} openBalance
 * @property {string} riskyReceivable
 * @property {number} delayedShipments
 * @property {number} dataQualityScore
 *
 * @typedef {Object} ScenarioResultDto
 * @property {SimulationScenarioId} scenarioId
 * @property {string} scenarioName
 * @property {SimulationSnapshotDto} before
 * @property {SimulationSnapshotDto} after
 * @property {string} recommendation
 * @property {string} basis
 *
 * @typedef {Object} CompanySimulationSummaryDto
 * @property {number} baselineHealthScore
 * @property {number} scenarioCount
 * @property {number} bestCaseHealthAfter
 * @property {number} worstCaseHealthAfter
 * @property {string|null} lastRunAt
 *
 * @typedef {Object} CompanySimulationResponseDto
 * @property {CompanySimulationSummaryDto} summary
 * @property {SimulationSnapshotDto} baseline
 * @property {ScenarioResultDto[]} scenarios
 * @property {ScenarioResultDto} bestCase
 * @property {ScenarioResultDto} worstCase
 * @property {string} managementAdvice
 * @property {SimulationInputDto} input
 * @property {string} today
 * @property {string} generatedAt
 * @property {{ depoKatiExcluded: true; virtualOnly: true }} meta
 */

export {}
