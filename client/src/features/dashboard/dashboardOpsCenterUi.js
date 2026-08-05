import { formatTry } from '../../data/dashboardHelpers.js'
import { isCollectionRiskOrder } from '../orders/ordersOpsCenterUi.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'

/** @typedef {import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardActionRow} DashboardActionRow */
/** @typedef {import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardFeedItem} DashboardFeedItem */
/** @typedef {import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardNavTarget} DashboardNavTarget */
/** @typedef {import('../../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard} SshMissingPartCard */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @typedef {'all' | 'critical' | 'termin' | 'collection' | 'ssh' | 'shipment' | 'install' | 'service' | 'feed'} DashboardFilterId */
/** @typedef {'critical' | 'warning' | 'success' | 'neutral'} ErpRowTone */
/** @typedef {'critical' | 'termin' | 'ssh' | 'normal'} DashboardRowAccent */

/**
 * @typedef {Object} DashboardSummaryMetric
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {ErpRowTone} [valueTone]
 * @property {string} [itemTone]
 * @property {DashboardNavTarget} [navTarget]
 */

/**
 * @typedef {Object} DashboardOpsTableRow
 * @property {string} id
 * @property {string} orderId
 * @property {string} orderNo
 * @property {string} customer
 * @property {string} category
 * @property {string} statusLabel
 * @property {string} dateLabel
 * @property {string} lastActionLabel
 * @property {string} nextActionLabel
 * @property {string} actionButtonLabel
 * @property {DashboardFilterId} filterCategory
 * @property {DashboardFilterId[]} filterTags
 * @property {ErpRowTone} tone
 * @property {'order' | 'shipment' | 'service'} openKind
 * @property {number | null} priorityRank
 * @property {DashboardRowAccent} rowAccent
 * @property {boolean} [isManagerCritical]
 */

export const DASHBOARD_QUICK_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm işler' },
  { id: 'critical', label: 'Kritik risk' },
  { id: 'shipment', label: 'Sevk' },
  { id: 'install', label: 'Montaj' },
  { id: 'service', label: 'Servis' },
])

export const DASHBOARD_MANAGER_QUICK_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'critical', label: 'Kritik' },
  { id: 'termin', label: 'Termin' },
  { id: 'collection', label: 'Tahsilat' },
  { id: 'ssh', label: 'SSH' },
  { id: 'shipment', label: 'Sevk' },
  { id: 'install', label: 'Montaj' },
])

export const DASHBOARD_SCOPE_FILTERS = /** @type {const} */ ([
  { id: 'feed', label: 'Bugün akış' },
])

/**
 * @param {DashboardFilterId} filterId
 * @param {DashboardOpsTableRow} row
 */
export function matchesDashboardFilter(filterId, row) {
  if (filterId === 'all') return true
  return row.filterTags.includes(filterId)
}

/**
 * @param {ErpRowTone} tone
 */
function priorityForTone(tone) {
  if (tone === 'critical') return 1
  if (tone === 'warning') return 2
  return null
}

/**
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @param {DashboardFilterId} filterCategory
 * @param {ErpRowTone} tone
 */
function buildRowTags(order, dto, todayIso, filterCategory, tone) {
  /** @type {DashboardFilterId[]} */
  const tags = []
  if (filterCategory !== 'feed') tags.push(filterCategory)
  if (tone === 'critical' || filterCategory === 'critical') tags.push('critical')
  if (order && isTerminOverdue(order, todayIso)) tags.push('termin')
  if (order && isCollectionRiskOrder(order, dto)) tags.push('collection')
  if (filterCategory === 'ssh') tags.push('ssh')
  if (filterCategory === 'shipment') tags.push('shipment')
  if (filterCategory === 'install') tags.push('install')
  return [...new Set(tags)]
}

/**
 * @param {DashboardFilterId} filterCategory
 * @param {ErpRowTone} tone
 * @param {DashboardFilterId[]} filterTags
 */
function resolveRowAccent(filterCategory, tone, filterTags) {
  if (filterCategory === 'ssh' || filterTags.includes('ssh')) return /** @type {const} */ ('ssh')
  if (tone === 'critical' || filterTags.includes('critical')) return /** @type {const} */ ('critical')
  if (filterTags.includes('termin')) return /** @type {const} */ ('termin')
  return /** @type {const} */ ('normal')
}

/**
 * @param {Partial<DashboardOpsTableRow> & Pick<DashboardOpsTableRow, 'id' | 'orderId' | 'orderNo' | 'customer' | 'category' | 'statusLabel' | 'dateLabel' | 'lastActionLabel' | 'nextActionLabel' | 'actionButtonLabel' | 'filterCategory' | 'tone' | 'openKind' | 'priorityRank'>} base
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function finalizeDashboardRow(base, order, dto, todayIso) {
  const filterTags = buildRowTags(order, dto, todayIso, base.filterCategory, base.tone)
  return {
    ...base,
    filterTags,
    rowAccent: resolveRowAccent(base.filterCategory, base.tone, filterTags),
  }
}

/**
 * @param {DashboardActionRow} row
 * @param {DashboardFilterId} category
 * @param {ErpRowTone} tone
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function tableRowFromAction(row, category, tone, order, dto, todayIso) {
  return finalizeDashboardRow(
    {
      id: `${category}-${row.orderId}`,
      orderId: row.orderId,
      orderNo: row.orderId,
      customer: row.customer,
      category:
        category === 'critical'
          ? 'Kritik'
          : category === 'shipment'
            ? 'Sevk'
            : category === 'install'
              ? 'Montaj'
              : 'Servis',
      statusLabel: row.statusLabel,
      dateLabel: row.dateLabel,
      lastActionLabel: '—',
      nextActionLabel: row.statusLabel,
      actionButtonLabel: row.actionLabel,
      filterCategory: category,
      tone,
      openKind: row.openKind,
      priorityRank: priorityForTone(tone),
    },
    order,
    dto,
    todayIso,
  )
}

/**
 * @param {DashboardFeedItem} item
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function tableRowFromFeed(item, order, dto, todayIso) {
  const tone =
    item.tone === 'critical'
      ? 'critical'
      : item.tone === 'warning'
        ? 'warning'
        : item.tone === 'success'
          ? 'success'
          : 'neutral'
  return finalizeDashboardRow(
    {
      id: `feed-${item.id}`,
      orderId: item.orderId,
      orderNo: item.orderId,
      customer: item.detail.split(' · ')[0] ?? item.orderId,
      category: 'Akış',
      statusLabel: item.label,
      dateLabel: item.timeLabel,
      lastActionLabel: item.label,
      nextActionLabel: item.detail,
      actionButtonLabel: 'Aç',
      filterCategory: 'feed',
      tone,
      openKind: 'order',
      priorityRank: priorityForTone(tone),
    },
    order,
    dto,
    todayIso,
  )
}

/**
 * @param {SshMissingPartCard} card
 */
function tableRowFromSsh(card) {
  const critical = card.locksShipment && card.uiStatus === 'waiting'
  return {
    id: `ssh-${card.orderId}-${card.id}`,
    orderId: card.orderId,
    orderNo: card.orderNumber,
    customer: card.customer,
    category: 'SSH',
    statusLabel: card.statusLabel,
    dateLabel: card.estimatedArrivalLabel,
    lastActionLabel: card.partTitle,
    nextActionLabel: card.riskLabel,
    actionButtonLabel: 'SSH',
    filterCategory: 'ssh',
    filterTags: ['ssh', ...(critical ? ['critical'] : [])],
    tone: critical ? 'critical' : 'warning',
    openKind: 'order',
    priorityRank: critical ? 1 : 2,
    rowAccent: /** @type {const} */ ('ssh'),
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function tableRowFromTermin(order, dto, todayIso) {
  return finalizeDashboardRow(
    {
      id: `termin-${order.id}`,
      orderId: order.id,
      orderNo: order.id,
      customer: dto?.customerDisplayName ?? order.customer,
      category: 'Termin',
      statusLabel: 'Termin geçti',
      dateLabel: order.dueDate ? order.dueDate.slice(0, 10) : '—',
      lastActionLabel: order.status,
      nextActionLabel: 'Termin kontrolü',
      actionButtonLabel: 'Aç',
      filterCategory: 'termin',
      tone: 'warning',
      openKind: 'order',
      priorityRank: 2,
    },
    order,
    dto,
    todayIso,
  )
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function tableRowFromCollection(order, dto, todayIso) {
  return finalizeDashboardRow(
    {
      id: `collection-${order.id}`,
      orderId: order.id,
      orderNo: order.id,
      customer: dto?.customerDisplayName ?? order.customer,
      category: 'Tahsilat',
      statusLabel: dto?.hasOverdueBalance ? 'Gecikmiş tahsilat' : 'Tahsilat riski',
      dateLabel: '—',
      lastActionLabel: formatTry(order.amount - (order.paidAmount ?? 0)),
      nextActionLabel: 'Tahsilat takibi',
      actionButtonLabel: 'Aç',
      filterCategory: 'collection',
      tone: dto?.hasOverdueBalance ? 'critical' : 'warning',
      openKind: 'order',
      priorityRank: dto?.hasOverdueBalance ? 1 : 2,
    },
    order,
    dto,
    todayIso,
  )
}

/**
 * @param {DashboardOpsTableRow[]} rows
 */
function markManagerCriticalRows(rows) {
  let criticalCount = 0
  return rows.map((row) => {
    const isCritical = row.tone === 'critical' || row.filterTags.includes('critical')
    if (isCritical && criticalCount < 10) {
      criticalCount += 1
      return { ...row, isManagerCritical: true }
    }
    return row
  })
}

/**
 * @param {{
 *   controlTower: ReturnType<import('../../mappers/dashboard/computeDashboardControlTower.js').computeDashboardControlTower>
 *   sshMissingParts: SshMissingPartCard[]
 *   orders: Order[]
 *   listItemDtos?: SalesOrderListItemDto[]
 *   kpis?: ReturnType<import('../../data/dashboardHelpers.js').computeDashboardKpis>
 *   todayIso: string
 * }} input
 */
export function buildDashboardOpsView(input) {
  const { controlTower, sshMissingParts, orders, listItemDtos = [], kpis, todayIso } = input
  const { actionLists, todayFeed, kpiCards, alarmSummary } = controlTower

  const orderById = new Map(orders.map((o) => [o.id, o]))
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))

  const openOrders = orders.filter((o) => o.status !== 'Teslim Edildi').length
  const pendingShip = kpiCards.find((k) => k.id === 'pending-ship')
  const collectCard = kpiCards.find((k) => k.id === 'collect')

  /** @type {DashboardSummaryMetric[]} */
  const summaryMetrics = [
    {
      id: 'open-orders',
      label: 'Açık sipariş',
      value: String(openOrders),
      navTarget: 'orders',
    },
    {
      id: 'pending-ship',
      label: 'Bekleyen sevk',
      value: pendingShip?.value ?? '0',
      valueTone: Number(pendingShip?.value ?? 0) > 0 ? 'warning' : 'neutral',
      navTarget: 'shipment',
    },
    {
      id: 'critical-risk',
      label: 'Kritik risk',
      value: String(alarmSummary.critical),
      valueTone: alarmSummary.critical > 0 ? 'critical' : 'neutral',
      navTarget: 'risk',
    },
    {
      id: 'open-collect',
      label: 'Açık tahsilat',
      value: collectCard?.value ?? formatTry(0),
      valueTone: 'warning',
      navTarget: 'collection',
    },
  ]

  const todayDeliveryCount =
    kpis?.todayShipments ??
    orders.filter((o) => o.status !== 'Teslim Edildi' && o.shipmentDate === todayIso).length
  const todayInstallCount = listItemDtos.filter(
    (d) => d.installationPending && d.plannedShipmentDate === todayIso,
  ).length
  const sshPendingCount = sshMissingParts.filter((c) => c.uiStatus !== 'resolved').length
  const terminOverdueCount =
    kpis?.overdueOrders ?? orders.filter((o) => isTerminOverdue(o, todayIso)).length
  const collectionRiskCount = orders.filter((o) => {
    const dto = dtoById.get(o.id)
    return isCollectionRiskOrder(o, dto)
  }).length
  const criticalOpsCount = alarmSummary.critical + actionLists.criticalCustomers.length

  /** @type {DashboardSummaryMetric[]} */
  const managerKpiMetrics = [
    {
      id: 'today-delivery',
      label: 'Bugün Teslim',
      value: String(todayDeliveryCount),
      itemTone: todayDeliveryCount > 0 ? 'operation' : 'info',
      valueTone: todayDeliveryCount > 0 ? 'success' : 'neutral',
    },
    {
      id: 'today-install',
      label: 'Bugün Montaj',
      value: String(todayInstallCount),
      itemTone: todayInstallCount > 0 ? 'operation' : 'info',
      valueTone: todayInstallCount > 0 ? 'neutral' : 'neutral',
    },
    {
      id: 'ssh-pending',
      label: 'SSH Bekleyen',
      value: String(sshPendingCount),
      itemTone: sshPendingCount > 0 ? 'risk' : 'info',
      valueTone: sshPendingCount > 0 ? 'critical' : 'neutral',
    },
    {
      id: 'termin-overdue',
      label: 'Termin Geçen',
      value: String(terminOverdueCount),
      itemTone: terminOverdueCount > 0 ? 'risk' : 'info',
      valueTone: terminOverdueCount > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'collection-risk',
      label: 'Tahsilat Riski',
      value: String(collectionRiskCount),
      itemTone: collectionRiskCount > 0 ? 'risk' : 'info',
      valueTone: collectionRiskCount > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'critical-ops',
      label: 'Kritik Operasyon',
      value: String(criticalOpsCount),
      itemTone: criticalOpsCount > 0 ? 'critical' : 'info',
      valueTone: criticalOpsCount > 0 ? 'critical' : 'neutral',
    },
  ]

  const criticalShipToday = actionLists.pendingShipments.filter(
    (r) => r.statusLabel === 'Bugün sevk',
  ).length

  /** @type {string[]} */
  const todayFocusItems = []
  if (criticalShipToday > 0) todayFocusItems.push(`${criticalShipToday} kritik sevk`)
  if (terminOverdueCount > 0) todayFocusItems.push(`${terminOverdueCount} termin geçti`)
  if (collectionRiskCount > 0) todayFocusItems.push(`${collectionRiskCount} tahsilat riski`)
  if (sshPendingCount > 0) todayFocusItems.push(`${sshPendingCount} SSH bekliyor`)
  if (todayFocusItems.length === 0) todayFocusItems.push('Bugün kritik operasyon beklenmiyor')

  const existingOrderIds = new Set(
    [
      ...actionLists.criticalCustomers,
      ...actionLists.pendingShipments,
      ...actionLists.installationPending,
      ...actionLists.openService,
    ].map((r) => r.orderId),
  )

  const terminRows = orders
    .filter((o) => isTerminOverdue(o, todayIso) && !existingOrderIds.has(o.id))
    .slice(0, 8)
    .map((o) => tableRowFromTermin(o, dtoById.get(o.id), todayIso))

  const collectionRows = orders
    .filter((o) => {
      if (existingOrderIds.has(o.id)) return false
      const dto = dtoById.get(o.id)
      return isCollectionRiskOrder(o, dto)
    })
    .slice(0, 8)
    .map((o) => tableRowFromCollection(o, dtoById.get(o.id), todayIso))

  /** @type {DashboardOpsTableRow[]} */
  const allRows = [
    ...actionLists.criticalCustomers.map((r) =>
      tableRowFromAction(
        r,
        'critical',
        'critical',
        orderById.get(r.orderId),
        dtoById.get(r.orderId),
        todayIso,
      ),
    ),
    ...actionLists.pendingShipments.map((r) =>
      tableRowFromAction(
        r,
        'shipment',
        'warning',
        orderById.get(r.orderId),
        dtoById.get(r.orderId),
        todayIso,
      ),
    ),
    ...actionLists.installationPending.map((r) =>
      tableRowFromAction(
        r,
        'install',
        'warning',
        orderById.get(r.orderId),
        dtoById.get(r.orderId),
        todayIso,
      ),
    ),
    ...actionLists.openService.map((r) =>
      tableRowFromAction(
        r,
        'service',
        'warning',
        orderById.get(r.orderId),
        dtoById.get(r.orderId),
        todayIso,
      ),
    ),
    ...terminRows,
    ...collectionRows,
    ...todayFeed.map((item) =>
      tableRowFromFeed(item, orderById.get(item.orderId), dtoById.get(item.orderId), todayIso),
    ),
    ...sshMissingParts.map(tableRowFromSsh),
  ]

  const sortedRows = [...allRows].sort((a, b) => {
    const pa = a.priorityRank ?? 99
    const pb = b.priorityRank ?? 99
    if (pa !== pb) return pa - pb
    return a.customer.localeCompare(b.customer, 'tr')
  })

  let rank = 1
  for (const row of sortedRows) {
    if (row.priorityRank != null) {
      row.priorityRank = rank
      rank += 1
    }
  }

  const rows = markManagerCriticalRows(sortedRows)

  return {
    summaryMetrics,
    managerKpiMetrics,
    todayFocusItems,
    rows,
    totalCount: rows.length,
    managerCriticalCount: rows.filter((r) => r.isManagerCritical).length,
  }
}

/**
 * @param {DashboardOpsTableRow[]} rows
 * @param {DashboardFilterId} filterId
 */
export function filterDashboardRows(rows, filterId) {
  return rows.filter((r) => matchesDashboardFilter(filterId, r))
}

/**
 * @param {DashboardOpsTableRow[]} rows
 * @param {DashboardFilterId} filterId
 */
export function countDashboardByFilter(rows, filterId) {
  if (filterId === 'all') return rows.length
  return rows.filter((r) => matchesDashboardFilter(filterId, r)).length
}
