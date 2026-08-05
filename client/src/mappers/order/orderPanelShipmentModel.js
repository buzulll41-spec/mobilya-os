import { formatShortDate } from '../../utils/dates.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import {
  FULFILLMENT_STATE,
  INSTALLATION_STATE,
  PRODUCTION_STATE,
} from '../../contracts/v1/orderOperationalState.js'
import {
  FULFILLMENT_STATE_LABELS,
  INSTALLATION_STATE_LABELS,
  PRODUCTION_STATE_LABELS,
  labelFor,
} from '../operational/operationalStateLabelsTr.js'
import { SHIPMENT_OPERATION_STATUS } from '../../contracts/v1/shipmentStatuses.js'
import { shipmentStatusOrPlanned } from '../shipment/shipmentStatusLabel.js'
import { formatCrewLabel } from '../../state/shipmentPlanStore.js'
import { PRODUCT_READINESS_STATUS } from '../receiving/productReadiness.js'
import { buildOrderTimeline } from '../../utils/orderTimeline.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */
/** @typedef {import('../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */
/** @typedef {import('./orderPanelProductsModel.js').OrderPanelProductRow} OrderPanelProductRow */
/** @typedef {import('../../utils/orderTimeline.js').TimelineStep} TimelineStep */

/** @typedef {'done' | 'waiting' | 'problem' | 'planned' | 'idle'} OpsTone */
/** @typedef {'waiting' | 'ready' | 'transit' | 'delivered' | 'install-pending' | 'install-done' | 'problem'} ShipmentBadgeId */

/**
 * @typedef {Object} OpsSummaryItem
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {OpsTone} tone
 */

/**
 * @typedef {Object} ShipmentRiskAlert
 * @property {'warning' | 'critical'} tone
 * @property {string} message
 */

/**
 * @typedef {Object} ShipmentPlanRow
 * @property {string} id
 * @property {string} plannedDateLabel
 * @property {string} vehicleLabel
 * @property {string} crewLabel
 * @property {string} statusLabel
 * @property {ShipmentBadgeId} statusBadge
 * @property {string} noteLabel
 * @property {'plan' | 'record'} source
 */

/**
 * @param {OpsTone} tone
 */
function opsToneToMetricTone(tone) {
  switch (tone) {
    case 'done':
      return /** @type {const} */ ('success')
    case 'waiting':
      return /** @type {const} */ ('warning')
    case 'problem':
      return /** @type {const} */ ('critical')
    default:
      return /** @type {const} */ ('neutral')
  }
}

/**
 * @param {import('../../contracts/v1/orderOperationalState.js').ProductionState | undefined} state
 */
function resolveProductOpsSummary(state) {
  switch (state) {
    case PRODUCTION_STATE.READY:
      return { value: 'Hazır', tone: /** @type {OpsTone} */ ('done') }
    case PRODUCTION_STATE.IN_PRODUCTION:
      return { value: 'Üretimde', tone: /** @type {OpsTone} */ ('waiting') }
    case PRODUCTION_STATE.WAITING_FACTORY:
      return { value: 'Bekleniyor', tone: /** @type {OpsTone} */ ('waiting') }
    case PRODUCTION_STATE.ISSUE:
      return { value: 'Eksik / sorun', tone: /** @type {OpsTone} */ ('problem') }
    case PRODUCTION_STATE.NOT_STARTED:
    default:
      return { value: 'Başlanmadı', tone: /** @type {OpsTone} */ ('idle') }
  }
}

/**
 * @param {import('../../contracts/v1/orderOperationalState.js').FulfillmentState | undefined} state
 * @param {number} inTransit
 */
function resolveShipmentOpsSummary(state, inTransit) {
  if (inTransit > 0) return { value: 'Yolda', tone: /** @type {OpsTone} */ ('planned') }
  switch (state) {
    case FULFILLMENT_STATE.DELIVERED:
      return { value: 'Teslim Edildi', tone: /** @type {OpsTone} */ ('done') }
    case FULFILLMENT_STATE.SHIPPED:
      return { value: 'Sevk edildi', tone: /** @type {OpsTone} */ ('done') }
    case FULFILLMENT_STATE.PLANNED:
      return { value: 'Planlandı', tone: /** @type {OpsTone} */ ('planned') }
    case FULFILLMENT_STATE.PARTIAL:
      return { value: 'Kısmi sevk', tone: /** @type {OpsTone} */ ('waiting') }
    case FULFILLMENT_STATE.NOT_PLANNED:
    default:
      return { value: 'Başlanmadı', tone: /** @type {OpsTone} */ ('idle') }
  }
}

/**
 * @param {import('../../contracts/v1/orderOperationalState.js').InstallationState | undefined} state
 */
function resolveInstallationOpsSummary(state) {
  switch (state) {
    case INSTALLATION_STATE.DONE:
      return { value: 'Montaj Tamamlandı', tone: /** @type {OpsTone} */ ('done') }
    case INSTALLATION_STATE.PENDING:
      return { value: 'Montaj Bekliyor', tone: /** @type {OpsTone} */ ('waiting') }
    case INSTALLATION_STATE.ISSUE:
      return { value: 'Montaj sorunu', tone: /** @type {OpsTone} */ ('problem') }
    case INSTALLATION_STATE.NOT_REQUIRED:
    default:
      return { value: 'Gerekmez', tone: /** @type {OpsTone} */ ('idle') }
  }
}

/**
 * @param {Order} order
 */
function resolveDeliveryOpsSummary(order) {
  if (order.status === 'Teslim Edildi') {
    return { value: 'Teslim Edildi', tone: /** @type {OpsTone} */ ('done') }
  }
  if (['Hazır', 'Geldi'].includes(order.status ?? '')) {
    return { value: 'Bekliyor', tone: /** @type {OpsTone} */ ('waiting') }
  }
  return { value: 'Başlanmadı', tone: /** @type {OpsTone} */ ('idle') }
}

/**
 * @param {ShipmentPlan | undefined} plan
 * @param {Order} order
 */
function resolvePlannedDateSummary(plan, order) {
  const raw = plan?.plannedDate ?? order.shipmentDate ?? null
  if (!raw) return { value: '—', tone: /** @type {OpsTone} */ ('idle') }
  return { value: formatShortDate(raw), tone: /** @type {OpsTone} */ ('planned') }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} plan
 */
export function buildOrderPanelShipmentOpsSummary(order, dto, plan) {
  const op = dto?.operationalState
  const product = resolveProductOpsSummary(op?.productionState)
  const shipment = resolveShipmentOpsSummary(op?.fulfillmentState, dto?.inTransitShipmentCount ?? 0)
  const installation = resolveInstallationOpsSummary(op?.installationState)
  const delivery = resolveDeliveryOpsSummary(order)
  const planned = resolvePlannedDateSummary(plan, order)

  /** @type {OpsSummaryItem[]} */
  const items = [
    { id: 'product', label: 'Ürün Durumu', value: product.value, tone: product.tone },
    { id: 'shipment', label: 'Sevk Durumu', value: shipment.value, tone: shipment.tone },
    { id: 'installation', label: 'Montaj Durumu', value: installation.value, tone: installation.tone },
    { id: 'delivery', label: 'Teslim Durumu', value: delivery.value, tone: delivery.tone },
    { id: 'planned', label: 'Planlanan Tarih', value: planned.value, tone: planned.tone },
  ]

  return items.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
    valueTone: opsToneToMetricTone(item.tone),
    itemTone: item.tone,
  }))
}

/**
 * @param {OrderPanelProductRow[]} rows
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildOrderPanelShipmentKpis(rows, dto) {
  const totalLines = rows.length
  const arrivedLines = rows.filter((r) => r.qtyReceived > 0.0001).length
  const missingLines = rows.filter((r) => r.readinessStatus === PRODUCT_READINESS_STATUS.MISSING).length
  const readyLines = rows.filter((r) => r.readinessStatus === PRODUCT_READINESS_STATUS.READY).length
  const installNeeded = dto?.installationPending ? Math.max(1, totalLines - readyLines) : 0

  return [
    { id: 'total', label: 'Toplam Ürün', value: String(totalLines), valueTone: /** @type {const} */ ('neutral') },
    { id: 'arrived', label: 'Geldi işaretli', value: String(arrivedLines), valueTone: /** @type {const} */ ('success') },
    { id: 'missing', label: 'Eksik Ürün', value: String(missingLines), valueTone: /** @type {const} */ ('critical') },
    { id: 'ready', label: 'Sevke Hazır', value: String(readyLines), valueTone: /** @type {const} */ ('neutral') },
    {
      id: 'install',
      label: 'Montaj Gerekiyor',
      value: String(installNeeded),
      valueTone: installNeeded > 0 ? /** @type {const} */ ('warning') : /** @type {const} */ ('neutral'),
    },
  ]
}

/**
 * @param {Order} order
 * @param {ShipmentPlan | undefined} plan
 */
export function buildOrderPanelShipmentTimeline(order, plan) {
  const base = buildOrderTimeline(order).map((step) => {
    if (step.key === 'production') return { ...step, label: 'Fabrikaya geçildi' }
    if (step.key === 'shipment' && plan?.plannedDate) {
      return { ...step, done: true, dateLabel: formatShortDate(plan.plannedDate) }
    }
    return step
  })
  return base
}

/**
 * @param {string | undefined | null} status
 * @param {boolean} installationPending
 */
export function mapShipmentStatusBadge(status, installationPending = false) {
  const s = shipmentStatusOrPlanned(status)
  switch (s) {
    case SHIPMENT_OPERATION_STATUS.PLANNED:
    case 'ON_HOLD':
    case 'PICKING':
      return { label: 'Bekliyor', badge: /** @type {ShipmentBadgeId} */ ('waiting') }
    case 'READY_TO_DISPATCH':
    case SHIPMENT_OPERATION_STATUS.LOADED:
      return { label: 'Hazır', badge: /** @type {ShipmentBadgeId} */ ('ready') }
    case SHIPMENT_OPERATION_STATUS.DISPATCHED:
      return { label: 'Yolda', badge: /** @type {ShipmentBadgeId} */ ('transit') }
    case SHIPMENT_OPERATION_STATUS.DELIVERED:
      return installationPending
        ? { label: 'Montaj Bekliyor', badge: /** @type {ShipmentBadgeId} */ ('install-pending') }
        : { label: 'Teslim Edildi', badge: /** @type {ShipmentBadgeId} */ ('delivered') }
    case SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE:
      return { label: 'Montaj Tamamlandı', badge: /** @type {ShipmentBadgeId} */ ('install-done') }
    case SHIPMENT_OPERATION_STATUS.ISSUE:
      return { label: 'Sorun var', badge: /** @type {ShipmentBadgeId} */ ('problem') }
    default:
      return { label: 'Bekliyor', badge: /** @type {ShipmentBadgeId} */ ('waiting') }
  }
}

/**
 * @param {ShipmentPlan | undefined} plan
 * @param {ShipmentDto[]} shipments
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildOrderPanelShipmentPlanRows(plan, shipments, dto) {
  /** @type {ShipmentPlanRow[]} */
  const rows = []

  if (plan) {
    const crew = formatCrewLabel(plan.crew1, plan.crew2)
    const { label, badge } = mapShipmentStatusBadge(
      shipments[0]?.status,
      Boolean(dto?.installationPending),
    )
    rows.push({
      id: `plan-${plan.orderId}`,
      plannedDateLabel: plan.plannedDate ? formatShortDate(plan.plannedDate) : '—',
      vehicleLabel: plan.vehicle?.trim() || 'Atanmadı',
      crewLabel: crew || 'Atanmadı',
      statusLabel: label,
      statusBadge: badge,
      noteLabel: plan.note?.trim() || '—',
      source: 'plan',
    })
  }

  for (const s of shipments) {
    const { label, badge } = mapShipmentStatusBadge(s.status, Boolean(dto?.installationPending))
    rows.push({
      id: s.id,
      plannedDateLabel: s.plannedShipDate
        ? formatShortDate(s.plannedShipDate)
        : s.actualShipDate
          ? formatShortDate(s.actualShipDate)
          : '—',
      vehicleLabel: s.vehicleNote?.trim() || plan?.vehicle?.trim() || '—',
      crewLabel: s.crewName?.trim() || formatCrewLabel(plan?.crew1, plan?.crew2) || '—',
      statusLabel: label,
      statusBadge: badge,
      noteLabel: s.note?.trim() || '—',
      source: 'record',
    })
  }

  return rows
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {OrderPanelProductRow[]} productRows
 */
export function buildOrderPanelShipmentRiskAlerts(order, dto, productRows) {
  /** @type {ShipmentRiskAlert[]} */
  const alerts = []
  const rem = remainingBalance(order)
  const missingLines = productRows.filter((r) => r.readinessStatus === PRODUCT_READINESS_STATUS.MISSING).length
  const notArrived = productRows.filter((r) => r.qtyReceived <= 0.0001).length

  if (missingLines > 0) {
    alerts.push({
      tone: 'critical',
      message: `Bu siparişte ${missingLines} eksik ürün var.`,
    })
  }
  if (rem > 0.009) {
    alerts.push({
      tone: 'warning',
      message: 'Tahsilat tamamlanmamış — sevk öncesi bakiye kontrol edin.',
    })
  }
  if (notArrived > 0) {
    alerts.push({
      tone: 'warning',
      message: `${notArrived} ürün henüz geldi olarak işaretlenmedi.`,
    })
  }

  return alerts
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveShipmentOpsStatusLabel(dto) {
  const op = dto?.operationalState
  if (!op) return '—'
  const parts = [
    labelFor(PRODUCTION_STATE_LABELS, op.productionState),
    labelFor(FULFILLMENT_STATE_LABELS, op.fulfillmentState),
    labelFor(INSTALLATION_STATE_LABELS, op.installationState),
  ]
  return parts.filter(Boolean).join(' · ')
}
