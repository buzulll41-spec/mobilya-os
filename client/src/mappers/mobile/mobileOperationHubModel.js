import { DEMO_TODAY } from '../../data/constants.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {{
 *   id: string
 *   icon: string
 *   title: string
 *   statusSummary: string
 *   pendingCount: number
 *   criticalCount: number
 *   lastActionLabel: string
 *   navTarget: string
 *   navFilter?: import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId
 * }} MobileOperationHubCard
 */

/** @param {unknown} value */
function toIso(value) {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  return text || ''
}

/** @param {string[]} candidates */
function pickLatestIso(candidates) {
  return candidates.reduce((max, current) => (current && current > max ? current : max), '')
}

/** @param {string} iso */
function formatLastActionLabel(iso) {
  if (!iso) return '—'
  if (iso.includes('T')) {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }
  return iso
}

/**
 * @param {number} pendingCount
 * @param {number} criticalCount
 */
function buildStatusSummary(pendingCount, criticalCount) {
  if (criticalCount > 0) return `${criticalCount} kritik kayıt var`
  if (pendingCount > 0) return 'Operasyon takipte'
  return 'Akış normal'
}

/**
 * @param {SalesOrderListItemDto} dto
 */
function isCriticalOrder(dto) {
  const risk = String(dto.currentRiskSeverity ?? '').toUpperCase()
  return risk === 'HIGH' || risk === 'CRITICAL'
}

/**
 * @param {ShipmentPlan} plan
 */
function isPendingShipment(plan) {
  const status = String(plan.status ?? '').toLowerCase()
  if (!status) return true
  return !status.includes('teslim') && !status.includes('delivered')
}

/**
 * @param {{
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentPlans?: ShipmentPlan[]
 *   todayIso?: string
 * }} input
 * @returns {MobileOperationHubCard[]}
 */
export function buildMobileOperationHubCards({
  listItemDtos,
  collectionRows,
  shipmentPlans = [],
  todayIso = DEMO_TODAY,
}) {
  const orderPending = listItemDtos.length
  const orderCritical = listItemDtos.filter(isCriticalOrder).length
  const orderLast = pickLatestIso(listItemDtos.map((dto) => toIso(dto.createdAt || dto.placedAt)))

  const pendingShipments = shipmentPlans.filter(isPendingShipment)
  const shipmentPending = pendingShipments.length
  const shipmentCritical = pendingShipments.filter((plan) => {
    const planned = toIso(plan.plannedDate)
    return planned && planned < todayIso
  }).length
  const shipmentLast = pickLatestIso(shipmentPlans.map((plan) => toIso(plan.updatedAt || plan.plannedDate)))

  const supplyRows = listItemDtos.filter((dto) => (dto.openMissingItemsCount ?? 0) > 0)
  const supplyPending = supplyRows.length
  const supplyCritical = supplyRows.filter(isCriticalOrder).length
  const supplyLast = pickLatestIso(supplyRows.map((dto) => toIso(dto.createdAt || dto.placedAt)))

  const serviceRows = listItemDtos.filter((dto) => (dto.openMissingItemsCount ?? 0) > 0)
  const servicePending = serviceRows.length
  const serviceCritical = serviceRows.filter((dto) => (dto.missingItemsOpenStatusCount ?? 0) > 0).length
  const serviceLast = pickLatestIso(serviceRows.map((dto) => toIso(dto.createdAt || dto.placedAt)))

  const missingPending = listItemDtos.reduce((sum, dto) => sum + (dto.openMissingItemsCount ?? 0), 0)
  const missingCritical = listItemDtos.reduce((sum, dto) => sum + (dto.missingItemsOpenStatusCount ?? 0), 0)
  const missingLast = serviceLast

  const collectionPending = collectionRows.length
  const collectionCritical = collectionRows.filter((row) => row.hasOverdueBalance).length
  const collectionLast = pickLatestIso(collectionRows.map((row) => toIso(row.lastPaymentAt)))

  return [
    {
      id: 'dashboard',
      icon: '🏠',
      title: 'Dashboard',
      statusSummary: buildStatusSummary(orderPending, orderCritical),
      pendingCount: orderPending,
      criticalCount: orderCritical,
      lastActionLabel: formatLastActionLabel(orderLast),
      navTarget: 'dashboard',
    },
    {
      id: 'orders',
      icon: '📦',
      title: 'Sipariş',
      statusSummary: buildStatusSummary(orderPending, orderCritical),
      pendingCount: orderPending,
      criticalCount: orderCritical,
      lastActionLabel: formatLastActionLabel(orderLast),
      navTarget: 'orders',
    },
    {
      id: 'shipment',
      icon: '🚚',
      title: 'Sevkiyat',
      statusSummary: buildStatusSummary(shipmentPending, shipmentCritical),
      pendingCount: shipmentPending,
      criticalCount: shipmentCritical,
      lastActionLabel: formatLastActionLabel(shipmentLast),
      navTarget: 'shipment-ops',
    },
    {
      id: 'service',
      icon: '🔧',
      title: 'Servis',
      statusSummary: buildStatusSummary(servicePending, serviceCritical),
      pendingCount: servicePending,
      criticalCount: serviceCritical,
      lastActionLabel: formatLastActionLabel(serviceLast),
      navTarget: 'ssh-service',
      navFilter: 'all',
    },
    {
      id: 'missing',
      icon: '📋',
      title: 'Eksik Parça',
      statusSummary: buildStatusSummary(missingPending, missingCritical),
      pendingCount: missingPending,
      criticalCount: missingCritical,
      lastActionLabel: formatLastActionLabel(missingLast),
      navTarget: 'ssh-service',
      navFilter: 'waiting',
    },
    {
      id: 'collection',
      icon: '💰',
      title: 'Tahsilat',
      statusSummary: buildStatusSummary(collectionPending, collectionCritical),
      pendingCount: collectionPending,
      criticalCount: collectionCritical,
      lastActionLabel: formatLastActionLabel(collectionLast),
      navTarget: 'collection',
      navFilter: 'all',
    },
  ]
}

/**
 * @param {{
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentPlans?: ShipmentPlan[]
 *   notificationUnreadCount?: number
 *   offlinePendingCount?: number
 *   isOffline?: boolean
 *   todayIso?: string
 * }} input
 * @returns {MobileOperationHubCard[]}
 */
export function buildMobileFieldPilotHubCards({
  listItemDtos,
  collectionRows,
  shipmentPlans = [],
  notificationUnreadCount = 0,
  offlinePendingCount = 0,
  isOffline = false,
  todayIso = DEMO_TODAY,
}) {
  const openShipments = shipmentPlans.filter(isPendingShipment)
  const criticalShipments = openShipments.filter((plan) => {
    const planned = toIso(plan.plannedDate)
    return planned && planned < todayIso
  }).length
  const openCollections = collectionRows.filter((row) => Number(row.amount) > Number(row.paidAmount ?? 0))
  const criticalCollections = collectionRows.filter((row) => row.hasOverdueBalance).length
  const criticalOrders = listItemDtos.filter(isCriticalOrder).length
  const pendingOrders = listItemDtos.length
  const pendingJobs = pendingOrders + openShipments.length + openCollections.length

  const todayOrderCount = listItemDtos.filter((dto) => {
    const placed = toIso(dto.placedAt).slice(0, 10)
    return placed === todayIso
  }).length

  const todayLast = pickLatestIso(
    listItemDtos
      .filter((dto) => toIso(dto.placedAt).slice(0, 10) === todayIso)
      .map((dto) => toIso(dto.createdAt || dto.placedAt)),
  )

  const pendingLast = pickLatestIso([
    ...listItemDtos.map((dto) => toIso(dto.createdAt || dto.placedAt)),
    ...openShipments.map((plan) => toIso(plan.updatedAt || plan.plannedDate)),
    ...collectionRows.map((row) => toIso(row.lastPaymentAt)),
  ])

  const criticalLast = pickLatestIso([
    ...listItemDtos.filter(isCriticalOrder).map((dto) => toIso(dto.createdAt || dto.placedAt)),
    ...openShipments
      .filter((plan) => toIso(plan.plannedDate) && toIso(plan.plannedDate) < todayIso)
      .map((plan) => toIso(plan.updatedAt || plan.plannedDate)),
    ...collectionRows.filter((row) => row.hasOverdueBalance).map((row) => toIso(row.lastPaymentAt)),
  ])

  const notiLast = pickLatestIso([toIso(new Date().toISOString())])

  return [
    {
      id: 'today-jobs',
      icon: '🗓️',
      title: 'Bugunku isler',
      statusSummary: buildStatusSummary(todayOrderCount, criticalOrders),
      pendingCount: todayOrderCount,
      criticalCount: criticalOrders,
      lastActionLabel: formatLastActionLabel(todayLast),
      navTarget: 'orders',
      navFilter: 'new',
    },
    {
      id: 'pending-jobs',
      icon: '⏳',
      title: 'Bekleyen isler',
      statusSummary: buildStatusSummary(pendingJobs, criticalShipments + criticalCollections),
      pendingCount: pendingJobs,
      criticalCount: criticalShipments + criticalCollections,
      lastActionLabel: formatLastActionLabel(pendingLast),
      navTarget: 'shipment-ops',
      navFilter: 'today',
    },
    {
      id: 'urgent-jobs',
      icon: '🚨',
      title: 'Acil isler',
      statusSummary: buildStatusSummary(criticalOrders + criticalShipments + criticalCollections, criticalOrders + criticalShipments + criticalCollections),
      pendingCount: criticalOrders + criticalShipments + criticalCollections,
      criticalCount: criticalOrders + criticalShipments + criticalCollections,
      lastActionLabel: formatLastActionLabel(criticalLast),
      navTarget: 'orders',
      navFilter: 'critical',
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Bildirimler',
      statusSummary: notificationUnreadCount > 0 ? 'Yeni bildirim var' : 'Bildirimler normal',
      pendingCount: notificationUnreadCount,
      criticalCount: 0,
      lastActionLabel: formatLastActionLabel(notiLast),
      navTarget: 'dashboard',
    },
    {
      id: 'offline-status',
      icon: isOffline ? '📴' : '📶',
      title: 'Offline durumu',
      statusSummary: isOffline ? 'Baglanti yok' : 'Baglanti aktif',
      pendingCount: offlinePendingCount,
      criticalCount: isOffline ? 1 : 0,
      lastActionLabel: formatLastActionLabel(notiLast),
      navTarget: 'dashboard',
    },
  ]
}

/** @typedef {'all' | 'today' | 'critical' | 'delayed' | 'assigned' | 'orders' | 'collection' | 'shipment' | 'service' | 'missing' | 'supply'} MobileOperationTaskFilterId */

/**
 * @typedef {{
 *   id: string
 *   moduleId: 'orders' | 'collection' | 'shipment' | 'service' | 'missing' | 'supply'
 *   moduleType: string
 *   party: string
 *   summary: string
 *   dueDate: string
 *   priority: string
 *   status: string
 *   assignee: string
 *   lastAction: string
 *   navTarget: string
 *   navFilter?: import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId
 *   isToday: boolean
 *   isCritical: boolean
 *   isDelayed: boolean
 *   isAssigned: boolean
 * }} MobileOperationCenterTask
 */

/**
 * @param {string} iso
 * @param {string} todayIso
 */
function isTodayIso(iso, todayIso) {
  const normalized = toIso(iso)
  return normalized ? normalized.slice(0, 10) === todayIso : false
}

/**
 * @param {string} iso
 * @param {string} todayIso
 */
function isPastIso(iso, todayIso) {
  const normalized = toIso(iso)
  if (!normalized) return false
  return normalized.slice(0, 10) < todayIso
}

/**
 * @param {string | undefined} value
 */
function normalizeAssignee(value) {
  const text = typeof value === 'string' ? value.trim() : ''
  return text || 'Atanmadi'
}

/**
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} todayIso
 * @param {string} currentUserName
 * @returns {MobileOperationCenterTask[]}
 */
function buildOrderTasks(listItemDtos, todayIso, currentUserName) {
  return listItemDtos.slice(0, 60).map((dto) => {
    const dueDate = dto.earliestCommittedShipBy || dto.plannedShipmentDate || '—'
    const assignee = normalizeAssignee(dto.salesPerson)
    const isCritical = isCriticalOrder(dto)
    const isDelayed = dueDate !== '—' ? isPastIso(dueDate, todayIso) : false
    return {
      id: `orders:${dto.id}`,
      moduleId: 'orders',
      moduleType: 'Siparis',
      party: dto.customerDisplayName || dto.customerId || dto.id,
      summary: dto.lineSummaryTitle || dto.displayStatus || 'Siparis islemi',
      dueDate,
      priority: isCritical ? 'Kritik' : 'Normal',
      status: dto.displayStatus || dto.lifecycleStatus,
      assignee,
      lastAction: formatLastActionLabel(toIso(dto.createdAt || dto.placedAt)),
      navTarget: 'orders',
      navFilter: isCritical ? 'critical' : 'new',
      isToday: isTodayIso(dto.placedAt || dto.createdAt || '', todayIso),
      isCritical,
      isDelayed,
      isAssigned: currentUserName ? assignee.toLowerCase().includes(currentUserName.toLowerCase()) : false,
    }
  })
}

/**
 * @param {CollectionRowVM[]} collectionRows
 * @param {string} todayIso
 * @param {string} currentUserName
 * @returns {MobileOperationCenterTask[]}
 */
function buildCollectionTasks(collectionRows, todayIso, currentUserName) {
  return collectionRows
    .filter((row) => Number(row.amount ?? 0) > Number(row.paidAmount ?? 0))
    .slice(0, 40)
    .map((row) => {
      const assignee = normalizeAssignee(row.salesPerson)
      return {
        id: `collection:${row.id}`,
        moduleId: 'collection',
        moduleType: 'Tahsilat',
        party: row.customer || row.id,
        summary: `${row.status || 'Tahsilat'} · Kalan ${row.remainingBalanceLabel || row.balanceLabel || '—'}`,
        dueDate: row.committedShipBy || '—',
        priority: row.hasOverdueBalance ? 'Kritik' : 'Normal',
        status: row.status || 'Acik',
        assignee,
        lastAction: formatLastActionLabel(toIso(row.lastPaymentAt || row.orderDate || '')),
        navTarget: 'collection',
        navFilter: row.hasOverdueBalance ? 'overdue' : 'all',
        isToday: isTodayIso(row.lastPaymentAt || row.orderDate || '', todayIso),
        isCritical: row.hasOverdueBalance === true,
        isDelayed: row.hasOverdueBalance === true,
        isAssigned: currentUserName ? assignee.toLowerCase().includes(currentUserName.toLowerCase()) : false,
      }
    })
}

/**
 * @param {ShipmentPlan[]} shipmentPlans
 * @param {string} todayIso
 * @returns {MobileOperationCenterTask[]}
 */
function buildShipmentTasks(shipmentPlans, todayIso) {
  return shipmentPlans
    .filter(isPendingShipment)
    .slice(0, 40)
    .map((plan, index) => {
      const dueDate = plan.plannedDate || '—'
      const isDelayed = dueDate !== '—' ? dueDate < todayIso : false
      const assignee = normalizeAssignee(plan.crew1 || plan.crew2 || '')
      return {
        id: `shipment:${plan.id || `${plan.orderId}:${index}`}`,
        moduleId: 'shipment',
        moduleType: 'Sevk',
        party: plan.orderId,
        summary: `${plan.vehicle || 'Arac'} · ${plan.region || 'Bolge'}`,
        dueDate,
        priority: isDelayed ? 'Kritik' : 'Normal',
        status: plan.status || 'Planlandi',
        assignee,
        lastAction: formatLastActionLabel(toIso(plan.updatedAt || plan.plannedDate || '')),
        navTarget: 'shipment-ops',
        navFilter: 'today',
        isToday: isTodayIso(plan.plannedDate || '', todayIso),
        isCritical: isDelayed,
        isDelayed,
        isAssigned: false,
      }
    })
}

/**
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} todayIso
 * @param {string} currentUserName
 * @returns {MobileOperationCenterTask[]}
 */
function buildServiceTasks(listItemDtos, todayIso, currentUserName) {
  return listItemDtos
    .filter((dto) => (dto.openMissingItemsCount ?? 0) > 0)
    .slice(0, 40)
    .map((dto) => {
      const assignee = normalizeAssignee(dto.salesPerson)
      const dueDate = dto.earliestCommittedShipBy || dto.plannedShipmentDate || '—'
      const isCritical = (dto.missingItemsOpenStatusCount ?? 0) > 0 || isCriticalOrder(dto)
      return {
        id: `service:${dto.id}`,
        moduleId: 'service',
        moduleType: 'Servis',
        party: dto.customerDisplayName || dto.id,
        summary: `${dto.openMissingItemsCount ?? 0} acik servis kaydi`,
        dueDate,
        priority: isCritical ? 'Kritik' : 'Normal',
        status: dto.displayStatus || 'Takipte',
        assignee,
        lastAction: formatLastActionLabel(toIso(dto.createdAt || dto.placedAt || '')),
        navTarget: 'ssh-service',
        navFilter: 'all',
        isToday: isTodayIso(dto.createdAt || dto.placedAt || '', todayIso),
        isCritical,
        isDelayed: dueDate !== '—' ? isPastIso(dueDate, todayIso) : false,
        isAssigned: currentUserName ? assignee.toLowerCase().includes(currentUserName.toLowerCase()) : false,
      }
    })
}

/**
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} todayIso
 * @returns {MobileOperationCenterTask[]}
 */
function buildMissingTasks(listItemDtos, todayIso) {
  return listItemDtos
    .filter((dto) => (dto.openMissingItemsCount ?? 0) > 0)
    .slice(0, 40)
    .map((dto) => {
      const dueDate = dto.earliestCommittedShipBy || dto.plannedShipmentDate || '—'
      const isCritical = (dto.missingItemsOpenStatusCount ?? 0) > 0
      return {
        id: `missing:${dto.id}`,
        moduleId: 'missing',
        moduleType: 'Eksik Parca',
        party: dto.customerDisplayName || dto.id,
        summary: `${dto.openMissingItemsCount ?? 0} eksik parca`,
        dueDate,
        priority: isCritical ? 'Kritik' : 'Normal',
        status: dto.displayStatus || 'Bekliyor',
        assignee: normalizeAssignee(dto.salesPerson),
        lastAction: formatLastActionLabel(toIso(dto.createdAt || dto.placedAt || '')),
        navTarget: 'ssh-service',
        navFilter: 'waiting',
        isToday: isTodayIso(dto.createdAt || dto.placedAt || '', todayIso),
        isCritical,
        isDelayed: dueDate !== '—' ? isPastIso(dueDate, todayIso) : false,
        isAssigned: false,
      }
    })
}

/**
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} todayIso
 * @returns {MobileOperationCenterTask[]}
 */
function buildSupplyTasks(listItemDtos, todayIso) {
  return listItemDtos
    .filter((dto) => (dto.openMissingItemsCount ?? 0) > 0)
    .slice(0, 40)
    .map((dto) => ({
      id: `supply:${dto.id}`,
      moduleId: 'supply',
      moduleType: 'Tedarik',
      party: dto.customerDisplayName || dto.id,
      summary: dto.lineSummaryTitle || 'Tedarik bekleyen urun',
      dueDate: dto.latestCommittedShipBy || dto.plannedShipmentDate || '—',
      priority: isCriticalOrder(dto) ? 'Kritik' : 'Normal',
      status: dto.displayStatus || 'Bekliyor',
      assignee: normalizeAssignee(dto.salesPerson),
      lastAction: formatLastActionLabel(toIso(dto.createdAt || dto.placedAt || '')),
      navTarget: 'supply-incoming',
      isToday: isTodayIso(dto.createdAt || dto.placedAt || '', todayIso),
      isCritical: isCriticalOrder(dto),
      isDelayed: dto.latestCommittedShipBy ? isPastIso(dto.latestCommittedShipBy, todayIso) : false,
      isAssigned: false,
    }))
}

/**
 * @param {MobileOperationCenterTask[]} tasks
 * @param {MobileOperationTaskFilterId} filterId
 */
export function filterMobileOperationCenterTasks(tasks, filterId) {
  if (filterId === 'all') return tasks
  return tasks.filter((task) => {
    switch (filterId) {
      case 'today':
        return task.isToday
      case 'critical':
        return task.isCritical
      case 'delayed':
        return task.isDelayed
      case 'assigned':
        return task.isAssigned
      case 'orders':
        return task.moduleId === 'orders'
      case 'collection':
        return task.moduleId === 'collection'
      case 'shipment':
        return task.moduleId === 'shipment'
      case 'service':
        return task.moduleId === 'service'
      case 'missing':
        return task.moduleId === 'missing'
      case 'supply':
        return task.moduleId === 'supply'
      default:
        return true
    }
  })
}

/**
 * @param {{
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentPlans?: ShipmentPlan[]
 *   todayIso?: string
 *   currentUserName?: string
 * }} input
 */
export function buildMobileOperationCenterTasks({
  listItemDtos,
  collectionRows,
  shipmentPlans = [],
  todayIso = DEMO_TODAY,
  currentUserName = '',
}) {
  const tasks = [
    ...buildOrderTasks(listItemDtos, todayIso, currentUserName),
    ...buildCollectionTasks(collectionRows, todayIso, currentUserName),
    ...buildShipmentTasks(shipmentPlans, todayIso),
    ...buildServiceTasks(listItemDtos, todayIso, currentUserName),
    ...buildMissingTasks(listItemDtos, todayIso),
    ...buildSupplyTasks(listItemDtos, todayIso),
  ]

  return tasks.sort((a, b) => {
    if (a.isCritical !== b.isCritical) return a.isCritical ? -1 : 1
    if (a.isDelayed !== b.isDelayed) return a.isDelayed ? -1 : 1
    return String(b.lastAction).localeCompare(String(a.lastAction), 'tr')
  })
}
