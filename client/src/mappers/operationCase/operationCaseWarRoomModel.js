import { isCollectionRiskOrder } from '../../features/orders/ordersOpsCenterUi.js'
import { buildSshMissingPartsQueue } from '../ssh/sshMissingPartsModel.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'
import { formatTry } from '../../data/dashboardHelpers.js'

/** @typedef {import('../../contracts/v1/operationCase.js').OperationCaseDto} OperationCaseDto */
/** @typedef {import('../../contracts/v1/operationCase.js').OperationCasesResponseDto} OperationCasesResponseDto */
/** @typedef {import('../../contracts/v1/actionCenter.js').ActionDto} ActionDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const ACTIVE_STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'])
const MAX_P1_RATIO = 0.2
const WEEK_ACTION_DAYS = 7
const P1_COLLECTION_BALANCE_MIN = 10_000

/**
 * @param {string} fromIso YYYY-MM-DD
 * @param {string} toIso YYYY-MM-DD
 */
function daysBetweenIso(fromIso, toIso) {
  const a = Date.parse(`${fromIso.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${toIso.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((b - a) / 86_400_000)
}

/**
 * @param {OperationCaseDto} c
 * @param {ActionDto[]} actions
 * @param {{
 *   orderById: Map<string, Order>
 *   dtoById: Map<string, SalesOrderListItemDto>
 *   sshOrderIds: Set<string>
 *   shipmentLockOrderIds: Set<string>
 *   todayIso: string
 * }} ctx
 * @returns {{ tier: OperationCaseDto['priority'], urgencyScore: number }}
 */
function scoreManagerPriorityTier(c, actions, ctx) {
  const { orderById, dtoById, sshOrderIds, shipmentLockOrderIds, todayIso } = ctx

  if (!ACTIVE_STATUSES.has(c.status)) {
    const tier = c.priority === 'P5' || c.priority === 'P4' ? 'P4' : c.priority
    return { tier: tier === 'P1' || tier === 'P2' || tier === 'P3' ? tier : 'P4', urgencyScore: 0 }
  }

  let urgencyScore = 0
  let tier = /** @type {'P1'|'P2'|'P3'|'P4'} */ ('P4')

  const onlyDataQuality =
    actions.length > 0 && actions.every((a) => a.category === 'DATA_QUALITY')
  const onlySales = actions.length > 0 && actions.every((a) => a.category === 'SALES')

  if (onlySales) return { tier: 'P4', urgencyScore: 1 }

  for (const oid of c.orderIds) {
    const order = orderById.get(oid)
    const dto = dtoById.get(oid)
    if (!order) continue

    if (isTerminOverdue(order, todayIso)) {
      tier = 'P1'
      urgencyScore = Math.max(urgencyScore, 120)
    } else if (order.dueDate && order.status !== 'Teslim Edildi') {
      const daysToTermin = daysBetweenIso(todayIso, order.dueDate)
      if (daysToTermin >= 0 && daysToTermin <= WEEK_ACTION_DAYS) {
        if (tier !== 'P1') tier = 'P2'
        urgencyScore = Math.max(urgencyScore, 55 - daysToTermin)
      }
    }

    if (shipmentLockOrderIds.has(oid)) {
      tier = 'P1'
      urgencyScore = Math.max(urgencyScore, 110)
    } else if (sshOrderIds.has(oid)) {
      if (tier !== 'P1') tier = 'P2'
      urgencyScore = Math.max(urgencyScore, 48)
    }

    const balance = remainingBalance(order)
    const highRisk =
      dto?.currentRiskSeverity === 'HIGH' || dto?.currentRiskSeverity === 'CRITICAL'
    const collectionRisk = isCollectionRiskOrder(order, dto)

    if (collectionRisk) {
      if (dto?.hasOverdueBalance || (highRisk && balance >= P1_COLLECTION_BALANCE_MIN)) {
        tier = 'P1'
        urgencyScore = Math.max(urgencyScore, 95 + Math.min(20, Math.floor(balance / 5000)))
      } else if (balance > 0.009) {
        if (tier !== 'P1') tier = 'P2'
        urgencyScore = Math.max(urgencyScore, 40 + Math.min(15, Math.floor(balance / 8000)))
      }
    }
  }

  for (const a of actions) {
    if (a.category === 'SHIPMENT') {
      if (a.id?.includes('overdue') || a.id?.includes('missing')) {
        tier = 'P1'
        urgencyScore = Math.max(urgencyScore, a.id.includes('missing') ? 100 : 90)
      } else if (tier !== 'P1') {
        tier = 'P2'
        urgencyScore = Math.max(urgencyScore, 42)
      }
    }
    if (a.category === 'COLLECTION') {
      if (a.id?.includes('escalate') || a.priority === 'P1') {
        tier = 'P1'
        urgencyScore = Math.max(urgencyScore, 88)
      } else if (tier !== 'P1') {
        tier = 'P2'
        urgencyScore = Math.max(urgencyScore, 38)
      }
    }
    if (a.category === 'SUPPLIER' && tier !== 'P1') {
      tier = 'P2'
      urgencyScore = Math.max(urgencyScore, 35)
    }
    if (a.category === 'DATA_QUALITY') {
      if (tier === 'P4') tier = 'P3'
      urgencyScore = Math.max(urgencyScore, onlyDataQuality ? 12 : 22)
    }
    if (a.category === 'SALES') {
      tier = 'P4'
      urgencyScore = Math.max(urgencyScore, 5)
    }
  }

  if (onlyDataQuality && tier === 'P4') tier = 'P3'

  if (tier === 'P4' && (c.priority === 'P2' || c.priority === 'P3')) {
    tier = c.priority === 'P2' ? 'P2' : 'P3'
    urgencyScore = Math.max(urgencyScore, c.priority === 'P2' ? 30 : 18)
  }

  return { tier, urgencyScore }
}

/**
 * Yönetici savaş odası önceliği — P1 en fazla aktif vakaların %20'si.
 *
 * @param {OperationCaseDto[]} cases
 * @param {Map<string, ActionDto[]>} actionIndex
 * @param {{
 *   orderById: Map<string, Order>
 *   dtoById: Map<string, SalesOrderListItemDto>
 *   sshOrderIds: Set<string>
 *   shipmentLockOrderIds: Set<string>
 *   todayIso: string
 * }} ctx
 * @returns {Map<string, OperationCaseDto['priority']>}
 */
function buildManagerPriorityMap(cases, actionIndex, ctx) {
  /** @type {{ id: string, tier: OperationCaseDto['priority'], urgencyScore: number, isActive: boolean }[]} */
  const scored = cases.map((c) => {
    const acts = actionIndex.get(c.id) ?? actionIndex.get(c.caseNumber) ?? []
    const { tier, urgencyScore } = scoreManagerPriorityTier(c, acts, ctx)
    return {
      id: c.id,
      tier,
      urgencyScore,
      isActive: ACTIVE_STATUSES.has(c.status),
    }
  })

  const activeCount = scored.filter((s) => s.isActive).length
  const maxP1 = activeCount > 0 ? Math.max(1, Math.ceil(activeCount * MAX_P1_RATIO)) : 0

  const p1Keep = new Set(
    scored
      .filter((s) => s.isActive && s.tier === 'P1')
      .sort((a, b) => b.urgencyScore - a.urgencyScore || a.id.localeCompare(b.id))
      .slice(0, maxP1)
      .map((s) => s.id),
  )

  /** @type {Map<string, OperationCaseDto['priority']>} */
  const out = new Map()
  for (const s of scored) {
    if (!s.isActive) {
      out.set(s.id, s.tier === 'P1' || s.tier === 'P2' ? s.tier : 'P4')
      continue
    }
    if (s.tier === 'P1' && !p1Keep.has(s.id)) {
      out.set(s.id, 'P2')
      continue
    }
    out.set(s.id, s.tier)
  }
  return out
}

const CATEGORY_LABEL = {
  COLLECTION: 'Tahsilat',
  SHIPMENT: 'Sevk',
  DATA_QUALITY: 'Veri Kalitesi',
  SALES: 'Satış',
  SUPPLIER: 'Tedarikçi',
  OPERATIONS: 'Operasyon',
  RISK: 'Risk',
}

const STATUS_LABEL = {
  OPEN: 'Açık',
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'Devam Ediyor',
  WAITING: 'Bekliyor',
  RESOLVED: 'Çözüldü',
  CLOSED: 'Kapandı',
}

/**
 * @param {ActionDto} a
 */
function actionOrderId(a) {
  if (a.relatedEntityType === 'order') return a.relatedEntityId
  if (a.relatedEntityType === 'orderLine') {
    const oid = a.evidence?.orderId
    return typeof oid === 'string' && oid ? oid : null
  }
  return null
}

/**
 * @param {ActionDto} a
 */
function caseNumberForAction(a) {
  const orderId = actionOrderId(a)
  if (orderId) return `CASE-${orderId}`
  if (a.category === 'SUPPLIER') return `CASE-supplier-${a.relatedEntityId ?? 'all'}`
  if (a.category === 'SALES') return 'CASE-sales-general'
  return `CASE-misc-${a.id}`
}

/**
 * @param {ActionDto[]} actions
 * @returns {Map<string, ActionDto[]>}
 */
export function buildActionIndexByCase(actions) {
  /** @type {Map<string, ActionDto[]>} */
  const index = new Map()
  for (const a of actions) {
    const cn = caseNumberForAction(a)
    const list = index.get(cn) ?? []
    list.push(a)
    index.set(cn, list)
  }
  return index
}

/**
 * @param {ActionDto[]} actions
 */
function primaryCategoryLabel(actions) {
  if (!actions.length) return 'Operasyon'
  const sorted = [...actions].sort(
    (x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || x.id.localeCompare(y.id),
  )
  return CATEGORY_LABEL[sorted[0].category] ?? sorted[0].category
}

/**
 * @param {ActionDto[]} actions
 */
function nextActionLabel(actions) {
  if (!actions.length) return '—'
  const sorted = [...actions].sort(
    (x, y) => PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority] || x.id.localeCompare(y.id),
  )
  return sorted[0].recommendedAction ?? '—'
}

/**
 * @param {string} createdAt
 * @param {string} todayIso
 */
function caseAgeDays(createdAt, todayIso) {
  const a = Date.parse(`${(createdAt ?? '').slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${todayIso}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, Math.floor((b - a) / 86_400_000))
}

/**
 * @param {OperationCaseDto} c
 * @param {ActionDto[]} actions
 */
function lastMovementLabel(c, actions) {
  const candidates = [c.updatedAt, c.createdAt]
  for (const a of actions) {
    if (a.lastActionAt) candidates.push(a.lastActionAt)
    if (a.updatedAt) candidates.push(a.updatedAt)
  }
  const latest = candidates
    .filter(Boolean)
    .sort((x, y) => (x < y ? 1 : x > y ? -1 : 0))[0]
  return latest ? latest.slice(0, 16).replace('T', ' ') : '—'
}

/**
 * @typedef {Object} OperationCaseTableRow
 * @property {string} id
 * @property {string} caseNumber
 * @property {string} customer
 * @property {string} category
 * @property {string} owner
 * @property {string} risk
 * @property {string} statusLabel
 * @property {string} lastMovement
 * @property {string} nextAction
 * @property {string} openedAt
 * @property {number} ageDays
 * @property {OperationCaseDto['priority']} priority
 * @property {OperationCaseDto['status']} status
 * @property {boolean} isClosed
 * @property {number} priorityRank
 */

/**
 * @param {OperationCaseDto} c
 * @param {ActionDto[]} actions
 * @param {string} todayIso
 * @param {OperationCaseDto['priority']} displayPriority
 * @returns {OperationCaseTableRow}
 */
function buildCaseTableRow(c, actions, todayIso, displayPriority) {
  const owner = c.ownerRole || c.ownerUserId || '—'
  return {
    id: c.id,
    caseNumber: c.caseNumber,
    customer: c.customerName ?? '—',
    category: primaryCategoryLabel(actions),
    owner,
    risk: c.riskLevel ?? '—',
    statusLabel: STATUS_LABEL[c.status] ?? c.status,
    lastMovement: lastMovementLabel(c, actions),
    nextAction: nextActionLabel(actions),
    openedAt: (c.createdAt ?? '').slice(0, 10),
    ageDays: caseAgeDays(c.createdAt, todayIso),
    priority: displayPriority,
    status: c.status,
    isClosed: c.status === 'CLOSED' || c.status === 'RESOLVED',
    priorityRank: PRIORITY_RANK[displayPriority] ?? 5,
  }
}

/**
 * @param {OperationCaseDto} c
 * @param {ActionDto[]} actions
 * @param {Map<string, Order>} orderById
 * @param {Map<string, SalesOrderListItemDto>} dtoById
 * @param {Set<string>} sshOrderIds
 * @param {Set<string>} shipmentLockOrderIds
 * @param {string} todayIso
 * @param {OperationCaseDto['priority']} displayPriority
 */
function classifyCaseFocus(
  c,
  actions,
  orderById,
  dtoById,
  sshOrderIds,
  shipmentLockOrderIds,
  todayIso,
  displayPriority,
) {
  const isActive = ACTIVE_STATUSES.has(c.status)
  if (!isActive) {
    return {
      critical: false,
      termin: false,
      collection: false,
      ssh: false,
      shipmentLock: false,
    }
  }

  let termin = false
  let collection = false
  let ssh = false
  let shipmentLock = false

  for (const oid of c.orderIds) {
    const order = orderById.get(oid)
    const dto = dtoById.get(oid)
    if (order && isTerminOverdue(order, todayIso)) termin = true
    if (order && isCollectionRiskOrder(order, dto)) collection = true
    if (sshOrderIds.has(oid)) ssh = true
    if (shipmentLockOrderIds.has(oid)) shipmentLock = true
  }

  if (!collection && actions.some((a) => a.category === 'COLLECTION')) collection = true
  if (!shipmentLock && actions.some((a) => a.category === 'SHIPMENT')) shipmentLock = true

  return {
    critical: displayPriority === 'P1',
    termin,
    collection,
    ssh,
    shipmentLock,
  }
}

/**
 * @typedef {Object} OperationCaseWarRoomView
 * @property {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} kpiMetrics
 * @property {{ id: string, label: string, count: number }[]} todayFocusItems
 * @property {OperationCaseTableRow[]} rows
 */

/**
 * @param {{
 *   casesResponse: OperationCasesResponseDto
 *   actions: ActionDto[]
 *   orders: Order[]
 *   listItemDtos?: SalesOrderListItemDto[]
 *   missingItems?: import('../../contracts/v1/missingItem.js').MissingItemDto[]
 * }} input
 * @returns {OperationCaseWarRoomView}
 */
export function buildOperationCaseWarRoomView({
  casesResponse,
  actions,
  orders,
  listItemDtos = [],
  missingItems,
}) {
  const todayIso = casesResponse.today ?? new Date().toISOString().slice(0, 10)
  const cases = casesResponse.cases ?? []
  const actionIndex = buildActionIndexByCase(actions)

  const orderById = new Map(orders.map((o) => [o.id, o]))
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))

  const sshCards = buildSshMissingPartsQueue({
    orders,
    listItemDtos,
    missingItems,
    todayIso,
  })
  const sshOrderIds = new Set(sshCards.map((c) => c.orderId))
  const shipmentLockOrderIds = new Set(
    sshCards.filter((c) => c.locksShipment).map((c) => c.orderId),
  )

  const ctx = { orderById, dtoById, sshOrderIds, shipmentLockOrderIds, todayIso }
  const managerPriorityById = buildManagerPriorityMap(cases, actionIndex, ctx)

  const activeCases = cases.filter((c) => ACTIVE_STATUSES.has(c.status))
  const assignedCount = activeCases.filter((c) => c.ownerUserId || c.ownerRole).length
  const closedToday = cases.filter((c) => (c.closedAt ?? '').slice(0, 10) === todayIso).length

  const activeP1 = activeCases.filter((c) => managerPriorityById.get(c.id) === 'P1').length
  const activeP2 = activeCases.filter((c) => managerPriorityById.get(c.id) === 'P2').length

  /** @type {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} */
  const kpiMetrics = [
    { id: 'open', label: 'Toplam Açık Vaka', value: String(activeCases.length) },
    {
      id: 'p1',
      label: 'P1 Kritik',
      value: String(activeP1),
      valueTone: activeP1 > 0 ? 'critical' : undefined,
    },
    {
      id: 'p2',
      label: 'P2 Yüksek',
      value: String(activeP2),
      valueTone: activeP2 > 0 ? 'warning' : undefined,
    },
    { id: 'assigned', label: 'Atanmış', value: String(assignedCount) },
    {
      id: 'unassigned',
      label: 'Atanmamış',
      value: String(activeCases.length - assignedCount),
      valueTone: activeCases.length - assignedCount > 0 ? 'warning' : undefined,
    },
    {
      id: 'closed-today',
      label: 'Bugün Kapanan',
      value: String(closedToday),
      valueTone: closedToday > 0 ? 'success' : undefined,
    },
  ]

  let criticalCount = 0
  let terminCount = 0
  let collectionCount = 0
  let sshCount = 0
  let shipmentLockCount = 0

  for (const c of cases) {
    const acts = actionIndex.get(c.id) ?? actionIndex.get(c.caseNumber) ?? []
    const focus = classifyCaseFocus(
      c,
      acts,
      orderById,
      dtoById,
      sshOrderIds,
      shipmentLockOrderIds,
      todayIso,
    )
    if (focus.critical) criticalCount += 1
    if (focus.termin) terminCount += 1
    if (focus.collection) collectionCount += 1
    if (focus.ssh) sshCount += 1
    if (focus.shipmentLock) shipmentLockCount += 1
  }

  /** @type {{ id: string, label: string, count: number }[]} */
  const todayFocusItems = [
    { id: 'critical', label: 'Kritik vaka', count: criticalCount },
    { id: 'termin', label: 'Termin geçen vaka', count: terminCount },
    { id: 'collection', label: 'Tahsilat riski', count: collectionCount },
    { id: 'ssh', label: 'SSH bekleyen', count: sshCount },
    { id: 'shipment', label: 'Sevk kilitleri', count: shipmentLockCount },
  ]

  const rows = cases
    .map((c) => {
      const acts = actionIndex.get(c.id) ?? actionIndex.get(c.caseNumber) ?? []
      const displayPriority = managerPriorityById.get(c.id) ?? c.priority
      return buildCaseTableRow(c, acts, todayIso, displayPriority)
    })
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
      return b.ageDays - a.ageDays
    })

  return { kpiMetrics, todayFocusItems, rows }
}

/**
 * @param {string[]} orderIds
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 */
export function buildCaseCollectionLines(orderIds, orders, listItemDtos) {
  const orderById = new Map(orders.map((o) => [o.id, o]))
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  return orderIds
    .map((oid) => {
      const order = orderById.get(oid)
      const dto = dtoById.get(oid)
      if (!order) return null
      const balance = remainingBalance(order)
      if (balance <= 0.009) return null
      return {
        orderId: oid,
        orderNumber: dto?.orderNumber ?? oid,
        balanceLabel: formatTry(balance),
        risk: isCollectionRiskOrder(order, dto) ? 'Riskli' : 'Açık bakiye',
      }
    })
    .filter(Boolean)
}

export {
  CATEGORY_LABEL,
  STATUS_LABEL,
  ACTIVE_STATUSES,
  MAX_P1_RATIO,
  buildManagerPriorityMap,
  scoreManagerPriorityTier,
}
