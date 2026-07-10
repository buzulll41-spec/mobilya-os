import { DEMO_TOMORROW } from '../../data/constants.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'
import { relativeTimeLabelTr } from '../timeline/relativeTimeLabelTr.js'
import { summarizeOperationalAlarms } from '../../utils/operationalAlarms.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../utils/operationalAlarms.js').OperationalAlarm} OperationalAlarm */

/**
 * @typedef {'sales' | 'collect' | 'ship' | 'risk' | 'service' | 'neutral'} DashboardKpiTone
 * @typedef {'dashboard' | 'collection' | 'shipment' | 'orders' | 'risk' | 'service'} DashboardNavTarget
 *
 * @typedef {Object} DashboardKpiCard
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {string} hint
 * @property {DashboardKpiTone} tone
 * @property {DashboardNavTarget} navTarget
 *
 * @typedef {Object} DashboardFeedItem
 * @property {string} id
 * @property {string} label
 * @property {string} detail
 * @property {string} timeLabel
 * @property {string} orderId
 * @property {'critical' | 'warning' | 'info' | 'success'} tone
 *
 * @typedef {Object} DashboardActionRow
 * @property {string} orderId
 * @property {string} customer
 * @property {string} statusLabel
 * @property {string} dateLabel
 * @property {string} actionLabel
 * @property {'order' | 'shipment' | 'service'} openKind
 *
 * @typedef {Object} DashboardOverviewBullet
 * @property {string} id
 * @property {string} text
 */

/**
 * Servis modülü gelene kadar: sevk/montaj sorunu + montaj bekleyen.
 * @param {SalesOrderListItemDto[]} dtos
 */
export function deriveOpenServiceProxies(dtos) {
  /** @type {Map<string, { orderId: string, customer: string, labels: string[] }>} */
  const byOrder = new Map()
  for (const d of dtos) {
    const labels = /** @type {string[]} */ ([])
    if (d.hasShipmentIssue) labels.push('Sevk / montaj sorunu')
    if (d.installationPending) labels.push('Montaj bekliyor')
    if (labels.length === 0) continue
    byOrder.set(d.id, {
      orderId: d.id,
      customer: d.customerDisplayName ?? d.id,
      labels,
    })
  }
  return [...byOrder.values()]
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   kpis: ReturnType<import('../../data/dashboardHelpers.js').computeDashboardKpis>
 *   operationalTasks?: import('../../contracts/v1/task.js').TaskDto[]
 *   operationalAlarms: OperationalAlarm[]
 *   domainEvents: DomainEventDto[]
 *   shipmentQueue: (Order | ShipmentRowVM)[]
 * }} input
 */
export function computeDashboardControlTower(input) {
  const {
    orders,
    listItemDtos,
    todayIso,
    kpis,
    operationalAlarms,
    domainEvents,
    shipmentQueue,
    operationalTasks = [],
  } = input

  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const orderById = new Map(orders.map((o) => [o.id, o]))
  const alarmSummary = summarizeOperationalAlarms(operationalAlarms)
  const serviceProxies = deriveOpenServiceProxies(listItemDtos)

  /** @type {DashboardKpiCard[]} */
  const kpiCards = [
    {
      id: 'sales',
      label: 'Bugünkü satış',
      value: formatTry(kpis.todaySalesTotal ?? 0),
      hint:
        (kpis.todayOrderCount ?? 0) > 0
          ? `${kpis.todayOrderCount} yeni sipariş`
          : 'Bugün kayıt yok',
      tone: 'sales',
      navTarget: 'dashboard',
    },
    {
      id: 'critical-risk',
      label: 'Kritik risk',
      value: String(kpis.criticalRiskCount ?? 0),
      hint: (kpis.criticalRiskCount ?? 0) > 0 ? 'Öncelikli siparişler' : 'Sakin',
      tone: (kpis.criticalRiskCount ?? 0) > 0 ? 'risk' : 'neutral',
      navTarget: 'risk',
    },
    {
      id: 'pending-ship',
      label: 'Sevk bekleyen',
      value: String(kpis.pendingShipmentCount ?? 0),
      hint: 'Plan bekleyen hazır sipariş',
      tone: (kpis.pendingShipmentCount ?? 0) > 0 ? 'ship' : 'neutral',
      navTarget: 'shipment',
    },
    {
      id: 'collect',
      label: 'Bekleyen tahsilat',
      value: formatTry(kpis.pendingCollection),
      hint: '',
      tone: kpis.pendingCollection > 0 ? 'collect' : 'neutral',
      navTarget: 'collection',
    },
    {
      id: 'pending-approval',
      label: 'Onay bekleyen tahsilat',
      value: String(kpis.pendingApprovalPayments ?? 0),
      hint:
        (kpis.pendingApprovalPayments ?? 0) > 0
          ? `${formatTry(kpis.pendingApprovalPaymentAmount ?? 0)} · yönetici onayı gerekli`
          : '',
      tone: (kpis.pendingApprovalPayments ?? 0) > 0 ? 'collect' : 'neutral',
      navTarget: 'collection',
      navFilter: 'pending-approval',
    },
    {
      id: 'delivery-confirm',
      label: 'Teslim onayı bekleyen',
      value: String(kpis.pendingDeliveryConfirmations ?? 0),
      hint: (kpis.pendingDeliveryConfirmations ?? 0) > 0 ? 'Dünkü sevkler onay bekliyor' : '',
      tone: (kpis.pendingDeliveryConfirmations ?? 0) > 0 ? 'ship' : 'neutral',
      navTarget: 'shipment-ops',
    },
    {
      id: 'delayed-shipment',
      label: 'Geciken sevk',
      value: String(kpis.delayedShipmentKpi ?? 0),
      hint: 'Onay bekleyen + teslim edilemedi',
      tone: (kpis.delayedShipmentKpi ?? 0) > 0 ? 'risk' : 'neutral',
      navTarget: 'shipment-ops',
    },
    {
      id: 'ship',
      label: 'Sevk',
      value: `${kpis.todayShipments} / ${kpis.tomorrowShipments}`,
      hint: '',
      tone: kpis.todayShipments > 0 ? 'ship' : 'neutral',
      navTarget: 'shipment',
    },
    {
      id: 'risk',
      label: 'Kritik risk',
      value: String(alarmSummary.critical),
      hint: '',
      tone: alarmSummary.critical > 0 ? 'risk' : 'neutral',
      navTarget: 'risk',
    },
    {
      id: 'service',
      label: 'Açık servis',
      value: String(serviceProxies.length),
      hint: '',
      tone: serviceProxies.length > 0 ? 'service' : 'neutral',
      navTarget: 'service',
    },
  ]

  const todayOrderCount = kpis.todayOrderCount ?? orders.filter((o) => o.orderDate === todayIso).length
  const shipmentPendingCount = shipmentQueue.filter((r) => {
    if (r.status === 'Teslim Edildi') return false
    const open =
      (r.shipmentSummaryOpenCount ?? 0) > 0 || (r.inTransitShipmentCount ?? 0) > 0
    const todayOrTomorrow = r.shipmentDate === todayIso || r.shipmentDate === DEMO_TOMORROW
    return open || todayOrTomorrow || r.installationPending
  }).length

  /** @type {DashboardOverviewBullet[]} */
  const todayOverview = [
    {
      id: 'orders',
      text:
        todayOrderCount > 0
          ? `${todayOrderCount} yeni sipariş`
          : 'Bugün yeni sipariş yok',
    },
    {
      id: 'ship',
      text:
        (kpis.pendingDeliveryConfirmations ?? 0) > 0
          ? `${kpis.pendingDeliveryConfirmations} sevk teslim onayı bekliyor`
          : shipmentPendingCount > 0
            ? `${shipmentPendingCount} sevk planı bekliyor`
            : 'Bekleyen sevk planı yok',
    },
    {
      id: 'collect',
      text:
        kpis.pendingCollection > 0
          ? `${formatTry(kpis.pendingCollection)} tahsilat bekleniyor`
          : 'Bekleyen tahsilat yok',
    },
    {
      id: 'risk',
      text:
        alarmSummary.critical > 0
          ? `${alarmSummary.critical} kritik risk mevcut`
          : 'Kritik risk yok',
    },
    {
      id: 'service',
      text:
        serviceProxies.length > 0
          ? `${serviceProxies.length} açık servis kaydı`
          : 'Açık servis kaydı yok',
    },
  ]

  const todayEvents = domainEvents
    .filter((e) => e.occurredAt.slice(0, 10) === todayIso)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 14)

  /** @type {DashboardFeedItem[]} */
  const todayFeed = todayEvents.map((e) => {
    const order = orderById.get(e.aggregateId)
    const customer = order?.customer ?? dtoById.get(e.aggregateId)?.customerDisplayName ?? e.aggregateId
    let tone = /** @type {DashboardFeedItem['tone']} */ ('info')
    if (
      e.type === DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE ||
      e.type === DOMAIN_EVENT_TYPE.DELIVERY_FAILED ||
      e.type === DOMAIN_EVENT_TYPE.RISK_ESCALATED
    ) {
      tone = 'critical'
    } else if (
      e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED ||
      e.type === DOMAIN_EVENT_TYPE.PAYMENT_PENDING
    ) {
      tone = 'warning'
    } else if (
      e.type === DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED ||
      e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT ||
      e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED ||
      e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED
    ) {
      tone = 'success'
    }

    let label = domainEventTypeLabelTr(e.type)
    if (e.type === DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE) {
      label = 'Servis sorunu bildirildi'
    }

    return {
      id: e.id,
      label,
      detail: `${customer} · ${e.aggregateId}`,
      timeLabel: relativeTimeLabelTr(e.occurredAt, todayIso),
      orderId: e.aggregateId,
      tone,
    }
  })

  const pendingShipments = shipmentQueue
    .filter((r) => {
      if (r.status === 'Teslim Edildi') return false
      const open = (r.shipmentSummaryOpenCount ?? 0) > 0 || (r.inTransitShipmentCount ?? 0) > 0
      const todayOrTomorrow =
        r.shipmentDate === todayIso || r.shipmentDate === DEMO_TOMORROW
      return open || todayOrTomorrow || r.installationPending
    })
    .slice(0, 6)
    .map((r) => ({
      orderId: r.id,
      customer: r.customer ?? r.id,
      statusLabel:
        (r.inTransitShipmentCount ?? 0) > 0
          ? 'Yolda'
          : r.shipmentDate === todayIso
            ? 'Bugün sevk'
            : 'Planlı sevk',
      dateLabel: r.shipmentDate ? formatShortDate(r.shipmentDate) : 'Tarih yok',
      actionLabel: 'Sevk aç',
      openKind: /** @type {const} */ ('shipment'),
    }))

  const installationPending = listItemDtos
    .filter((d) => d.installationPending)
    .slice(0, 6)
    .map((d) => ({
      orderId: d.id,
      customer: d.customerDisplayName ?? d.id,
      statusLabel: 'Montaj bekliyor',
      dateLabel: d.plannedShipmentDate ? formatShortDate(d.plannedShipmentDate) : '—',
      actionLabel: 'Aç',
      openKind: /** @type {const} */ ('shipment'),
    }))

  const criticalOrderIds = new Set()
  const criticalCustomers = operationalAlarms
    .filter((a) => a.level === 'critical')
    .filter((a) => {
      if (criticalOrderIds.has(a.orderId)) return false
      criticalOrderIds.add(a.orderId)
      return true
    })
    .slice(0, 6)
    .map((a) => {
      const order = orderById.get(a.orderId)
      return {
        orderId: a.orderId,
        customer: a.customer,
        statusLabel: a.title,
        dateLabel: order?.dueDate ? formatShortDate(order.dueDate) : '—',
        actionLabel: 'Sipariş',
        openKind: /** @type {const} */ ('order'),
      }
    })

  const openServiceRows = serviceProxies.slice(0, 6).map((p) => ({
    orderId: p.orderId,
    customer: p.customer,
    statusLabel: p.labels.join(' · '),
    dateLabel: 'Takipte',
    actionLabel: 'Servis',
    openKind: /** @type {const} */ ('service'),
  }))

  return {
    kpiCards,
    todayOverview,
    todayFeed,
    actionLists: {
      pendingShipments,
      installationPending,
      criticalCustomers,
      openService: openServiceRows,
    },
    alarmSummary,
    serviceProxyCount: serviceProxies.length,
  }
}
