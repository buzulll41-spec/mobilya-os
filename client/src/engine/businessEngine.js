import { DEMO_TODAY } from '../data/constants.js'
import { RISK_SEVERITY } from '../contracts/v1/enums.js'
import { SHIPMENT_OPERATION_STATUS } from '../contracts/v1/shipmentStatuses.js'
import {
  BUSINESS_DOMAIN,
  BUSINESS_ORDER_STAGE,
  BUSINESS_PRIORITY,
  BUSINESS_STAGE_LABEL,
  BUSINESS_STAGE_PROGRESS,
  BUSINESS_STAGE_SEQUENCE,
} from '../contracts/v1/businessEngine.js'
import { summarizeLineSupply } from '../mappers/operation-map/operationMapModel.js'
import { getShipmentsForSalesOrder } from '../services/mockShipmentStore.js'
import { moneyToNumber } from '../mappers/moneyHelpers.js'
import { isTerminOverdue, remainingBalance } from '../utils/orderFinance.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/businessEngine.js').BusinessOrderStage} BusinessOrderStage */
/** @typedef {import('../../contracts/v1/businessEngine.js').BusinessPriority} BusinessPriority */
/** @typedef {import('../../contracts/v1/businessEngine.js').OrderBusinessSnapshot} OrderBusinessSnapshot */

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
const round0 = (n) => Math.round(n)

/**
 * Kanban kolonu — mevcut operasyon haritası davranışı (geri uyumluluk).
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveKanbanColumnId(order, dto) {
  const status = order.status ?? dto?.displayStatus ?? ''
  if (status === 'Teslim Edildi') return 'completed'

  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  const summary = summarizeLineSupply(order.id)
  const shipments = getShipmentsForSalesOrder(order.id)
  const latest = shipments[shipments.length - 1]
  const rawShip = String(latest?.status ?? '').toUpperCase()

  if (rawShip === SHIPMENT_OPERATION_STATUS.DELIVERED && status !== 'Teslim Edildi') {
    return 'delivery_confirmation'
  }
  if (
    rawShip === SHIPMENT_OPERATION_STATUS.DISPATCHED ||
    (dto?.inTransitShipmentCount ?? 0) > 0 ||
    status === 'Yolda'
  ) {
    return 'in_transit'
  }
  if (
    rawShip === SHIPMENT_OPERATION_STATUS.LOADED ||
    rawShip === SHIPMENT_OPERATION_STATUS.PLANNED
  ) {
    return 'ready_to_ship'
  }

  const productsReady =
    summary?.allArrived || status === 'Geldi' || status === 'Hazır' || status === 'Sevke Hazır'
  if (productsReady) {
    return shipments.length > 0 ? 'ready_to_ship' : 'shipment_to_plan'
  }

  if (
    summary?.anyWaiting ||
    summary?.anyPartial ||
    (summary?.allSent && !summary.allArrived)
  ) {
    return 'product_preparing'
  }
  if (paid > 0.009 && ((summary && !summary.allSent) || status === 'Üretimde' || status === 'Yeni')) {
    return 'supply_pending'
  }
  if (paid <= 0.009 && status !== 'Yeni') {
    return 'deposit_pending'
  }
  if (paid <= 0.009) {
    return 'new_order'
  }
  return 'supply_pending'
}

/**
 * @param {string} kanbanColumnId
 * @param {boolean} fullyPaid
 */
function stageFromKanbanColumn(kanbanColumnId, fullyPaid) {
  /** @type {Record<string, BusinessOrderStage>} */
  const map = {
    new_order: BUSINESS_ORDER_STAGE.NEW_ORDER,
    deposit_pending: BUSINESS_ORDER_STAGE.DEPOSIT_PENDING,
    supply_pending: BUSINESS_ORDER_STAGE.DEPOSIT_RECEIVED,
    product_preparing: BUSINESS_ORDER_STAGE.PRODUCT_WAITING,
    shipment_to_plan: BUSINESS_ORDER_STAGE.FULLY_ARRIVED,
    ready_to_ship: BUSINESS_ORDER_STAGE.SHIPMENT_PLANNED,
    in_transit: BUSINESS_ORDER_STAGE.IN_TRANSIT,
    delivery_confirmation: BUSINESS_ORDER_STAGE.DELIVERED,
    completed: fullyPaid ? BUSINESS_ORDER_STAGE.COMPLETED : BUSINESS_ORDER_STAGE.BALANCE_PENDING,
  }
  return map[kanbanColumnId] ?? BUSINESS_ORDER_STAGE.NEW_ORDER
}

/**
 * İnce taneli aşama — kanban + tedarik özeti.
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} kanbanColumnId
 * @param {boolean} fullyPaid
 */
function refineBusinessStage(order, dto, kanbanColumnId, fullyPaid) {
  const summary = summarizeLineSupply(order.id)
  let stage = stageFromKanbanColumn(kanbanColumnId, fullyPaid)

  if (kanbanColumnId === 'supply_pending') {
    stage = BUSINESS_ORDER_STAGE.DEPOSIT_RECEIVED
  }
  if (kanbanColumnId === 'product_preparing') {
    if (summary?.allSent && summary.anyWaiting && !summary.anyPartial) {
      stage = BUSINESS_ORDER_STAGE.PRODUCT_WAITING
    } else if (summary?.anyPartial) {
      stage = BUSINESS_ORDER_STAGE.PARTIAL_ARRIVED
    } else if (summary?.allSent) {
      stage = BUSINESS_ORDER_STAGE.SUPPLY_SENT
    }
  }
  if (kanbanColumnId === 'ready_to_ship') {
    const shipments = getShipmentsForSalesOrder(order.id)
    const latest = shipments[shipments.length - 1]
    const rawShip = String(latest?.status ?? '').toUpperCase()
    stage =
      rawShip === SHIPMENT_OPERATION_STATUS.PLANNED
        ? BUSINESS_ORDER_STAGE.SHIPMENT_PLANNED
        : BUSINESS_ORDER_STAGE.FULLY_ARRIVED
  }
  if (order.status === 'Teslim Edildi' && !fullyPaid) {
    stage = BUSINESS_ORDER_STAGE.BALANCE_PENDING
  }
  if (order.status === 'Teslim Edildi' && fullyPaid) {
    stage = BUSINESS_ORDER_STAGE.COMPLETED
  }

  return stage
}

/**
 * @param {BusinessOrderStage} stage
 */
export function progressPercentForStage(stage) {
  return BUSINESS_STAGE_PROGRESS[stage] ?? 0
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
function computeRiskScores(order, dto, todayIso) {
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
  const paidRatio = total > 0 ? 1 - remaining / total : 0

  const collection =
    remaining <= 0.009
      ? 0
      : clamp(
          (dto?.hasOverdueBalance ? 70 : 35) +
            (remaining / Math.max(total, 1)) * 40 +
            (dto?.hasOverdueBalance ? 20 : 0),
          0,
          100,
        )

  const shipment =
    isTerminOverdue(order, todayIso) || (order.shipmentDate && order.shipmentDate < todayIso)
      ? clamp(55 + (dto?.hasShipmentIssue ? 35 : 15), 0, 100)
      : dto?.inTransitShipmentCount
        ? 20
        : order.shipmentDate === todayIso
          ? 25
          : 10

  const summary = summarizeLineSupply(order.id)
  let supply = 10
  if (summary?.anyWaiting) supply = 65
  else if (summary?.anyPartial) supply = 45
  else if (summary && !summary.allSent) supply = 40

  const ssh = clamp((dto?.openMissingItemsCount ?? 0) * 28 + (dto?.hasShipmentIssue ? 15 : 0), 0, 100)

  const severity = dto?.currentRiskSeverity ?? RISK_SEVERITY.NONE
  let operations = 15
  if (severity === RISK_SEVERITY.CRITICAL) operations = 90
  else if (severity === RISK_SEVERITY.HIGH) operations = 70
  else if (severity === RISK_SEVERITY.MEDIUM) operations = 45
  if (isTerminOverdue(order, todayIso)) operations = Math.max(operations, 60)

  void paidRatio
  return {
    collection: round0(collection),
    shipment: round0(shipment),
    supply: round0(supply),
    ssh: round0(ssh),
    operations: round0(operations),
  }
}

/**
 * @param {import('../../contracts/v1/businessEngine.js').BusinessRiskScores} risks
 */
function priorityFromRisks(risks) {
  const max = Math.max(
    risks.collection,
    risks.shipment,
    risks.supply,
    risks.ssh,
    risks.operations,
  )
  if (max >= 80) return BUSINESS_PRIORITY.CRITICAL
  if (max >= 60) return BUSINESS_PRIORITY.HIGH
  if (max >= 35) return BUSINESS_PRIORITY.NORMAL
  return BUSINESS_PRIORITY.LOW
}

/**
 * @param {import('../../contracts/v1/businessEngine.js').BusinessRiskScores} risks
 */
function healthScoreFromRisks(risks) {
  const avgRisk =
    (risks.collection + risks.shipment + risks.supply + risks.ssh + risks.operations) / 5
  return round0(clamp(100 - avgRisk, 0, 100))
}

/**
 * @param {BusinessOrderStage} stage
 * @param {import('../../contracts/v1/businessEngine.js').BusinessRiskScores} risks
 */
function nextActionForStage(stage, risks) {
  if (stage === BUSINESS_ORDER_STAGE.NEW_ORDER || stage === BUSINESS_ORDER_STAGE.DEPOSIT_PENDING) {
    return 'Tahsilat al.'
  }
  if (
    stage === BUSINESS_ORDER_STAGE.DEPOSIT_RECEIVED ||
    stage === BUSINESS_ORDER_STAGE.SUPPLY_SENT
  ) {
    return 'Tedarik ver.'
  }
  if (
    stage === BUSINESS_ORDER_STAGE.PRODUCT_WAITING ||
    stage === BUSINESS_ORDER_STAGE.PARTIAL_ARRIVED
  ) {
    return 'Depo girişini takip et.'
  }
  if (stage === BUSINESS_ORDER_STAGE.FULLY_ARRIVED || stage === BUSINESS_ORDER_STAGE.SHIPMENT_PLANNED) {
    return 'Sevk oluştur.'
  }
  if (stage === BUSINESS_ORDER_STAGE.IN_TRANSIT || stage === BUSINESS_ORDER_STAGE.DELIVERED) {
    return 'Teslimatı onayla.'
  }
  if (stage === BUSINESS_ORDER_STAGE.BALANCE_PENDING || risks.collection >= 50) {
    return 'Müşteriyi ara.'
  }
  if (risks.ssh >= 40) {
    return 'SSH incele.'
  }
  if (stage === BUSINESS_ORDER_STAGE.COMPLETED) {
    return '—'
  }
  return 'Siparişi takip et.'
}

/**
 * @param {BusinessOrderStage} stage
 * @param {boolean} fullyPaid
 * @param {SalesOrderListItemDto | undefined} dto
 */
function buildDomainStatuses(stage, fullyPaid, dto) {
  const stageIdx = BUSINESS_STAGE_SEQUENCE.indexOf(stage)
  /** @param {number} threshold */
  const domainState = (threshold) => {
    if (stageIdx > threshold) return 'done'
    if (stageIdx === threshold) return 'active'
    if (stageIdx === threshold - 1) return 'pending'
    return 'idle'
  }

  return [
    { domain: BUSINESS_DOMAIN.ORDER, label: 'Sipariş', status: stageIdx >= 0 ? 'done' : 'idle' },
    {
      domain: BUSINESS_DOMAIN.DEPOSIT,
      label: 'Kapora',
      status: domainState(2),
    },
    {
      domain: BUSINESS_DOMAIN.COLLECTION,
      label: 'Tahsilat',
      status: fullyPaid ? 'done' : stageIdx >= 9 ? 'active' : 'pending',
    },
    {
      domain: BUSINESS_DOMAIN.SUPPLY,
      label: 'Tedarik',
      status: domainState(3),
    },
    {
      domain: BUSINESS_DOMAIN.WAREHOUSE,
      label: 'Depo',
      status: domainState(6),
    },
    {
      domain: BUSINESS_DOMAIN.SHIPMENT,
      label: 'Sevk',
      status: domainState(8),
    },
    {
      domain: BUSINESS_DOMAIN.INSTALLATION,
      label: 'Montaj',
      status: dto?.installationPending ? 'pending' : stageIdx >= 9 ? 'done' : 'idle',
    },
    {
      domain: BUSINESS_DOMAIN.SSH,
      label: 'SSH',
      status: (dto?.openMissingItemsCount ?? 0) > 0 ? 'blocked' : 'idle',
    },
    {
      domain: BUSINESS_DOMAIN.CLOSURE,
      label: 'Kapanış',
      status: stage === BUSINESS_ORDER_STAGE.COMPLETED ? 'done' : 'idle',
    },
  ]
}

/**
 * Tek sipariş iş özeti — Business Engine çıktısı.
 * @param {{
 *   order: Order
 *   dto?: SalesOrderListItemDto
 *   todayIso?: string
 * }} input
 * @returns {OrderBusinessSnapshot}
 */
export function computeOrderBusinessSnapshot(input) {
  const { order, dto, todayIso = DEMO_TODAY } = input
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const fullyPaid = remaining <= 0.009 || order.paid === true || dto?.isFullyPaid === true

  const kanbanColumnId = resolveKanbanColumnId(order, dto)
  const currentStage = refineBusinessStage(order, dto, kanbanColumnId, fullyPaid)
  const riskScores = computeRiskScores(order, dto, todayIso)
  const priority = priorityFromRisks(riskScores)
  const healthScore = healthScoreFromRisks(riskScores)
  const progressPercent = progressPercentForStage(currentStage)
  const nextAction = nextActionForStage(currentStage, riskScores)

  return {
    orderId: order.id,
    currentStage,
    currentStageLabel: BUSINESS_STAGE_LABEL[currentStage],
    progressPercent,
    riskScores,
    priority,
    healthScore,
    nextAction,
    kanbanColumnId,
    domains: buildDomainStatuses(currentStage, fullyPaid, dto),
  }
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} [todayIso]
 * @returns {Map<string, OrderBusinessSnapshot>}
 */
export function computeOrderBusinessSnapshots(orders, listItemDtos, todayIso = DEMO_TODAY) {
  const safeOrders = Array.isArray(orders) ? orders : []
  const safeDtos = Array.isArray(listItemDtos) ? listItemDtos : []
  const dtoById = new Map(safeDtos.map((d) => [d.id, d]))
  /** @type {Map<string, OrderBusinessSnapshot>} */
  const out = new Map()
  for (const order of safeOrders) {
    out.set(order.id, computeOrderBusinessSnapshot({
      order,
      dto: dtoById.get(order.id),
      todayIso,
    }))
  }
  return out
}

/** Business Engine — ortak karar API'si */
export const BusinessEngine = {
  computeOrderSnapshot: computeOrderBusinessSnapshot,
  computeOrderSnapshots: computeOrderBusinessSnapshots,
  resolveKanbanColumnId,
  progressPercentForStage,
  stageLabel: (stage) => BUSINESS_STAGE_LABEL[stage] ?? stage,
}

export default BusinessEngine
