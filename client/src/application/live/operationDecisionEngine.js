import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationCenterTask} MobileOperationCenterTask */

export const PRIORITY_BASE_SCORE = {
  collection: 80,
  shipment: 65,
  service: 45,
  orders: 20,
  customers: 15,
}

const MODULE_HASH = {
  collection: '#/mobile/collections?filter=overdue',
  shipment: '#/mobile/shipments?filter=today',
  service: '#/mobile/service?filter=open',
  orders: '#/mobile/orders?filter=today',
  customers: '#/mobile/customers',
}

/** @param {string | null | undefined} iso */
function isoDate(iso) {
  const text = String(iso ?? '').trim()
  if (!text) return ''
  return text.slice(0, 10)
}

/**
 * @param {{
 *   listItemDtos: SalesOrderListItemDto[]
 *   collectionRows: CollectionRowVM[]
 *   shipmentRows: ShipmentRowVM[]
 *   operationTasks: MobileOperationCenterTask[]
 *   domainEvents?: DomainEventDto[]
 *   todayIso: string
 * }} input
 */
export function buildLiveOperationSnapshot({
  listItemDtos,
  collectionRows,
  shipmentRows,
  operationTasks,
  domainEvents = [],
  todayIso,
}) {
  const dueTodayOrderCount = listItemDtos.filter((dto) => {
    const due = isoDate(dto.earliestCommittedShipBy || dto.plannedShipmentDate)
    if (!due) return false
    const delivered = String(dto.lifecycleStatus ?? '').toUpperCase() === 'DELIVERED'
    return due <= todayIso && !delivered
  }).length

  const overdueCollectionCount = collectionRows.filter((row) => {
    const remaining = Number(row.remainingAmount?.value ?? 0)
    return row.hasOverdueBalance === true && Number.isFinite(remaining) && remaining > 0
  }).length

  const pendingServiceCount = operationTasks.filter((task) => task.moduleId === 'service' || task.moduleId === 'missing').length

  const unplannedShipmentCount = shipmentRows.filter((row) => {
    const planned = isoDate(row.plannedShipDate || row.shipmentDate)
    return !planned || planned <= todayIso
  }).length

  const urgentCustomerReturnCount = listItemDtos.filter((dto) => {
    const risk = String(dto.currentRiskSeverity ?? '').toUpperCase()
    return risk === 'HIGH' || risk === 'CRITICAL'
  }).length

  const openMissingStockCount = listItemDtos.reduce((sum, dto) => sum + Number(dto.openMissingItemsCount ?? 0), 0)

  /** @type {Array<{ moduleId: 'collection' | 'shipment' | 'service' | 'orders' | 'customers', title: string, count: number, score: number, blocked?: boolean, ruleMessage?: string }>} */
  const operations = [
    {
      moduleId: 'collection',
      title: 'Tahsilat',
      count: overdueCollectionCount,
      score: PRIORITY_BASE_SCORE.collection + Math.min(20, overdueCollectionCount * 5),
    },
    {
      moduleId: 'shipment',
      title: 'Sevkiyat',
      count: unplannedShipmentCount,
      score: PRIORITY_BASE_SCORE.shipment + Math.min(20, unplannedShipmentCount * 4),
    },
    {
      moduleId: 'service',
      title: 'Servis',
      count: pendingServiceCount,
      score: PRIORITY_BASE_SCORE.service + Math.min(20, pendingServiceCount * 3),
    },
    {
      moduleId: 'orders',
      title: 'Yeni Siparis',
      count: dueTodayOrderCount,
      score: PRIORITY_BASE_SCORE.orders + Math.min(20, dueTodayOrderCount * 2),
    },
    {
      moduleId: 'customers',
      title: 'Musteri Aramasi',
      count: urgentCustomerReturnCount,
      score: PRIORITY_BASE_SCORE.customers + Math.min(20, urgentCustomerReturnCount * 2),
    },
  ]

  const rules = []
  const shipment = operations.find((op) => op.moduleId === 'shipment')
  if (shipment && overdueCollectionCount > 0) {
    shipment.blocked = true
    shipment.score = Math.max(0, shipment.score - 40)
    shipment.ruleMessage = 'Tahsilat gecikmesi var; sevkiyat once tahsilat sonrasi acilsin.'
    rules.push(shipment.ruleMessage)
  }

  const service = operations.find((op) => op.moduleId === 'service')
  if (service && openMissingStockCount > 0) {
    service.blocked = true
    service.score = Math.max(0, service.score - 25)
    service.ruleMessage = 'Urun depoda degil; montaj/servis olusturma once stok tamamla.'
    rules.push(service.ruleMessage)
  }

  if (pendingServiceCount > 0 && dueTodayOrderCount > 0) {
    rules.push('Acik servis kaydi var; yeni teslim once servis onayi ile ilerlesin.')
  }

  const prioritizedOperations = [...operations].sort((a, b) => b.score - a.score)

  const runbook = prioritizedOperations.map((op, index) => ({
    id: `runbook-${op.moduleId}`,
    step: index + 1,
    moduleId: op.moduleId,
    title: op.title,
    score: op.score,
    blocked: op.blocked === true,
    ruleMessage: op.ruleMessage ?? null,
    hash: MODULE_HASH[op.moduleId],
  }))

  const firstFiveCards = [
    {
      id: 'first5-due-delivery',
      level: '🔴 EN KRITIK',
      title: 'Bugun teslim edilmesi gereken siparis',
      subtitle: `${dueTodayOrderCount} siparis bugun aksiyona ihtiyac duyuyor`,
      relatedPerson: 'Sevkiyat + Satis',
      amountLabel: String(dueTodayOrderCount),
      dueDateLabel: 'Bugun',
      hash: MODULE_HASH.orders,
    },
    {
      id: 'first5-overdue-collection',
      level: '🔴 EN KRITIK',
      title: 'Geciken tahsilat',
      subtitle: `${overdueCollectionCount} tahsilat dosyasi gecikmede`,
      relatedPerson: 'Finans',
      amountLabel: String(overdueCollectionCount),
      dueDateLabel: 'Bugun',
      hash: MODULE_HASH.collection,
    },
    {
      id: 'first5-service',
      level: '🟠 BUGUN',
      title: 'Bekleyen servis',
      subtitle: `${pendingServiceCount} servis/montaj kaydi bekliyor`,
      relatedPerson: 'Servis Ekibi',
      amountLabel: String(pendingServiceCount),
      dueDateLabel: 'Bugun',
      hash: MODULE_HASH.service,
    },
    {
      id: 'first5-shipment',
      level: '🟠 BUGUN',
      title: 'Planlanacak sevkiyat',
      subtitle: `${unplannedShipmentCount} sevkiyat plan bekliyor`,
      relatedPerson: 'Lojistik',
      amountLabel: String(unplannedShipmentCount),
      dueDateLabel: 'Bugun',
      hash: MODULE_HASH.shipment,
    },
    {
      id: 'first5-customer',
      level: '🔵 SIPARIS',
      title: 'Acil musteri donusu',
      subtitle: `${urgentCustomerReturnCount} musteri geri donus bekliyor`,
      relatedPerson: 'Musteri Iliskileri',
      amountLabel: String(urgentCustomerReturnCount),
      dueDateLabel: 'Bugun',
      hash: MODULE_HASH.customers,
    },
  ]

  const notifications = domainEvents
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)))
    .map((event) => mapDomainEventToNotification(event))
    .filter(Boolean)

  return {
    firstFiveCards,
    prioritizedOperations,
    runbook,
    rules,
    notifications,
  }
}

/**
 * @param {DomainEventDto} event
 */
function mapDomainEventToNotification(event) {
  const byType = {
    [DOMAIN_EVENT_TYPE.ORDER_PLACED]: {
      type: 'order',
      title: 'Yeni siparis',
      body: 'Yeni siparis olusturuldu.',
      navTarget: 'orders',
      navFilter: 'new',
    },
    [DOMAIN_EVENT_TYPE.PAYMENT_PENDING]: {
      type: 'collection',
      title: 'Tahsilat gecikti',
      body: 'Tahsilat onayi veya odeme bekliyor.',
      navTarget: 'collection',
      navFilter: 'overdue',
    },
    [DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE]: {
      type: 'service',
      title: 'Servis acildi',
      body: 'Yeni servis kaydi olusturuldu.',
      navTarget: 'service',
      navFilter: 'open',
    },
    [DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED]: {
      type: 'shipment',
      title: 'Urun depoya girdi',
      body: 'Gelen urun kaydi tamamlandi.',
      navTarget: 'shipment',
      navFilter: 'today',
    },
    [DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED]: {
      type: 'order',
      title: 'Musteri aradi',
      body: 'Musteri gorusmesi kaydedildi.',
      navTarget: 'customers',
      navFilter: 'all',
    },
  }

  const preset = byType[event.type]
  if (!preset) return null

  return {
    eventId: event.id,
    occurredAt: event.occurredAt,
    ...preset,
  }
}
