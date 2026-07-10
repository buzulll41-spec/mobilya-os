import { BusinessEngine } from '../../engine/businessEngine.js'
import { scoreOperationalDomains } from '../../engine/company-manager/PriorityEngine.js'
import { applyGoalWeightsToDomains, estimateOperationalMetrics } from '../../engine/company-brain/GoalEngineBridge.js'
import { getCompanyGoals } from '../../services/company-goals/companyGoalsStore.js'
import { getAllDomainEventsSnapshot } from '../../services/mockDomainEventStore.js'
import { buildExecutiveCommandCenterView } from '../../mappers/executive/executiveCommandCenterModel.js'
import { getGenesisSnapshot } from '../../services/genesis/GenesisEngine.js'
import { getAiCompanyStatus } from '../../services/company-brain/companyBrainStore.js'
import { getCompanyBrainDecisionLog } from '../../services/company-brain/companyBrainStore.js'
import { getCompanyManagerDailyStats } from '../../services/company-manager/companyManagerStore.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { isCollectionOverdue } from '../../mappers/collection/collectionCommandCenterModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { getAllPaymentsSnapshot } from '../../services/mockPaymentStore.js'
import { PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { moneyToNumber } from '../../mappers/moneyHelpers.js'
import { evaluateSalesFollowUp } from '../../services/aiSalesFollowUpService.js'
import { evaluateCollectionSpecialist } from '../../services/aiCollectionSpecialistService.js'
import { evaluateShipmentSpecialist } from '../../services/aiShipmentSpecialistService.js'
import { evaluateProcurementSpecialist } from '../../services/aiProcurementSpecialistService.js'

/**
 * @typedef {Object} CeoCopilotContext
 * @property {string} todayIso
 * @property {import('../../mappers/executive/executiveCommandCenterModel.js').buildExecutiveCommandCenterView extends (...args: any[]) => infer R ? R : never} ecc
 * @property {ReturnType<typeof scoreOperationalDomains>} domains
 * @property {ReturnType<typeof estimateOperationalMetrics>} metrics
 * @property {ReturnType<typeof getGenesisSnapshot>} genesis
 * @property {ReturnType<typeof getAiCompanyStatus>} aiStatus
 * @property {ReturnType<typeof getCompanyManagerDailyStats>} stats
 * @property {string} [lastIntent]
 */

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   shipmentRows?: import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]
 *   domainEvents?: import('../../contracts/v1/domainEvent.js').DomainEventDto[]
 *   todayIso: string
 *   lastIntent?: string
 * }} input
 */
export function buildCeoCopilotContext(input) {
  const {
    orders,
    dtos,
    collectionRows = [],
    shipmentRows = [],
    domainEvents = getAllDomainEventsSnapshot(),
    todayIso,
    lastIntent,
  } = input

  const snapshots = BusinessEngine.computeOrderSnapshots(orders, dtos, todayIso)
  const domains = scoreOperationalDomains({
    snapshots: [...snapshots.values()],
    domainEvents,
    todayIso,
  })
  const goals = getCompanyGoals()
  const { weightedDomains, metrics } = applyGoalWeightsToDomains(domains, goals)

  const ecc = buildExecutiveCommandCenterView({
    orders,
    listItemDtos: dtos,
    collectionRows,
    shipmentRowVMs: shipmentRows,
    domainEvents,
    todayIso,
  })

  let genesis = null
  try {
    genesis = getGenesisSnapshot()
  } catch {
    genesis = null
  }

  return {
    todayIso,
    ecc,
    domains: weightedDomains,
    metrics,
    genesis,
    aiStatus: getAiCompanyStatus(),
    stats: getCompanyManagerDailyStats(),
    lastIntent,
    goals,
    snapshots,
    collectionRows,
    orders,
    dtos,
  }
}

/**
 * @param {CeoCopilotContext & { collectionRows: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[], todayIso: string }} ctx
 */
export function buildCollectionDropAnalysis(ctx) {
  const overdue = ctx.collectionRows.filter((r) => isCollectionOverdue(r, ctx.todayIso))
  const top = [...overdue]
    .sort((a, b) => remainingBalance(b) - remainingBalance(a))
    .slice(0, 3)

  return {
    overdueCount: overdue.length,
    topCustomers: top.map((r) => ({
      name: r.customer ?? r.id,
      amount: remainingBalance(r),
    })),
  }
}

/**
 * @param {string} todayIso
 */
export function buildRevenueComparison(todayIso) {
  const payments = getAllPaymentsSnapshot()
  const today = new Date(`${todayIso}T12:00:00`)
  const thisMonth = today.getMonth()
  const thisYear = today.getFullYear()

  let thisMonthTotal = 0
  let lastMonthTotal = 0

  for (const p of payments) {
    if (p.status !== PAYMENT_TRANSACTION_STATUS.POSTED) continue
    const d = new Date(`${(p.occurredAt ?? '').slice(0, 10)}T12:00:00`)
    if (Number.isNaN(d.getTime())) continue
    const amt = moneyToNumber(p.amount)
    if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) thisMonthTotal += amt
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
    const lastYear = thisMonth === 0 ? thisYear - 1 : thisYear
    if (d.getFullYear() === lastYear && d.getMonth() === lastMonth) lastMonthTotal += amt
  }

  if (thisMonthTotal === 0 && lastMonthTotal === 0) {
    thisMonthTotal = 4_100_000
    lastMonthTotal = 4_800_000
  }

  return {
    thisMonth: thisMonthTotal,
    lastMonth: lastMonthTotal,
    delta: thisMonthTotal - lastMonthTotal,
    formattedThis: formatTry(thisMonthTotal),
    formattedLast: formatTry(lastMonthTotal),
    mainReason: 'Teslim gecikmeleri',
  }
}

/**
 * @param {'collection' | 'shipment' | 'sales' | 'procurement'} domain
 * @param {CeoCopilotContext} ctx
 */
export function buildWorkerReport(domain, ctx) {
  const stats = ctx.stats
  const ai = ctx.aiStatus
  const lastDecision = getCompanyBrainDecisionLog(1)[0]

  const evaluatorMap = {
    collection: () => evaluateCollectionSpecialist(ctx.orders ?? [], ctx.dtos ?? [], ctx.todayIso),
    shipment: () => evaluateShipmentSpecialist(ctx.orders ?? [], ctx.dtos ?? [], ctx.todayIso),
    sales: () => evaluateSalesFollowUp(ctx.orders ?? [], ctx.dtos ?? [], ctx.todayIso),
    procurement: () => evaluateProcurementSpecialist(ctx.orders ?? [], ctx.dtos ?? [], ctx.todayIso),
  }

  const assessments = evaluatorMap[domain]?.() ?? []
  let eligible = 0
  let critical = 0
  for (const result of assessments) {
    if (result?.eligible) eligible += 1
    if (result?.priority === 'CRITICAL' || result?.priority === 'HIGH') critical += 1
  }

  const domainPressure = ctx.domains?.[domain]?.pressure ?? 0
  const successRate = Math.max(0, Math.min(100, 100 - domainPressure * 12 - critical * 4))

  return {
    domain,
    tasks: eligible,
    successRate: Math.round(successRate),
    pending: ai?.pendingTasks ?? 0,
    avgMinutes: 12 + domainPressure * 3,
    lastDecision: lastDecision?.message ?? 'Henüz karar yok',
  }
}

export {}
