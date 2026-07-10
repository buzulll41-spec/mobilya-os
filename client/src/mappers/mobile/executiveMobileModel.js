import { addDays } from '../../data/constants.js'
import { computeDashboardKpis, formatTry } from '../../data/dashboardHelpers.js'
import { buildExecutiveCommandCenterView } from '../executive/executiveCommandCenterModel.js'
import { buildCeoLiveFeed } from '../executive/ceoExperienceModel.js'
import {
  isCollectionCritical,
  isCollectionOverdue,
} from '../collection/collectionCommandCenterModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../contracts/v1/enterpriseCommandCenter.js').EnterpriseCommandCenterResponseDto} EnterpriseCommandCenterResponseDto */
/** @typedef {import('../collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow} PendingApprovalQueueRow */
/** @typedef {import('../../contracts/v1/executiveMobileFaz116.js').ExecutiveMobileKpiIds} ExecutiveMobileKpiIds */

/**
 * @typedef {'up' | 'down' | 'flat'} ExecutiveTrendDir
 *
 * @typedef {Object} ExecutiveMobileKpi
 * @property {ExecutiveMobileKpiIds | string} id
 * @property {string} label
 * @property {string} value
 * @property {ExecutiveTrendDir} trend
 * @property {'success' | 'warning' | 'critical' | 'neutral' | 'info'} tone
 * @property {string} [navTarget]
 *
 * @typedef {Object} ExecutiveMobileAlert
 * @property {string} id
 * @property {string} title
 * @property {string} detail
 * @property {'critical' | 'warning'} tone
 * @property {string} [navTarget]
 *
 * @typedef {Object} ExecutiveMobileOpportunity
 * @property {string} id
 * @property {string} title
 * @property {string} amountLabel
 * @property {string} [navTarget]
 *
 * @typedef {Object} ExecutiveMobileTimelineItem
 * @property {string} id
 * @property {string} timeLabel
 * @property {string} message
 * @property {string} actor
 *
 * @typedef {Object} ExecutiveMobileView
 * @property {ExecutiveMobileKpi[]} kpis
 * @property {ExecutiveMobileAlert[]} criticalAlerts
 * @property {ExecutiveMobileOpportunity[]} opportunities
 * @property {string} copilotLine
 * @property {Record<'today' | 'yesterday' | 'week', ExecutiveMobileTimelineItem[]>} timeline
 * @property {PendingApprovalQueueRow[]} quickApprovals
 * @property {number} healthScore
 */

/**
 * @param {number[]} values
 * @returns {ExecutiveTrendDir}
 */
export function computeExecutiveTrend(values) {
  if (!values?.length || values.length < 2) return 'flat'
  const last = values[values.length - 1] ?? 0
  const prev = values[values.length - 2] ?? 0
  if (last > prev) return 'up'
  if (last < prev) return 'down'
  return 'flat'
}

/**
 * @param {ExecutiveTrendDir} trend
 */
export function executiveTrendArrow(trend) {
  if (trend === 'up') return '↑'
  if (trend === 'down') return '↓'
  return '→'
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   listItemDtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   shipmentPlans?: import('../../state/shipmentPlanStore.js').ShipmentPlan[]
 *   domainEvents?: import('../../contracts/v1/domainEvent.js').DomainEventDto[]
 *   todayIso: string
 *   ecc?: EnterpriseCommandCenterResponseDto | null
 *   pendingApprovals?: PendingApprovalQueueRow[]
 * }} input
 * @returns {ExecutiveMobileView}
 */
export function buildExecutiveMobileView(input) {
  const {
    orders,
    listItemDtos,
    collectionRows = orders,
    shipmentPlans = [],
    domainEvents = [],
    todayIso,
    ecc = null,
    pendingApprovals = [],
  } = input

  const eccView = buildExecutiveCommandCenterView({
    orders,
    listItemDtos,
    collectionRows,
    shipmentRowVMs: orders,
    domainEvents,
    shipmentPlans,
    todayIso,
  })

  const dashKpis = computeDashboardKpis(orders, listItemDtos, todayIso, shipmentPlans)
  const trends = eccView.operationTrends

  const openCollections = collectionRows.filter((r) => remainingBalance(r) > 0.009)
  const overdueCollections = openCollections.filter((r) => isCollectionOverdue(r, todayIso))
  const criticalCollections = openCollections.filter((r) => isCollectionCritical(r, todayIso))

  const activeOrders = orders.filter((o) => o.status !== 'Teslim Edildi')
  const pendingOrderCount = listItemDtos.filter((d) => d.displayStatus !== 'Teslim Edildi').length
  const todayShipments = activeOrders.filter((o) => o.shipmentDate === todayIso)
  const delayedShipments = dashKpis.delayedShipmentKpi ?? 0
  const pendingDelivery = dashKpis.pendingDeliveryConfirmations ?? 0

  const todayDeliverableAmount = todayShipments
    .filter((o) => ['Hazır', 'Sevke Hazır', 'Geldi'].includes(o.status ?? ''))
    .reduce((s, o) => s + remainingBalance(o), 0)

  const todayCollectibleAmount = overdueCollections.reduce((s, r) => s + remainingBalance(r), 0)

  const criticalRiskCount =
    (dashKpis.criticalRiskCount ?? 0) +
    criticalCollections.length +
    (ecc?.criticalRisks?.length ?? 0)

  const aiSuggestion =
    ecc?.todayActions?.[0]?.action ??
    ecc?.todayActions?.[0]?.title ??
    eccView.todayTasks[0]?.text ??
    'Operasyon akışı dengeli; kritik müdahale gerekmiyor.'

  /** @type {ExecutiveMobileKpi[]} */
  const kpis = [
    {
      id: 'revenue',
      label: 'Bugünkü Ciro',
      value: formatTry(dashKpis.todaySalesTotal ?? 0),
      trend: computeExecutiveTrend(trends.orders.values),
      tone: (dashKpis.todaySalesTotal ?? 0) > 0 ? 'success' : 'neutral',
      navTarget: 'orders',
    },
    {
      id: 'collection',
      label: 'Tahsilat',
      value: formatTry(dashKpis.pendingCollection ?? 0),
      trend: computeExecutiveTrend(trends.collection.values),
      tone: overdueCollections.length > 0 ? 'warning' : 'neutral',
      navTarget: 'collection',
    },
    {
      id: 'shipment',
      label: 'Sevk',
      value: String(dashKpis.todayShipments ?? 0),
      trend: computeExecutiveTrend(trends.shipment.values),
      tone: (dashKpis.todayShipments ?? 0) > 0 ? 'info' : 'neutral',
      navTarget: 'shipment-ops',
    },
    {
      id: 'pending-orders',
      label: 'Bekleyen Sipariş',
      value: String(pendingOrderCount),
      trend: computeExecutiveTrend(trends.orders.values),
      tone: pendingOrderCount > 0 ? 'warning' : 'neutral',
      navTarget: 'orders',
    },
    {
      id: 'critical-risk',
      label: 'Kritik Risk',
      value: String(criticalRiskCount),
      trend: computeExecutiveTrend(trends.ssh.values),
      tone: criticalRiskCount > 0 ? 'critical' : 'success',
      navTarget: 'executive-command-center',
    },
    {
      id: 'ai-suggestion',
      label: 'AI Önerisi',
      value: String(ecc?.todayActions?.length ?? eccView.todayTasks.length ?? 0),
      trend: 'flat',
      tone: (ecc?.todayActions?.length ?? 0) > 0 ? 'info' : 'neutral',
      navTarget: 'ceo-copilot',
    },
  ]

  /** @type {ExecutiveMobileAlert[]} */
  const criticalAlerts = []

  if (overdueCollections.length > 0) {
    criticalAlerts.push({
      id: 'alert-collection-late',
      title: 'Tahsilat gecikti',
      detail: `${overdueCollections.length} dosyada gecikmiş bakiye`,
      tone: 'critical',
      navTarget: 'collection',
    })
  }
  if (delayedShipments > 0) {
    criticalAlerts.push({
      id: 'alert-shipment-late',
      title: 'Sevk gecikti',
      detail: `${delayedShipments} sevk planı gecikmede`,
      tone: 'critical',
      navTarget: 'shipment-ops',
    })
  }
  const waitingSupply = eccView.todayStatus.find((k) => k.id === 'pending-supply')
  if (Number.parseInt(waitingSupply?.value ?? '0', 10) > 0) {
    criticalAlerts.push({
      id: 'alert-stock-critical',
      title: 'Stok kritik',
      detail: `${waitingSupply?.value} bekleyen tedarik kalemi`,
      tone: 'warning',
      navTarget: 'supply-incoming',
    })
  }
  if (pendingDelivery > 0) {
    criticalAlerts.push({
      id: 'alert-cargo-wait',
      title: 'Kargo bekliyor',
      detail: `${pendingDelivery} teslim onayı bekliyor`,
      tone: 'warning',
      navTarget: 'shipment-ops',
    })
  }

  for (const risk of (ecc?.criticalRisks ?? []).slice(0, 3)) {
    criticalAlerts.push({
      id: `ecc-risk-${risk.id}`,
      title: risk.title ?? 'Kritik risk',
      detail: risk.recommendation ?? risk.source ?? '',
      tone: risk.severity === 'CRITICAL' ? 'critical' : 'warning',
      navTarget: 'executive-command-center',
    })
  }

  for (const issue of eccView.criticalIssues.slice(0, 4)) {
    if (criticalAlerts.some((a) => a.id === issue.id)) continue
    criticalAlerts.push({
      id: issue.id,
      title: issue.title,
      detail: issue.subtitle,
      tone: issue.tone,
      navTarget: issue.navTarget ?? 'orders',
    })
  }

  /** @type {ExecutiveMobileOpportunity[]} */
  const opportunities = []

  if (todayDeliverableAmount > 0.009) {
    opportunities.push({
      id: 'opp-deliver-today',
      title: 'Bugün teslim edilirse',
      amountLabel: `+${formatTry(todayDeliverableAmount)}`,
      navTarget: 'shipment-ops',
    })
  }
  if (todayCollectibleAmount > 0.009) {
    opportunities.push({
      id: 'opp-collect-today',
      title: 'Bugün tahsil edilirse',
      amountLabel: `+${formatTry(todayCollectibleAmount)}`,
      navTarget: 'collection',
    })
  }
  for (const opp of (ecc?.opportunities ?? []).slice(0, 2)) {
    opportunities.push({
      id: `ecc-opp-${opp.id}`,
      title: opp.title ?? 'Fırsat',
      amountLabel: opp.impact != null ? `+${opp.impact} puan` : opp.recommendation ?? '—',
      navTarget: 'executive-command-center',
    })
  }

  const liveFeed = buildCeoLiveFeed(domainEvents, [], 60)
  const yesterdayIso = addDays(todayIso, -1)
  const weekStartIso = addDays(todayIso, -6)

  /** @param {typeof liveFeed[number]} item */
  function toTimelineItem(item) {
    return {
      id: item.id,
      timeLabel: item.timeLabel,
      message: item.message,
      actor: item.actor,
    }
  }

  /** @param {string} iso */
  function itemDay(iso) {
    return String(iso).slice(0, 10)
  }

  const timeline = {
    today: liveFeed.filter((i) => itemDay(i.occurredAt) === todayIso).slice(0, 12).map(toTimelineItem),
    yesterday: liveFeed.filter((i) => itemDay(i.occurredAt) === yesterdayIso).slice(0, 12).map(toTimelineItem),
    week: liveFeed
      .filter((i) => {
        const d = itemDay(i.occurredAt)
        return d >= weekStartIso && d <= todayIso
      })
      .slice(0, 15)
      .map(toTimelineItem),
  }

  const copilotLine =
    typeof aiSuggestion === 'string' && aiSuggestion.length > 120
      ? `${aiSuggestion.slice(0, 117)}…`
      : aiSuggestion

  const healthScore = ecc?.companyHealthScore ?? 0

  return {
    kpis,
    criticalAlerts: criticalAlerts.slice(0, 8),
    opportunities: opportunities.slice(0, 5),
    copilotLine,
    timeline,
    quickApprovals: pendingApprovals.slice(0, 5),
    healthScore,
  }
}

export {}
