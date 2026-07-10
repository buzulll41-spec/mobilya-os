import { SHIPMENT_OPERATION_STATUS } from '../../contracts/v1/shipmentStatuses.js'
import { SHIPMENT_PLAN_STATUS } from '../../constants/shipmentPlanStatuses.js'
import { getOrderPilotKind } from '../../lib/pilotRecordHeuristics.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../shipment/shipmentOpsViewModel.js').ShipmentOpsKpi} ShipmentOpsKpi */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpRowTone} ErpRowTone */

/** @typedef {'all' | 'critical' | 'planned' | 'install'} ShipmentQuickFilterId */
/** @typedef {'today' | 'tomorrow' | 'week' | 'future' | 'all' | 'pending_confirm'} ShipmentHorizonId */

export const SHIPMENT_CONFIRMATION_FILTER = /** @type {const} */ ({
  id: 'pending_confirm',
  label: 'Teslim Onayı Bekleyenler',
})

export const SHIPMENT_HORIZON_FILTERS = /** @type {const} */ ([
  { id: 'today', label: 'Bugün Sevk' },
  { id: 'tomorrow', label: 'Yarın Sevk' },
  { id: 'week', label: 'Bu Hafta' },
  { id: 'future', label: 'Gelecek Sevk' },
  { id: 'all', label: 'Toplam Planlı' },
])

export const SHIPMENT_HORIZON_LEFT_FILTERS = /** @type {const} */ ([
  { id: 'today', label: 'Bugün' },
  { id: 'tomorrow', label: 'Yarın' },
  { id: 'week', label: 'Bu Hafta' },
  { id: 'future', label: 'Gelecek Sevkler' },
  { id: 'all', label: 'Tümü' },
])

export const SHIPMENT_QUICK_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm sevkler' },
  { id: 'critical', label: 'Kritik risk' },
  { id: 'planned', label: 'Planlı' },
  { id: 'install', label: 'Montaj' },
])

/**
 * @param {Record<'today' | 'tomorrow' | 'week' | 'future' | 'all', number>} counts
 */
export function buildShipmentHorizonMetrics(counts) {
  return SHIPMENT_HORIZON_FILTERS.map((f) => ({
    id: f.id,
    label: f.label,
    value: String(counts[f.id] ?? 0),
    valueTone:
      f.id === 'today' && (counts.today ?? 0) > 0
        ? /** @type {const} */ ('success')
        : f.id === 'all' && (counts.all ?? 0) > 0
          ? /** @type {const} */ ('success')
          : undefined,
  }))
}

/**
 * @typedef {Object} ShipmentPlannedTableRow
 * @property {string} id
 * @property {string} plannedDateLabel
 * @property {string} customer
 * @property {string} region
 * @property {string} vehicleLabel
 * @property {string} crewLabel
 * @property {string} statusLabel
 * @property {import('../../contracts/erpOpsTableRow.js').ErpRowTone} [tone]
 * @property {import('../../lib/pilotRecordHeuristics.js').PilotRecordKind | null} [pilotKind]
 * @property {string} orderNumber
 * @property {string} [shipmentId]
 * @property {string} [shipmentStatus]
 * @property {string} [dateIso]
 * @property {boolean} [canDispatch]
 * @property {boolean} [canDeliver]
 * @property {string} [defaultVehicle]
 * @property {string} [defaultCrew]
 * @property {string} [planId]
 * @property {string} [planStatus]
 * @property {number} [productCount]
 * @property {string} [productSummary]
 * @property {boolean} [canConfirmDelivery]
 * @property {boolean} [canFailDelivery]
 * @property {boolean} [canPostponeDelivery]
 */

/**
 * @param {ShipmentAgendaItem} item
 * @returns {ErpRowTone}
 */
function toneForAgenda(item) {
  if (item.statusTone === 'critical') return 'critical'
  if (item.statusTone === 'warn' || item.statusTone === 'warning') return 'warning'
  if (item.statusTone === 'ok' || item.statusTone === 'success') return 'success'
  return 'neutral'
}

/**
 * @param {ShipmentAgendaItem} item
 * @returns {ErpOpsTableRow}
 */
export function agendaItemToDetailStripRow(item) {
  const tone = toneForAgenda(item)
  return {
    id: item.id,
    orderNo: item.orderNumber,
    customer: item.customer,
    category: item.hasRegion ? item.region : undefined,
    statusLabel: item.statusLabel,
    dateLabel: item.hasScheduledTime
      ? `${formatShortDate(item.dateIso)} · ${item.timeLabel}`
      : formatShortDate(item.dateIso),
    nextActionLabel: `${item.vehicleLabel} · ${item.crewLabel}`,
    actionButtonLabel: 'Sipariş',
    tone,
  }
}
/**
 * @param {ShipmentAgendaItem} item
 * @param {string} [todayIso] Sevk günü kontrolü (Yola Çıktı yalnızca bugün ve sonrası)
 * @returns {ShipmentPlannedTableRow}
 */
export function agendaItemToShipmentPlannedTableRow(item, todayIso) {
  const tone = toneForAgenda(item)
  const datePart = formatShortDate(item.dateIso)
  const plannedDateLabel = item.hasScheduledTime ? `${datePart} · ${item.timeLabel}` : datePart
  const shipmentStatus = item.shipmentStatus ?? SHIPMENT_OPERATION_STATUS.PLANNED
  const pipeline = item.pipelineColumn ?? 'planned'
  const canDispatchByStatus =
    pipeline === 'planned' ||
    pipeline === 'preparing' ||
    shipmentStatus === SHIPMENT_OPERATION_STATUS.PLANNED ||
    shipmentStatus === SHIPMENT_OPERATION_STATUS.LOADED
  const canDeliver =
    pipeline === 'in_transit' || shipmentStatus === SHIPMENT_OPERATION_STATUS.DISPATCHED
  const pendingConfirm = item.planStatus === SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM
  const dispatchDayReached = !todayIso || !item.dateIso || item.dateIso <= todayIso

  return {
    id: item.id,
    orderNumber: item.orderNumber,
    plannedDateLabel,
    dateIso: item.dateIso,
    customer: item.customer,
    region: item.hasRegion ? item.region : 'Bölge belirsiz',
    vehicleLabel: item.vehicleLabel,
    crewLabel: item.crewLabel,
    statusLabel: item.statusLabel,
    tone,
    pilotKind: getOrderPilotKind({
      id: item.orderId,
      orderNumber: item.orderNumber,
      customer: item.customer,
    }),
    shipmentId: item.shipmentId,
    shipmentStatus,
    canDispatch: canDispatchByStatus && dispatchDayReached && !canDeliver && !pendingConfirm,
    canDeliver: canDeliver && !pendingConfirm,
    canConfirmDelivery: pendingConfirm,
    canFailDelivery: pendingConfirm,
    canPostponeDelivery: pendingConfirm,
    planId: item.planId,
    planStatus: item.planStatus,
    productCount: item.productCount ?? 1,
    productSummary: item.productSummary ?? '—',
    defaultVehicle: item.hasVehicle ? item.vehicleLabel : '',
    defaultCrew: item.hasCrew ? item.crewLabel.split(' · ')[0] ?? '' : '',
  }
}

/**
 * @param {ShipmentAgendaItem[]} items
 * @param {ShipmentQuickFilterId} filterId
 */
export function filterShipmentAgenda(items, filterId) {
  if (filterId === 'all') return items
  return items.filter((item) => {
    switch (filterId) {
      case 'critical':
        return item.statusTone === 'critical' || item.riskLabel.toLowerCase().includes('kritik')
      case 'planned':
        return Boolean(item.hasPlan)
      case 'install':
        return item.statusLabel.toLowerCase().includes('montaj')
      default:
        return true
    }
  })
}

/**
 * @param {ShipmentOpsKpi[]} kpis
 * @param {ShipmentAgendaItem[]} agendaItems
 */
export function buildShipmentOpsSummary(kpis, agendaItems) {
  const pick = (id, fallbackLabel, fallbackValue) => {
    const k = kpis.find((x) => x.id === id)
    return {
      id,
      label: k?.label ?? fallbackLabel,
      value: k?.value ?? fallbackValue,
      valueTone:
        k?.tone === 'critical' ? /** @type {const} */ ('critical') : k?.tone === 'warn' ? /** @type {const} */ ('warning') : k?.tone === 'ok' ? /** @type {const} */ ('success') : undefined,
    }
  }

  const criticalCount = agendaItems.filter((i) => toneForAgenda(i) === 'critical').length

  return [
    pick('today', 'Bugün planlanan', String(agendaItems.length)),
    pick('in_transit', 'Yolda', '0'),
    {
      id: 'critical',
      label: 'Kritik risk',
      value: String(criticalCount),
      valueTone: criticalCount > 0 ? /** @type {const} */ ('critical') : undefined,
    },
    {
      id: 'remaining',
      label: 'Açık tahsilat',
      value: String(
        agendaItems.filter((i) => (i.remaining ?? 0) > 0).length,
      ),
    },
  ]
}

/**
 * @param {ShipmentAgendaItem[]} items
 * @param {ShipmentQuickFilterId} filterId
 */
export function countShipmentFilter(items, filterId) {
  return filterShipmentAgenda(items, filterId).length
}
