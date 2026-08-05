import { addDays, DEMO_TODAY } from '../../data/constants.js'
import { formatTry } from '../../data/index.js'
import { remainingBalance, isTerminOverdue } from '../../utils/orderFinance.js'
import { normalizeShipmentRegion } from './shipmentRegionNormalize.js'
import {
  buildRegionShipmentMap,
  computeWeeklySavingsPotential,
  groupShipmentOpportunities,
  toOpportunityCandidate,
} from './shipmentOpportunityEngine.js'
import { buildDailyVehiclePlan } from './shipmentVehiclePlanModel.js'
import { buildDispatchAdvisorView } from './dispatchAdvisorEngine.js'
import { resolveShipmentPipelineColumn } from '../shipment/shipmentOpsPipeline.js'
import { SHIPMENT_OPERATION_STATUS, normalizeShipmentStatusValue } from '../../contracts/v1/shipmentStatuses.js'
import { formatCrewLabel, parseCrewName } from '../../state/shipmentPlanStore.js'
import { parseTimeToMinutes } from './shipmentPlanConflict.js'
import { SHIPMENT_PLAN_STATUS } from '../../constants/shipmentPlanStatuses.js'
import { planStatusLabel } from '../../constants/shipmentPlanStatuses.js'
import {
  isMissingPartDeliveryType,
  shipmentDeliveryTypeLabel,
} from '../../constants/shipmentDeliveryTypes.js'

/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('./shipmentOpportunityEngine.js').ShipmentOpportunityGroup} ShipmentOpportunityGroup */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {Object} ShipmentAgendaItem
 * @property {string} id
 * @property {string} orderId
 * @property {string} shipmentId
 * @property {string} timeLabel
 * @property {boolean} [hasScheduledTime]
 * @property {string} region
 * @property {boolean} [hasRegion]
 * @property {string} customer
 * @property {string} product
 * @property {string} vehicleLabel
 * @property {boolean} [hasVehicle]
 * @property {string} crewLabel
 * @property {boolean} [hasCrew]
 * @property {string} [planNote]
 * @property {boolean} [hasPlan]
 * @property {string} statusLabel
 * @property {string} statusTone
 * @property {number} amount
 * @property {number} remaining
 * @property {string} riskLabel
 * @property {string} dateIso
 * @property {string} orderNumber
 * @property {string} [shipmentStatus]
 * @property {import('../shipment/shipmentOpsPipeline.js').ShipmentPipelineColumnId | null} [pipelineColumn]
 * @property {string} [planStatus]
 * @property {string} [planId]
 * @property {number} [productCount]
 * @property {string} [productSummary]
 * @property {string} [deliveryTypeLabel]
 */

/**
 * @typedef {import('../shipment/shipmentOpsViewModel.js').ShipmentOpsKpi} ShipmentOpsKpi
 */

/**
 * @param {ShipmentRowVM} row
 * @param {ShipmentPlan | undefined} [plan]
 */
function resolveAgendaStatus(row, plan) {
  if (plan?.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    return { label: planStatusLabel(plan.status), tone: 'warn' }
  }
  if (plan?.status === SHIPMENT_PLAN_STATUS.DELIVERY_FAILED) {
    return { label: planStatusLabel(plan.status), tone: 'critical' }
  }
  const col = resolveShipmentPipelineColumn(row)
  if (col === 'issue') return { label: 'Sorunlu', tone: 'critical' }
  if (col === 'in_transit') return { label: 'Yolda', tone: 'warn' }
  if (col === 'delivered') return { label: 'Teslim', tone: 'neutral' }
  if (col === 'installation') return { label: 'Montaj', tone: 'warn' }
  if (col === 'preparing') return { label: 'Hazır', tone: 'ok' }
  if (row.status === 'Hazır') return { label: 'Hazır', tone: 'ok' }
  return { label: 'Planlandı', tone: 'neutral' }
}

/**
 * @param {ShipmentRowVM} row
 * @param {string} todayIso
 */
function resolveRiskLabel(row, todayIso) {
  const rem = remainingBalance(row)
  const total = row.amount ?? 0
  if (row.hasShipmentIssue) return 'Sevk sorunu'
  if ((row.openMissingItemsCount ?? 0) > 0) return 'Eksik parça'
  if (isTerminOverdue(row, todayIso)) return 'Termin gecikti'
  if (total > 0 && rem / total >= 0.45) return 'Yüksek bakiye'
  if (rem <= 0.009) return 'Tahsilat tamam'
  return 'Normal'
}

/**
 * @param {string | undefined} product
 */
function buildProductSummary(product) {
  const raw = typeof product === 'string' ? product.trim() : ''
  if (!raw) return '—'
  if (raw.length <= 48) return raw
  return `${raw.slice(0, 45)}…`
}

/**
 * @param {ShipmentPlan | undefined} plan
 * @param {string | undefined} fallbackProduct
 */
function resolveAgendaProductSummary(plan, fallbackProduct) {
  if (plan && isMissingPartDeliveryType(plan.deliveryType)) {
    const partTitle = plan.missingItemTitle?.trim()
    const typeLabel = shipmentDeliveryTypeLabel(plan.deliveryType) ?? 'SSH / Eksik Parça Sevki'
    if (partTitle) return `${typeLabel} — ${partTitle}`
    return typeLabel
  }
  return buildProductSummary(fallbackProduct)
}

/**
 * @param {ShipmentPlan | undefined} plan
 * @returns {string | undefined}
 */
function resolveAgendaDeliveryTypeLabel(plan) {
  if (!plan || !isMissingPartDeliveryType(plan.deliveryType)) return undefined
  return shipmentDeliveryTypeLabel(plan.deliveryType) ?? 'SSH / Eksik Parça Sevki'
}

/**
 * @param {ShipmentRowVM} row
 * @param {Order | undefined} order
 * @param {ShipmentPlan | undefined} plan
 */
function resolveAgendaPlanFields(row, order, plan) {
  const notes = row.notes ?? order?.notes ?? ''
  const normalized = normalizeShipmentRegion(notes)
  const backendCrew = parseCrewName(row.crewName)

  const region = plan?.region?.trim() || normalized.region
  const hasRegion = Boolean(plan?.region?.trim()) || normalized.known

  const vehicle = plan?.vehicle?.trim() || row.vehicleNote?.trim() || ''
  const crewLabel =
    formatCrewLabel(plan?.crew1 ?? backendCrew.crew1, plan?.crew2 ?? backendCrew.crew2) || ''

  const plannedTime = plan?.plannedTime?.trim() || ''
  const hasScheduledTime = Boolean(plannedTime)
  const planNote = plan?.note?.trim() || ''

  const hasPlan = Boolean(
    plan ||
      plannedTime ||
      vehicle ||
      crewLabel ||
      planNote ||
      (plan?.region?.trim() && plan.region !== normalized.region),
  )

  return {
    region,
    hasRegion,
    timeLabel: hasScheduledTime ? plannedTime : '—',
    hasScheduledTime,
    vehicleLabel: vehicle || 'Araç atanmadı',
    hasVehicle: Boolean(vehicle),
    crewLabel: crewLabel || 'Ekip atanmadı',
    hasCrew: Boolean(crewLabel),
    planNote,
    hasPlan,
  }
}

/** @typedef {'today' | 'tomorrow' | 'week' | 'future' | 'all' | 'overdue' | 'pending_confirm' | null} ShipmentAgendaHorizon */

/**
 * @param {ShipmentRowVM} row
 * @param {string} dateIso
 * @param {string} todayIso
 */
function isAgendaOverdue(row, dateIso, todayIso) {
  if (isTerminOverdue(row, todayIso)) return true
  return dateIso < todayIso && row.status !== 'Teslim Edildi'
}

/**
 * @param {ShipmentRowVM | undefined} row
 * @param {string} dateIso
 * @param {string} todayIso
 * @param {ShipmentAgendaHorizon} horizon
 * @param {string} selectedDate
 */
export function matchesShipmentAgendaHorizon(row, dateIso, todayIso, horizon, selectedDate) {
  if (!dateIso) return false
  if (horizon === 'all') return true
  if (horizon === 'today') return dateIso === todayIso
  if (horizon === 'tomorrow') return dateIso === addDays(todayIso, 1)
  if (horizon === 'week') return dateIso >= todayIso && dateIso <= addDays(todayIso, 6)
  if (horizon === 'future') return dateIso > addDays(todayIso, 6)
  if (horizon === 'overdue') return row ? isAgendaOverdue(row, dateIso, todayIso) : dateIso < todayIso
  if (horizon === 'pending_confirm') return false
  return dateIso === selectedDate
}

/**
 * @param {ShipmentAgendaItem[]} items
 * @param {Map<string, ShipmentRowVM>} rowById
 * @param {string} todayIso
 * @param {string} selectedDate
 */
export function countShipmentHorizonItems(items, rowById, todayIso, selectedDate, plansByOrderId = new Map()) {
  /** @type {Record<'today' | 'tomorrow' | 'week' | 'future' | 'all' | 'pending_confirm', number>} */
  const counts = { today: 0, tomorrow: 0, week: 0, future: 0, all: items.length, pending_confirm: 0 }
  for (const item of items) {
    const row = rowById.get(item.orderId)
    const plan = plansByOrderId.get(item.orderId)
    if (plan?.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
      counts.pending_confirm += 1
    }
    for (const horizon of /** @type {const} */ (['today', 'tomorrow', 'week', 'future'])) {
      if (matchesShipmentAgendaHorizon(row, item.dateIso, todayIso, horizon, selectedDate)) {
        counts[horizon] += 1
      }
    }
  }
  return counts
}

/**
 * @param {string} orderId
 * @param {Map<string, ShipmentPlan>} plansByOrderId
 */
export function hasScheduledShipmentPlan(orderId, plansByOrderId) {
  return Boolean(plansByOrderId.get(orderId)?.plannedDate)
}

/**
 * @param {ShipmentAgendaItem} item
 * @param {ShipmentPlan | undefined} plan
 * @param {ShipmentRowVM | undefined} [row]
 * @returns {ShipmentPlan}
 */
export function buildInitialPlanFromAgendaItem(item, plan, row) {
  const backendCrew = parseCrewName(row?.crewName)
  return {
    id: plan?.id,
    orderId: item.orderId,
    plannedDate: plan?.plannedDate || item.dateIso,
    plannedTime: plan?.plannedTime || (item.hasScheduledTime ? item.timeLabel : ''),
    region:
      plan?.region ||
      (item.region !== 'Bölge Belirsiz' ? item.region : ''),
    vehicle:
      plan?.vehicle ||
      row?.vehicleNote?.trim() ||
      (item.hasVehicle ? item.vehicleLabel : ''),
    crew1: plan?.crew1 || backendCrew.crew1,
    crew2: plan?.crew2 || backendCrew.crew2,
    note: plan?.note || item.planNote || '',
    groupId: plan?.groupId,
    deliveryType: plan?.deliveryType,
    missingItemId: plan?.missingItemId,
    missingItemTitle: plan?.missingItemTitle,
    updatedAt: plan?.updatedAt || new Date().toISOString(),
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} plan
 * @returns {ShipmentAgendaItem}
 */
export function buildAgendaItemFromOrder(order, dto, plan) {
  const dateIso =
    plan?.plannedDate ||
    dto?.plannedShipmentDate?.slice(0, 10) ||
    order.shipmentDate ||
    order.dueDate ||
    DEMO_TODAY
  const notes = order.notes ?? dto?.notesSnapshot ?? ''
  const normalized = normalizeShipmentRegion(notes)
  const row = /** @type {ShipmentRowVM} */ ({
    ...order,
    notes,
    crewName: null,
    remainingQty: 0,
  })
  const planFields = resolveAgendaPlanFields(row, order, plan)
  const status = resolveAgendaStatus(row, plan)

  return {
    id: `${order.id}-${dateIso}`,
    orderId: order.id,
    shipmentId: order.id,
    customer: order.customer ?? '—',
    product: order.product ?? '—',
    statusLabel: status.label,
    statusTone: status.tone,
    amount: order.amount ?? 0,
    remaining: remainingBalance(order),
    riskLabel: resolveRiskLabel(row, DEMO_TODAY),
    dateIso,
    orderNumber: dto?.orderNumber ?? order.id,
    planStatus: plan?.status,
    planId: plan?.id ?? (plan ? `plan-${order.id}` : undefined),
    productCount: 1,
    productSummary: resolveAgendaProductSummary(plan, order.product),
    deliveryTypeLabel: resolveAgendaDeliveryTypeLabel(plan),
    ...planFields,
  }
}

/**
 * @param {{
 *   shipmentRows: ShipmentRowVM[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   selectedDate: string
 *   agendaHorizon?: ShipmentAgendaHorizon
 *   plansByOrderId?: Map<string, ShipmentPlan>
 * }} input
 */
export function buildShipmentOpsV3View({
  shipmentRows,
  orders,
  listItemDtos,
  todayIso,
  selectedDate,
  agendaHorizon = 'all',
  plansByOrderId = new Map(),
}) {
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const orderById = new Map(orders.map((o) => [o.id, o]))
  /** @type {Map<string, ShipmentRowVM>} */
  const rowById = new Map()

  for (const row of shipmentRows) {
    if (row?.id) rowById.set(row.id, row)
  }
  for (const order of orders) {
    if (!rowById.has(order.id)) {
      rowById.set(order.id, /** @type {ShipmentRowVM} */ ({ ...order, remainingQty: 0 }))
    }
  }

  /** @type {ShipmentAgendaItem[]} */
  const allAgendaItems = []
  for (const row of rowById.values()) {
    const plan = plansByOrderId.get(row.id)
    const baseDate = row.plannedShipDate ?? row.shipmentDate ?? row.dueDate
    const dateIso = plan?.plannedDate || baseDate
    if (!dateIso) continue
    if (row.status === 'Teslim Edildi' && !row.shipmentDate && !plan) continue

    const order = orderById.get(row.id)
    const status = resolveAgendaStatus(row, plan)
    const planFields = resolveAgendaPlanFields(row, order, plan)
    const pipelineColumn = resolveShipmentPipelineColumn(row)
    const shipmentStatus = normalizeShipmentStatusValue(String(row.shipmentStatus ?? ''))

    allAgendaItems.push({
      id: `${row.id}-${dateIso}`,
      orderId: row.id,
      shipmentId: 'shipmentId' in row && row.shipmentId ? row.shipmentId : row.id,
      customer: row.customer ?? '—',
      product: row.product ?? '—',
      statusLabel: status.label,
      statusTone: status.tone,
      amount: row.amount ?? 0,
      remaining: remainingBalance(row),
      riskLabel: resolveRiskLabel(row, todayIso),
      dateIso,
      orderNumber: row.orderNumber ?? row.id,
      shipmentStatus,
      pipelineColumn,
      planStatus: plan?.status,
      planId: plan?.id ?? (plan ? `plan-${row.id}` : undefined),
      productCount: 1,
      productSummary: resolveAgendaProductSummary(plan, row.product ?? order?.product),
      deliveryTypeLabel: resolveAgendaDeliveryTypeLabel(plan),
      ...planFields,
    })
  }

  for (const [orderId, plan] of plansByOrderId) {
    if (!plan?.plannedDate) continue
    if (allAgendaItems.some((item) => item.orderId === orderId && item.dateIso === plan.plannedDate)) {
      continue
    }

    const row = rowById.get(orderId)
    const order = orderById.get(orderId)
    if (!row && !order) continue

    const baseRow =
      row ??
      /** @type {ShipmentRowVM} */ ({
        ...order,
        remainingQty: 0,
        notes: order?.notes ?? '',
      })
    const status = resolveAgendaStatus(baseRow, plan)
    const planFields = resolveAgendaPlanFields(baseRow, order, plan)
    const pipelineColumn = resolveShipmentPipelineColumn(baseRow)
    const shipmentStatus = normalizeShipmentStatusValue(String(baseRow.shipmentStatus ?? ''))

    allAgendaItems.push({
      id: `${orderId}-${plan.plannedDate}`,
      orderId,
      shipmentId: baseRow.shipmentId ?? orderId,
      customer: baseRow.customer ?? order?.customer ?? '—',
      product: baseRow.product ?? order?.product ?? '—',
      statusLabel: status.label,
      statusTone: status.tone,
      amount: baseRow.amount ?? order?.amount ?? 0,
      remaining: remainingBalance(baseRow),
      riskLabel: resolveRiskLabel(baseRow, todayIso),
      dateIso: plan.plannedDate,
      orderNumber: baseRow.orderNumber ?? orderId,
      shipmentStatus,
      pipelineColumn,
      planStatus: plan.status,
      planId: plan.id ?? `plan-${orderId}`,
      productCount: 1,
      productSummary: resolveAgendaProductSummary(plan, baseRow.product ?? order?.product),
      deliveryTypeLabel: resolveAgendaDeliveryTypeLabel(plan),
      ...planFields,
    })
  }

  const plannedAgendaItems = allAgendaItems.filter((item) => {
    const plan = plansByOrderId.get(item.orderId)
    if (plan?.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) return true
    if (!hasScheduledShipmentPlan(item.orderId, plansByOrderId)) return false
    const row = rowById.get(item.orderId)
    if (row?.status === 'Teslim Edildi') return false
    const col = item.pipelineColumn ?? (row ? resolveShipmentPipelineColumn(row) : 'planned')
    return col !== 'delivered'
  })

  const horizonCounts = countShipmentHorizonItems(
    plannedAgendaItems,
    rowById,
    todayIso,
    selectedDate,
    plansByOrderId,
  )

  const agendaItems = plannedAgendaItems.filter((item) => {
    const plan = plansByOrderId.get(item.orderId)
    if (agendaHorizon === 'pending_confirm') {
      return plan?.status === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM
    }
    return matchesShipmentAgendaHorizon(
      rowById.get(item.orderId),
      item.dateIso,
      todayIso,
      agendaHorizon,
      selectedDate,
    )
  })

  agendaItems.sort((a, b) => {
    const ta = parseTimeToMinutes(a.hasScheduledTime ? a.timeLabel : '')
    const tb = parseTimeToMinutes(b.hasScheduledTime ? b.timeLabel : '')
    if (ta != null && tb != null && ta !== tb) return ta - tb
    if (ta != null && tb == null) return -1
    if (ta == null && tb != null) return 1
    return a.customer.localeCompare(b.customer, 'tr')
  })

  /** @type {import('./shipmentOpportunityEngine.js').ShipmentOpportunityCandidate[]} */
  const opportunityCandidates = []
  for (const row of rowById.values()) {
    const c = toOpportunityCandidate(row, selectedDate, plansByOrderId.get(row.id))
    if (c) opportunityCandidates.push(c)
  }
  const opportunities = groupShipmentOpportunities(opportunityCandidates, selectedDate)
  const regionMap = buildRegionShipmentMap(opportunityCandidates)
  const weeklySavings = computeWeeklySavingsPotential(rowById.values(), todayIso, plansByOrderId)
  const vehiclePlan = buildDailyVehiclePlan(agendaItems)
  const advisor = buildDispatchAdvisorView({
    rows: rowById.values(),
    opportunities,
    vehiclePlan,
    allPlans: [...plansByOrderId.values()],
    plansByOrderId,
    selectedDate,
    todayIso,
  })

  let todayPlanned = 0
  let inTransit = 0
  let deliveryPending = 0
  let installation = 0
  let issue = 0

  for (const row of rowById.values()) {
    const col = resolveShipmentPipelineColumn(row)
    if (!col) continue
    if (col === 'issue') issue += 1
    if (col === 'in_transit') inTransit += 1
    if (col === 'delivered') deliveryPending += 1
    if (col === 'installation') installation += 1
    const date = row.plannedShipDate ?? row.shipmentDate ?? ''
    if ((col === 'planned' || col === 'preparing') && date === todayIso) todayPlanned += 1
  }

  /** @type {ShipmentOpsKpi[]} */
  const kpis = [
    {
      id: 'health',
      label: 'Operasyon sağlığı',
      value: advisor.health.label,
      hint: advisor.health.penalties[0] ?? advisor.health.bonuses[0] ?? 'Dengeli operasyon',
      tone: advisor.health.score >= 85 ? 'ok' : advisor.health.score >= 65 ? 'warn' : 'critical',
    },
    {
      id: 'today',
      label: 'Bugün planlanan',
      value: String(todayPlanned),
      hint: todayPlanned ? 'Günlük plan' : 'Bugün plan yok',
      tone: todayPlanned > 4 ? 'warn' : 'ok',
    },
    {
      id: 'transit',
      label: 'Yolda',
      value: String(inTransit),
      tone: inTransit > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'delivered',
      label: 'Teslim bekleyen',
      value: String(deliveryPending),
      tone: deliveryPending > 0 ? 'neutral' : 'ok',
    },
    {
      id: 'install',
      label: 'Montaj bekleyen',
      value: String(installation),
      tone: installation > 0 ? 'warn' : 'ok',
    },
    {
      id: 'issue',
      label: 'Sorunlu sevk',
      value: String(issue),
      tone: issue > 0 ? 'critical' : 'ok',
    },
    {
      id: 'savings',
      label: 'Sevk tasarrufu',
      value: formatTry(weeklySavings),
      hint: 'Bu hafta gruplanabilecek tahmini tasarruf',
      tone: weeklySavings > 0 ? 'ok' : 'neutral',
    },
  ]

  const weekDays = []
  for (let i = 0; i < 7; i++) weekDays.push(addDays(todayIso, i))

  return {
    kpis,
    agendaItems,
    allAgendaItems: plannedAgendaItems,
    horizonCounts,
    opportunities,
    savingsOpportunities: opportunities,
    regionMap,
    vehiclePlan,
    weeklySavings,
    weekDays,
    selectedDate,
    todayIso,
    advisor,
  }
}
