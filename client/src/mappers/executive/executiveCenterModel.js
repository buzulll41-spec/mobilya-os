import { DEMO_TODAY } from '../../data/constants.js'
import { computeDashboardKpis, formatTry } from '../../data/dashboardHelpers.js'
import { computeDashboardControlTower } from '../dashboard/computeDashboardControlTower.js'
import { buildSshMissingPartsQueue } from '../ssh/sshMissingPartsModel.js'
import { resolveProductHealthScore } from '../../features/product/productMasterCenterUi.js'
import {
  publishReadinessMissingImage,
  publishReadinessMissingVariant,
  resolvePublishReadiness,
} from '../../features/product/publishReadinessUi.js'
import { moneyToNumber } from '../moneyHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { buildOperationalAlarms } from '../../utils/operationalAlarms.js'
import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { isCollectionCritical, isCollectionOverdue } from '../collection/collectionCommandCenterModel.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { MONTH_FROM, MONTH_TO } from './executiveWarRoomModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../../contracts/v1/profitabilityAnalytics.js').ProfitabilityResponseDto} ProfitabilityResponseDto */

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const round0 = (n) => Math.round(n)

/**
 * @param {unknown} value
 */
function parseMoneyValue(value) {
  if (value == null) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'object' && value !== null && 'amount' in value) {
    return moneyToNumber(/** @type {import('../contracts/v1/money.js').Money} */ (value))
  }
  const n = Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {number} score
 * @returns {'success' | 'warning' | 'critical'}
 */
export function operationScoreTone(score) {
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'critical'
}

/**
 * @param {string} todayIso
 */
export function last7DayIsos(todayIso) {
  const base = new Date(`${todayIso}T12:00:00`)
  /** @type {string[]} */
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

/**
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} todayIso
 */
function computeOrderHealthScore(dtos, todayIso) {
  const active = dtos.filter((d) => d.displayStatus !== 'Teslim Edildi')
  if (active.length === 0) return 100
  const critical = active.filter(
    (d) =>
      d.currentRiskSeverity === RISK_SEVERITY.CRITICAL ||
      d.currentRiskSeverity === RISK_SEVERITY.HIGH,
  ).length
  const overdue = active.filter((d) => d.hasOverdueBalance || (d.dueDate && d.dueDate < todayIso)).length
  const criticalPct = critical / active.length
  const overduePct = overdue / active.length
  return round0(clamp(100 - criticalPct * 45 - overduePct * 35, 0, 100))
}

/**
 * @param {ShipmentRowVM[]} shipmentRows
 * @param {Order[]} orders
 * @param {string} todayIso
 */
function computeShipmentHealthScore(shipmentRows, orders, todayIso) {
  const activeOrders = orders.filter((o) => o.status !== 'Teslim Edildi')
  if (activeOrders.length === 0) return 100

  const overdue = activeOrders.filter(
    (o) => o.shipmentDate && o.shipmentDate < todayIso && o.status !== 'Teslim Edildi',
  ).length
  const pendingPlan = shipmentRows.filter(
    (r) =>
      r.status !== 'Teslim Edildi' &&
      (r.shipmentSummaryOpenCount ?? 0) === 0 &&
      (r.inTransitShipmentCount ?? 0) === 0,
  ).length

  const overduePct = overdue / activeOrders.length
  const pendingPct = pendingPlan / Math.max(shipmentRows.length, 1)
  return round0(clamp(100 - overduePct * 50 - pendingPct * 25, 0, 100))
}

/**
 * @param {CollectionRowVM[]} collectionRows
 * @param {Order[]} orders
 * @param {string} todayIso
 * @param {ProfitabilityResponseDto | null | undefined} profitability
 */
function computeCollectionHealthScore(collectionRows, orders, todayIso, profitability) {
  const collected = parseMoneyValue(profitability?.totals?.collected)
  const open = parseMoneyValue(profitability?.totals?.openBalance)
  if (collected + open > 0) {
    const ratio = collected / (collected + open)
    const overdue = collectionRows.filter((r) => isCollectionOverdue(r, todayIso)).length
    const overduePct = collectionRows.length > 0 ? overdue / collectionRows.length : 0
    return round0(clamp(ratio * 100 - overduePct * 25, 0, 100))
  }

  const active = orders.filter((o) => o.status !== 'Teslim Edildi')
  const openBalance = active.reduce((s, o) => s + remainingBalance(o), 0)
  const totalVolume = active.reduce((s, o) => s + (o.totalAmount ?? o.amount ?? 0), 0)
  const collectedFromOrders = Math.max(0, totalVolume - openBalance)
  const ratio = totalVolume > 0 ? collectedFromOrders / totalVolume : 1

  const critical = collectionRows.filter((r) => isCollectionCritical(r, todayIso)).length
  const criticalPct = collectionRows.length > 0 ? critical / collectionRows.length : 0

  const ratioScore = round0(ratio * 100)
  const criticalPenalty = round0(criticalPct * 40)
  return round0(clamp(ratioScore - criticalPenalty, 0, 100))
}

/**
 * @param {ReturnType<typeof buildSshMissingPartsQueue>} sshQueue
 */
function computeSshHealthScore(sshQueue) {
  if (sshQueue.length === 0) return 100
  const open = sshQueue.filter((c) => c.locksShipment !== false).length
  const critical = sshQueue.filter((c) => c.locksShipment).length
  const openPct = open / sshQueue.length
  const criticalPct = critical / sshQueue.length
  return round0(clamp(100 - openPct * 35 - criticalPct * 40, 0, 100))
}

/**
 * @param {ProductMasterCenterRowVm[]} products
 */
function computeProductHealthAverage(products) {
  if (products.length === 0) return 0
  const sum = products.reduce((s, p) => s + resolveProductHealthScore(p).score, 0)
  return round0(sum / products.length)
}

/**
 * @param {ProductMasterCenterRowVm[]} products
 */
function computePublishReadinessAverage(products) {
  if (products.length === 0) return 0
  const sum = products.reduce((s, p) => s + resolvePublishReadiness(p).score, 0)
  return round0(sum / products.length)
}

/**
 * @param {{
 *   listItemDtos: SalesOrderListItemDto[]
 *   orders: Order[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentRowVMs: ShipmentRowVM[]
 *   sshQueue: ReturnType<typeof buildSshMissingPartsQueue>
 *   productItems: ProductMasterCenterRowVm[]
 *   profitability?: ProfitabilityResponseDto | null
 *   todayIso: string
 * }} params
 */
export function computeGeneralOperationScoreBundle(params) {
  const {
    listItemDtos,
    orders,
    collectionRows,
    shipmentRowVMs,
    sshQueue,
    productItems,
    profitability = null,
    todayIso,
  } = params

  const productHealthAvg = computeProductHealthAverage(productItems)
  const publishAvg = computePublishReadinessAverage(productItems)

  const operationScores = {
    orders: computeOrderHealthScore(listItemDtos, todayIso),
    shipment: computeShipmentHealthScore(shipmentRowVMs, orders, todayIso),
    collection: computeCollectionHealthScore(collectionRows, orders, todayIso, profitability),
    ssh: computeSshHealthScore(sshQueue),
    productHealth: productHealthAvg,
    publishReadiness: publishAvg,
  }

  const generalScore = round0(
    (operationScores.orders +
      operationScores.shipment +
      operationScores.collection +
      operationScores.ssh +
      operationScores.productHealth +
      operationScores.publishReadiness) /
      6,
  )

  return { generalScore, operationScores }
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentRowVMs: ShipmentRowVM[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 *   productItems: ProductMasterCenterRowVm[]
 *   profitability?: ProfitabilityResponseDto | null
 *   todayIso?: string
 *   domainEvents?: import('../../contracts/v1/domainEvent.js').DomainEventDto[]
 *   operationalTasks?: import('../../contracts/v1/task.js').TaskDto[]
 * }} input
 */
export function buildExecutiveCenterView(input) {
  const {
    orders,
    listItemDtos,
    collectionRows,
    shipmentRowVMs,
    missingItems = [],
    productItems,
    profitability = null,
    todayIso = DEMO_TODAY,
    domainEvents = [],
    operationalTasks = [],
  } = input

  const kpis = computeDashboardKpis(orders, listItemDtos, todayIso)
  const operationalAlarms = buildOperationalAlarms(orders, listItemDtos, todayIso)
  const shipmentQueue = shipmentRowVMs.length > 0 ? shipmentRowVMs : orders
  const controlTower = computeDashboardControlTower({
    orders,
    listItemDtos,
    todayIso,
    kpis,
    operationalAlarms,
    domainEvents,
    shipmentQueue,
    operationalTasks,
  })

  const sshQueue = buildSshMissingPartsQueue({
    orders,
    listItemDtos,
    missingItems,
    todayIso,
  })

  const monthRevenueFromApi = parseMoneyValue(profitability?.totals?.revenue ?? profitability?.totals?.grossProfit)
  const monthPrefix = todayIso.slice(0, 7)
  const monthRevenueFromOrders = listItemDtos
    .filter((d) => (d.placedAt ?? '').slice(0, 7) === monthPrefix)
    .reduce((s, d) => s + moneyToNumber(d.totalAmount), 0)
  const monthRevenueNum = monthRevenueFromApi > 0 ? monthRevenueFromApi : monthRevenueFromOrders

  const publishReadyCount = productItems.filter((p) => resolvePublishReadiness(p).isReadyToPublish).length
  const { generalScore, operationScores } = computeGeneralOperationScoreBundle({
    listItemDtos,
    orders,
    collectionRows,
    shipmentRowVMs,
    sshQueue,
    productItems,
    profitability,
    todayIso,
  })
  const productHealthAvg = operationScores.productHealth
  const publishAvg = operationScores.publishReadiness

  const openOrders = listItemDtos.filter((d) => d.displayStatus !== 'Teslim Edildi').length
  const pendingShipments = kpis.pendingShipmentCount ?? 0
  const criticalCollections = collectionRows.filter((r) => isCollectionCritical(r, todayIso)).length
  const openSsh = sshQueue.filter((c) => c.locksShipment !== false).length

  const missingImageCount = productItems.filter((p) => publishReadinessMissingImage(p)).length
  const missingVariantCount = productItems.filter((p) => publishReadinessMissingVariant(p)).length
  const overdueShipments = orders.filter(
    (o) => o.shipmentDate && o.shipmentDate < todayIso && o.status !== 'Teslim Edildi',
  ).length
  const overdueCollections = collectionRows.filter((r) => isCollectionOverdue(r, todayIso)).length

  const operationScoresSnapshot = operationScores

  /** @type {{ id: string, tone: 'critical' | 'warning', text: string, navTarget?: string }[]} */
  const urgentActions = []
  if (criticalCollections > 0) {
    urgentActions.push({
      id: 'critical-collection',
      tone: 'critical',
      text: `${criticalCollections} kritik tahsilat dosyası`,
      navTarget: 'collection',
    })
  }
  if (overdueShipments > 0) {
    urgentActions.push({
      id: 'overdue-shipment',
      tone: 'critical',
      text: `${overdueShipments} sevk gecikmiş`,
      navTarget: 'shipment-ops',
    })
  }
  if (missingImageCount > 0) {
    urgentActions.push({
      id: 'missing-image',
      tone: 'warning',
      text: `${missingImageCount} ürün eksik görsel`,
      navTarget: 'product-publish-readiness',
    })
  }
  if (missingVariantCount > 0) {
    urgentActions.push({
      id: 'missing-variant',
      tone: 'warning',
      text: `${missingVariantCount} ürün eksik varyant`,
      navTarget: 'product-publish-readiness',
    })
  }
  if (openSsh > 0 && !urgentActions.some((a) => a.id === 'open-ssh')) {
    urgentActions.push({
      id: 'open-ssh',
      tone: overdueShipments > 0 ? 'warning' : 'critical',
      text: `${openSsh} açık SSH kaydı`,
      navTarget: 'ssh-service',
    })
  }

  const todayTasks = {
    shipments: controlTower.actionLists.pendingShipments.slice(0, 8),
    callCustomers: collectionRows
      .filter((r) => isCollectionOverdue(r, todayIso) || isCollectionCritical(r, todayIso))
      .slice(0, 8)
      .map((r) => ({
        orderId: r.id,
        customer: r.customer ?? r.id,
        statusLabel: isCollectionOverdue(r, todayIso) ? 'Gecikmiş tahsilat' : 'Kritik dosya',
        dateLabel: r.dueDate ?? '—',
        actionLabel: 'Ara',
        openKind: /** @type {const} */ ('order'),
      })),
    sshCritical: sshQueue
      .filter((c) => c.locksShipment)
      .slice(0, 8)
      .map((c) => ({
        orderId: c.orderId,
        customer: c.customer,
        statusLabel: c.partTitle ?? 'SSH kaydı',
        dateLabel: c.headerSummary?.split(' · ')[2] ?? 'Açık',
        actionLabel: 'SSH aç',
        openKind: /** @type {const} */ ('service'),
      })),
    overdueCollections: collectionRows
      .filter((r) => isCollectionOverdue(r, todayIso))
      .slice(0, 8)
      .map((r) => ({
        orderId: r.id,
        customer: r.customer ?? r.id,
        statusLabel: 'Geciken tahsilat',
        dateLabel: formatTry(remainingBalance(r)),
        actionLabel: 'Tahsilat',
        openKind: /** @type {const} */ ('order'),
      })),
  }

  const trendDays = last7DayIsos(todayIso)
  const dayLabels = trendDays.map((d) => {
    const dt = new Date(`${d}T12:00:00`)
    return dt.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' })
  })

  const trend = {
    labels: dayLabels,
    revenue: trendDays.map((day) =>
      listItemDtos
        .filter((d) => (d.placedAt ?? '').slice(0, 10) === day)
        .reduce((s, d) => s + moneyToNumber(d.totalAmount), 0),
    ),
    orders: trendDays.map(
      (day) => listItemDtos.filter((d) => (d.placedAt ?? '').slice(0, 10) === day).length,
    ),
    collections: trendDays.map((day) =>
      domainEvents.filter(
        (e) => e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED && e.occurredAt.slice(0, 10) === day,
      ).length,
    ),
    shipments: trendDays.map(
      (day) => orders.filter((o) => o.shipmentDate === day).length,
    ),
  }

  const kpiStrip = [
    {
      id: 'today-revenue',
      label: 'Bugünkü Ciro',
      value: formatTry(kpis.todaySalesTotal ?? 0),
      valueTone: (kpis.todaySalesTotal ?? 0) > 0 ? 'success' : 'neutral',
    },
    {
      id: 'month-revenue',
      label: 'Bu Ay Ciro',
      value: formatTry(monthRevenueNum),
      valueTone: monthRevenueNum > 0 ? 'success' : 'neutral',
    },
    {
      id: 'open-orders',
      label: 'Açık Sipariş',
      value: String(openOrders),
      valueTone: openOrders > 20 ? 'warning' : 'neutral',
    },
    {
      id: 'pending-ship',
      label: 'Sevk Bekleyen',
      value: String(pendingShipments),
      valueTone: pendingShipments > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'critical-collection',
      label: 'Kritik Tahsilat',
      value: String(criticalCollections),
      valueTone: criticalCollections > 0 ? 'critical' : 'neutral',
    },
    {
      id: 'open-ssh',
      label: 'Açık SSH',
      value: String(openSsh),
      valueTone: openSsh > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'publish-ready',
      label: 'Yayına Hazır Ürün',
      value: String(publishReadyCount),
      valueTone: publishReadyCount > 0 ? 'success' : 'neutral',
    },
    {
      id: 'product-health-avg',
      label: 'Ürün Sağlık Ort.',
      value: `${productHealthAvg}`,
      valueTone: operationScoreTone(productHealthAvg),
    },
  ]

  return {
    todayIso,
    monthWindow: { from: MONTH_FROM, to: MONTH_TO },
    kpiStrip,
    urgentActions,
    operationScores: operationScoresSnapshot,
    generalScore,
    generalTone: operationScoreTone(generalScore),
    todayTasks,
    trend,
    counts: {
      totalProducts: productItems.length,
      publishReady: publishReadyCount,
      publishNotReady: productItems.length - publishReadyCount,
      overdueCollections,
    },
  }
}

export { MONTH_FROM, MONTH_TO }
