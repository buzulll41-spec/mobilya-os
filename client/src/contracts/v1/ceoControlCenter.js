/**

 * CEO Kontrol Merkezi DTO'ları (backend `ceoControlCenterDto.ts` ile eş).

 *

 * @typedef {Object} ManagerScoreDto

 * @property {number} score

 * @property {string} band

 * @property {string} bandLabel

 * @property {Object} components

 *

 * @typedef {Object} DailyBriefingDto

 * @property {string} headline

 * @property {string[]} paragraphs

 * @property {Object[]} highlights

 *

 * @typedef {Object} CeoFinancePanelDto

 * @property {string} monthRevenue

 * @property {string} monthGrossProfit

 * @property {number} profitMarginPct

 * @property {string} collected

 * @property {string} openBalance

 * @property {string} riskyReceivable

 * @property {string} realizedProfit

 * @property {string} pendingProfit

 * @property {string} projectedRevenue

 * @property {string} projectedGrossProfit

 * @property {number} targetAchievementPct

 *

 * @typedef {Object} CeoOperationsHealthDto

 * @property {number} ordersToday

 * @property {string} collectionToday

 * @property {number} readyToShipToday

 * @property {number} delayedShipments

 * @property {number} pendingShipmentCount

 * @property {number} criticalRiskOrders

 * @property {number} openCases

 * @property {number} p1Cases

 * @property {number} openActions

 * @property {number} p1Actions

 *

 * @typedef {Object} CeoPeopleRiskPanelDto

 * @property {Object | null} topSalesPerson

 * @property {Object | null} bottomSalesPerson

 * @property {Object | null} riskiestSource

 * @property {Object | null} highestOpenBalanceSource

 * @property {Object[]} staffForecast

 * @property {number} criticalOrdersCount

 *

 * @typedef {Object} CeoAutomationPanelDto

 * @property {number} totalJobs

 * @property {number} waitingApproval

 * @property {number} readyToRun

 * @property {number} completed

 * @property {number} cancelled

 * @property {Object[]} topJobs

 *

 * @typedef {Object} CeoAlertDto

 * @property {string} id

 * @property {string} source

 * @property {string} severity

 * @property {string} title

 * @property {string} message

 * @property {string | null} category

 *

 * @typedef {Object} CeoControlCenterResponseDto

 * @property {ManagerScoreDto} managerScore

 * @property {DailyBriefingDto} dailyBriefing

 * @property {CeoFinancePanelDto} finance

 * @property {CeoOperationsHealthDto} operationsHealth

 * @property {CeoPeopleRiskPanelDto} peopleRisk

 * @property {CeoAutomationPanelDto} automation

 * @property {CeoAlertDto[]} topAlerts

 * @property {string} currency

 * @property {string} today

 * @property {string} generatedAt

 */



export {}


