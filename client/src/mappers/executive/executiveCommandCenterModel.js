import { DEMO_TODAY } from '../../data/constants.js'
import { computeDashboardKpis, formatTry } from '../../data/dashboardHelpers.js'
import { PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { buildOperationalAlarms } from '../../utils/operationalAlarms.js'
import { buildSshMissingPartsQueue } from '../ssh/sshMissingPartsModel.js'
import { isCollectionCritical, isCollectionOverdue } from '../collection/collectionCommandCenterModel.js'
import { summarizeLineSupply } from '../operation-map/operationMapModel.js'
import { moneyToNumber } from '../moneyHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { getAllPaymentsSnapshot } from '../../services/mockPaymentStore.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'
import { relativeTimeLabelTr } from '../timeline/relativeTimeLabelTr.js'
import { getOrderLinesForSalesOrder } from '../../services/mockOrderLineStore.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import { evaluateSalesFollowUp } from '../../services/aiSalesFollowUpService.js'
import { evaluateCollectionSpecialist } from '../../services/aiCollectionSpecialistService.js'
import { evaluateShipmentSpecialist } from '../../services/aiShipmentSpecialistService.js'
import { evaluateProcurementSpecialist } from '../../services/aiProcurementSpecialistService.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../../constants/supplyOrderStatus.js'
import { PAYMENT_TRANSACTION_KIND } from '../../contracts/v1/enums.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterDto} SupplierLedgerCenterDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

const LIVE_FEED_TYPES = new Set([
  DOMAIN_EVENT_TYPE.ORDER_PLACED,
  DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
  DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED,
  DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED,
  DOMAIN_EVENT_TYPE.SHIPMENT_LOADED,
  DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED,
  DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT,
  DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
])

/**
 * @param {string} todayIso
 * @param {number} days
 */
export function lastNDayIsos(todayIso, days = 30) {
  const base = new Date(`${todayIso}T12:00:00`)
  /** @type {string[]} */
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(base.getDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/**
 * @param {string[]} days
 */
function compactDayLabels(days) {
  return days.map((d, i) => {
    if (i === days.length - 1) return 'Bugün'
    if (i % 5 !== 0 && i !== 0) return ''
    const dt = new Date(`${d}T12:00:00`)
    return dt.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
  })
}

/**
 * @param {import('../../contracts/v1/payment.js').PaymentTransactionDto[]} payments
 * @param {string} dayIso
 */
function sumPostedPaymentsOnDay(payments, dayIso) {
  return payments
    .filter(
      (p) =>
        p.status === PAYMENT_TRANSACTION_STATUS.POSTED &&
        (p.occurredAt ?? '').slice(0, 10) === dayIso,
    )
    .reduce((s, p) => s + moneyToNumber(p.amount), 0)
}

/**
 * @param {Order[]} orders
 */
function countPendingSupplyLines(orders) {
  let pending = 0
  for (const o of orders) {
    if (o.status === 'Teslim Edildi') continue
    const summary = summarizeLineSupply(o.id)
    if (!summary) {
      if (['Bekleniyor', 'Üretimde', 'Kısmi Geldi'].includes(o.status ?? '')) pending += 1
      continue
    }
    const lines = getOrderLinesForSalesOrder(o.id)
    pending += lines.filter(
      (l) =>
        (l.supplyStatus ?? SUPPLY_STATUS.NOT_SENT) !== SUPPLY_STATUS.SENT ||
        (l.warehouseEntryStatus ?? WAREHOUSE_ENTRY_STATUS.NOT_SENT) === WAREHOUSE_ENTRY_STATUS.WAITING,
    ).length
  }
  return pending
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order | undefined} order
 */
function countWaitingProducts(dto, order) {
  const summary = summarizeLineSupply(dto.id)
  if (summary?.anyWaiting) {
    const lines = getOrderLinesForSalesOrder(dto.id)
    return lines.filter(
      (l) =>
        (l.supplyStatus ?? SUPPLY_STATUS.NOT_SENT) === SUPPLY_STATUS.SENT &&
        (l.warehouseEntryStatus ?? WAREHOUSE_ENTRY_STATUS.NOT_SENT) === WAREHOUSE_ENTRY_STATUS.WAITING,
    ).length
  }
  if (order && ['Bekleniyor', 'Üretimde'].includes(order.status ?? '')) return 1
  return 0
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentRowVMs: ShipmentRowVM[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 *   domainEvents?: DomainEventDto[]
 *   shipmentPlans?: ShipmentPlan[]
 *   supplierLedger?: SupplierLedgerCenterDto | null
 *   todayIso?: string
 * }} input
 */
export function buildExecutiveCommandCenterView(input) {
  const {
    orders,
    listItemDtos,
    collectionRows,
    shipmentRowVMs,
    missingItems = [],
    domainEvents = [],
    shipmentPlans = [],
    supplierLedger = null,
    todayIso = DEMO_TODAY,
  } = input

  const orderById = new Map(orders.map((o) => [o.id, o]))
  const kpis = computeDashboardKpis(orders, listItemDtos, todayIso, shipmentPlans)
  const payments = getAllPaymentsSnapshot()
  const operationalAlarms = buildOperationalAlarms(orders, listItemDtos, todayIso)
  const sshQueue = buildSshMissingPartsQueue({ orders, listItemDtos, missingItems, todayIso })

  const todayCollection = sumPostedPaymentsOnDay(payments, todayIso)
  const todayPaymentOut = payments
    .filter(
      (p) =>
        p.status === PAYMENT_TRANSACTION_STATUS.POSTED &&
        (p.occurredAt ?? '').slice(0, 10) === todayIso &&
        (p.kind === PAYMENT_TRANSACTION_KIND.REFUND || p.kind === PAYMENT_TRANSACTION_KIND.ADJUSTMENT),
    )
    .reduce((s, p) => s + moneyToNumber(p.amount), 0)
  const cashFlow = todayCollection - todayPaymentOut

  const openOrders = listItemDtos.filter((d) => d.displayStatus !== 'Teslim Edildi').length
  const delayedShipments = kpis.delayedShipmentKpi ?? 0
  const pendingSupply = countPendingSupplyLines(orders)
  const criticalSuppliers = (supplierLedger?.suppliers ?? []).filter(
    (s) => s.healthStatus === 'CRITICAL' || s.healthStatus === 'WARNING',
  ).length
  const criticalSsh = sshQueue.filter((c) => c.locksShipment !== false).length

  /** @type {{ id: string, label: string, value: string, tone?: string, navTarget?: string }[]} */
  const todayStatus = [
    { id: 'revenue', label: 'Bugünkü Ciro', value: formatTry(kpis.todaySalesTotal ?? 0), tone: 'sales', navTarget: 'orders' },
    { id: 'collection', label: 'Bugünkü Tahsilat', value: formatTry(todayCollection), tone: 'collect', navTarget: 'collection' },
    { id: 'payment', label: 'Bugünkü Ödeme', value: formatTry(todayPaymentOut), tone: 'neutral', navTarget: 'supply-incoming' },
    {
      id: 'cashflow',
      label: 'Nakit Akışı',
      value: formatTry(cashFlow),
      tone: cashFlow >= 0 ? 'success' : 'critical',
      navTarget: 'ceo-control-center',
    },
    { id: 'open-orders', label: 'Açık Sipariş', value: String(openOrders), tone: openOrders > 0 ? 'info' : 'neutral', navTarget: 'orders' },
    { id: 'today-ship', label: 'Bugünkü Sevk', value: String(kpis.todayShipments ?? 0), tone: 'ship', navTarget: 'shipment-ops' },
    { id: 'delayed-ship', label: 'Geciken Sevk', value: String(delayedShipments), tone: delayedShipments > 0 ? 'critical' : 'neutral', navTarget: 'shipment-ops' },
    { id: 'pending-supply', label: 'Bekleyen Tedarik', value: String(pendingSupply), tone: pendingSupply > 0 ? 'warning' : 'neutral', navTarget: 'supply-incoming' },
    { id: 'critical-supplier', label: 'Kritik Cari', value: String(criticalSuppliers), tone: criticalSuppliers > 0 ? 'critical' : 'neutral', navTarget: 'supply-incoming' },
    { id: 'critical-ssh', label: 'Kritik SSH', value: String(criticalSsh), tone: criticalSsh > 0 ? 'critical' : 'neutral', navTarget: 'ssh-service' },
  ]

  const engineSnapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)

  /** @type {{ id: string, title: string, subtitle: string, rank: number, tone: 'critical' | 'warning', navTarget?: string, workerId?: string }[]} */
  const criticalIssues = []

  for (const dto of listItemDtos) {
    if (dto.displayStatus === 'Teslim Edildi') continue
    const snap = engineSnapshots.get(dto.id)
    if (!snap) continue
    const order = orderById.get(dto.id)
    const rem = moneyToNumber(dto.remainingAmount ?? dto.amountDue)
    const waitingProducts = countWaitingProducts(dto, order)
    const isHighPriority =
      snap.priority === 'CRITICAL' || snap.priority === 'HIGH'

    if (isHighPriority || rem >= 100_000 || waitingProducts >= 2) {
      let subtitle = snap.nextAction.replace(/\.$/, '')
      if (waitingProducts > 0) subtitle = `${waitingProducts} ürün bekleniyor`
      else if (rem >= 100_000) subtitle = `${formatTry(rem)} açık bakiye`
      else subtitle = snap.currentStageLabel

      criticalIssues.push({
        id: `order:${dto.id}`,
        title: dto.customerDisplayName ?? dto.id,
        subtitle,
        rank:
          rem +
          waitingProducts * 50_000 +
          (snap.priority === 'CRITICAL' ? 80_000 : snap.priority === 'HIGH' ? 40_000 : 0),
        tone: snap.priority === 'CRITICAL' || rem >= 200_000 ? 'critical' : 'warning',
        navTarget: 'orders',
      })
    }
  }

  const salesAssessments = evaluateSalesFollowUp(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    [],
  )
  const collectionAssessments = evaluateCollectionSpecialist(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    [],
  )
  const shipmentAssessments = evaluateShipmentSpecialist(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    [],
  )
  const procurementAssessments = evaluateProcurementSpecialist(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    [],
  )
  for (const assessment of salesAssessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'CRITICAL' && assessment.priority !== 'HIGH') continue
    criticalIssues.push({
      id: `ai-sales:${assessment.orderId}`,
      title: assessment.customerName,
      subtitle: `${assessment.taskTitle} · AI Sales Follow-Up`,
      rank:
        assessment.score * 1000 +
        (assessment.priority === 'CRITICAL' ? 95_000 : 55_000),
      tone: assessment.priority === 'CRITICAL' ? 'critical' : 'warning',
      navTarget: 'digital-workforce',
      workerId: 'dw-sales-follow-up',
    })
  }

  for (const row of supplierLedger?.suppliers ?? []) {
    if (row.healthStatus !== 'CRITICAL' && row.healthStatus !== 'WARNING') continue
    const openBal = Number.parseFloat(String(row.totalDebt ?? '0').replace(/[^\d.-]/g, '')) || 0
    criticalIssues.push({
      id: `supplier:${row.id}`,
      title: row.companyName,
      subtitle:
        row.healthStatus === 'CRITICAL'
          ? 'Cari limiti aşıldı'
          : `${formatTry(openBal)} açık bakiye`,
      rank: openBal + (row.healthStatus === 'CRITICAL' ? 100_000 : 40_000),
      tone: row.healthStatus === 'CRITICAL' ? 'critical' : 'warning',
      navTarget: 'supply-incoming',
    })
  }

  for (const assessment of procurementAssessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'CRITICAL' && assessment.priority !== 'HIGH') continue
    criticalIssues.push({
      id: `proc:${assessment.orderId}`,
      title: assessment.customerName,
      subtitle: `${assessment.taskTitle} · AI Procurement Specialist`,
      rank:
        assessment.score * 1000 +
        (assessment.priority === 'CRITICAL' ? 210_000 : 125_000),
      tone: assessment.priority === 'CRITICAL' ? 'critical' : 'warning',
      navTarget: 'digital-workforce',
      workerId: 'dw-procurement',
    })
  }

  const aiShipmentOrderIds = new Set(
    shipmentAssessments
      .filter(
        (a) =>
          a.eligible && (a.priority === 'CRITICAL' || a.priority === 'HIGH'),
      )
      .map((a) => a.orderId),
  )

  for (const assessment of shipmentAssessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'CRITICAL' && assessment.priority !== 'HIGH') continue
    criticalIssues.push({
      id: `ship:${assessment.orderId}`,
      title: assessment.customerName,
      subtitle: `${assessment.taskTitle} · AI Shipment Specialist`,
      rank:
        assessment.score * 1000 +
        (assessment.priority === 'CRITICAL' ? 212_000 : 125_000),
      tone: assessment.priority === 'CRITICAL' ? 'critical' : 'warning',
      navTarget: 'digital-workforce',
      workerId: 'dw-shipment',
    })
  }

  for (const order of orders) {
    if (aiShipmentOrderIds.has(order.id)) continue
    if (!order.shipmentDate || order.shipmentDate >= todayIso || order.status === 'Teslim Edildi') continue
    const person = order.salesPerson ?? order.driverName ?? 'Operasyon'
    criticalIssues.push({
      id: `ship:${order.id}`,
      title: person,
      subtitle: '1 sevk gecikti',
      rank: 60_000 + (todayIso > order.shipmentDate ? 20_000 : 0),
      tone: 'critical',
      navTarget: 'shipment-ops',
    })
  }

  for (const row of collectionRows.filter((r) => isCollectionCritical(r, todayIso))) {
    const aiCollection = collectionAssessments.find(
      (a) =>
        a.orderId === row.id &&
        a.eligible &&
        (a.priority === 'CRITICAL' || a.priority === 'HIGH'),
    )
    criticalIssues.push({
      id: `coll:${row.id}`,
      title: row.customer ?? row.id,
      subtitle: aiCollection
        ? `${aiCollection.taskTitle} · AI Collection Specialist`
        : isCollectionOverdue(row, todayIso)
          ? 'Gecikmiş tahsilat'
          : 'Kritik tahsilat dosyası',
      rank:
        remainingBalance(row) +
        30_000 +
        (aiCollection
          ? aiCollection.score * 1000 +
            (aiCollection.priority === 'CRITICAL' ? 200_000 : 120_000)
          : 0),
      tone: 'critical',
      navTarget: aiCollection ? 'digital-workforce' : 'collection',
      workerId: aiCollection ? 'dw-collection' : undefined,
    })
  }

  criticalIssues.sort((a, b) => b.rank - a.rank)

  const overdueCollections = collectionRows.filter((r) => isCollectionOverdue(r, todayIso))
  const shipmentsToday = orders.filter((o) => o.shipmentDate === todayIso && o.status !== 'Teslim Edildi')
  const topCriticalOrder = criticalIssues.find((i) => i.id.startsWith('order:'))

  /** @type {{ id: string, text: string, navTarget?: string }[]} */
  const todayTasks = []
  if (overdueCollections.length > 0) {
    todayTasks.push({
      id: 'collect',
      text: `${overdueCollections.length} tahsilat yap.`,
      navTarget: 'collection',
    })
  }
  if (shipmentsToday.length > 0 || delayedShipments > 0) {
    const n = Math.max(shipmentsToday.length, Math.min(delayedShipments, 5))
    if (n > 0) todayTasks.push({ id: 'ship', text: `${n} sevki tamamla.`, navTarget: 'shipment-ops' })
  }
  if (topCriticalOrder) {
    todayTasks.push({
      id: 'follow-order',
      text: `${topCriticalOrder.title} siparişini takip et.`,
      navTarget: 'orders',
    })
  }
  const topCustomer = overdueCollections[0]
  if (topCustomer) {
    todayTasks.push({
      id: 'call-customer',
      text: `${topCustomer.customer ?? 'Müşteri'} müşterisini ara.`,
      navTarget: 'collection',
    })
  }
  if (criticalSsh > 0) {
    todayTasks.push({
      id: 'ssh-review',
      text: 'SSH bekleyen ürünleri incele.',
      navTarget: 'ssh-service',
    })
  }
  if (pendingSupply > 0) {
    todayTasks.push({
      id: 'supply-track',
      text: `${pendingSupply} bekleyen tedarik kalemini kontrol et.`,
      navTarget: 'supply-incoming',
    })
  }

  const trendDays = lastNDayIsos(todayIso, 30)
  const trendLabels = compactDayLabels(trendDays)

  const operationTrends = {
    orders: {
      title: 'Sipariş',
      labels: trendLabels,
      values: trendDays.map(
        (day) => listItemDtos.filter((d) => (d.placedAt ?? '').slice(0, 10) === day).length,
      ),
      tone: 'orders',
    },
    collection: {
      title: 'Tahsilat',
      labels: trendLabels,
      values: trendDays.map((day) => sumPostedPaymentsOnDay(payments, day)),
      tone: 'collect',
    },
    shipment: {
      title: 'Sevk',
      labels: trendLabels,
      values: trendDays.map(
        (day) => orders.filter((o) => o.shipmentDate === day).length,
      ),
      tone: 'ship',
    },
    supply: {
      title: 'Tedarik',
      labels: trendLabels,
      values: trendDays.map(
        (day) =>
          domainEvents.filter(
            (e) =>
              (e.type === DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED ||
                e.type === DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT) &&
              (e.occurredAt ?? '').slice(0, 10) === day,
          ).length,
      ),
      tone: 'sales',
    },
    ssh: {
      title: 'SSH',
      labels: trendLabels,
      values: trendDays.map(
        (day) =>
          domainEvents.filter(
            (e) =>
              (e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED ||
                e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED) &&
              (e.occurredAt ?? '').slice(0, 10) === day,
          ).length,
      ),
      tone: 'ship',
    },
  }

  /** @type {Map<string, number>} */
  const salesByPerson = new Map()
  for (const dto of listItemDtos.filter((d) => (d.placedAt ?? '').slice(0, 10) === todayIso)) {
    const order = orderById.get(dto.id)
    const person = order?.salesPerson ?? dto.salesPerson ?? 'Satış'
    salesByPerson.set(person, (salesByPerson.get(person) ?? 0) + 1)
  }

  /** @type {{ id: string, name: string, role: string, load: number, tone?: string }[]} */
  const staffWorkload = []
  for (const [name, load] of [...salesByPerson.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
    staffWorkload.push({ id: `sales:${name}`, name, role: 'Satış', load, tone: load >= 3 ? 'warning' : 'neutral' })
  }
  staffWorkload.push({
    id: 'collect-team',
    name: 'Tahsilat',
    role: 'Tahsilat',
    load: overdueCollections.length + collectionRows.filter((r) => isCollectionCritical(r, todayIso)).length,
    tone: overdueCollections.length > 0 ? 'critical' : 'neutral',
  })
  staffWorkload.push({
    id: 'ship-team',
    name: 'Sevk',
    role: 'Sevk',
    load: (kpis.todayShipments ?? 0) + delayedShipments,
    tone: delayedShipments > 0 ? 'critical' : 'neutral',
  })
  staffWorkload.push({
    id: 'ssh-team',
    name: 'SSH',
    role: 'SSH',
    load: sshQueue.length,
    tone: criticalSsh > 0 ? 'warning' : 'neutral',
  })

  const avgEngineRisk = (key) =>
    Math.round(
      [...engineSnapshots.values()].reduce((s, v) => s + v.riskScores[key], 0) /
        Math.max(engineSnapshots.size, 1),
    )

  /** @param {number} riskScore */
  const riskToneFromScore = (riskScore) => {
    if (riskScore >= 70) return 'critical'
    if (riskScore >= 45) return 'warning'
    return 'success'
  }

  const riskPanel = [
    {
      id: 'collection',
      label: 'Tahsilat riski',
      score: avgEngineRisk('collection'),
      tone: riskToneFromScore(avgEngineRisk('collection')),
      hint: overdueCollections.length > 0 ? `${overdueCollections.length} gecikmiş` : 'Stabil',
    },
    {
      id: 'supply',
      label: 'Tedarik riski',
      score: avgEngineRisk('supply'),
      tone: riskToneFromScore(avgEngineRisk('supply')),
      hint: pendingSupply > 0 ? `${pendingSupply} bekleyen kalem` : 'Stabil',
    },
    {
      id: 'shipment',
      label: 'Sevk riski',
      score: avgEngineRisk('shipment'),
      tone: riskToneFromScore(avgEngineRisk('shipment')),
      hint: delayedShipments > 0 ? `${delayedShipments} geciken` : 'Stabil',
    },
    {
      id: 'operations',
      label: 'Operasyon riski',
      score: avgEngineRisk('operations'),
      tone: riskToneFromScore(avgEngineRisk('operations')),
      hint: operationalAlarms.length > 0 ? `${operationalAlarms.length} alarm` : 'Stabil',
    },
    {
      id: 'ssh',
      label: 'SSH riski',
      score: avgEngineRisk('ssh'),
      tone: riskToneFromScore(avgEngineRisk('ssh')),
      hint: criticalSsh > 0 ? `${criticalSsh} kritik kayıt` : 'Stabil',
    },
  ]

  const liveFeed = domainEvents
    .filter((e) => LIVE_FEED_TYPES.has(/** @type {string} */ (e.type)))
    .slice()
    .sort((a, b) => String(b.occurredAt ?? '').localeCompare(String(a.occurredAt ?? '')))
    .slice(0, 12)
    .map((e) => {
      const payloadNote =
        typeof e.payload?.reason === 'string'
          ? e.payload.reason
          : typeof e.payload?.description === 'string'
            ? e.payload.description
            : null
      return {
        id: e.id,
        label: domainEventTypeLabelTr(e.type),
        detail: payloadNote ?? e.aggregateId ?? '—',
        timeLabel: relativeTimeLabelTr(e.occurredAt, todayIso),
        tone:
          e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED
            ? 'critical'
            : e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED
              ? 'success'
              : 'info',
        orderId: e.aggregateType === 'SalesOrder' ? e.aggregateId : null,
      }
    })

  return {
    todayIso,
    todayStatus,
    criticalIssues: criticalIssues.slice(0, 15),
    todayTasks,
    operationTrends,
    staffWorkload,
    riskPanel,
    liveFeed,
  }
}

export {}
