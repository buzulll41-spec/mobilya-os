import { formatTry } from '../../data/dashboardHelpers.js'
import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { FULFILLMENT_STATE } from '../../contracts/v1/orderOperationalState.js'
import { shipmentColumnLabelFromDisplayStatus } from '../../lib/orderShipmentDisplayStatus.js'
import { getOrderPilotKind } from '../../lib/pilotRecordHeuristics.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { OPERATIONAL_RISK_STATE_LABELS, labelFor } from '../../mappers/operational/operationalStateLabelsTr.js'

/** @typedef {import('../../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpRowTone} ErpRowTone */

/** @typedef {'all' | 'new' | 'production' | 'shipment-wait' | 'completed' | 'critical'} OrdersOpsFilterId */

/**
 * @typedef {Object} OrdersOpsTableRow
 * @property {string} id
 * @property {string} orderNo
 * @property {string} customer
 * @property {string} product
 * @property {string} terminLabel
 * @property {boolean} terminOverdue
 * @property {string} collectionLabel
 * @property {string} shipmentLabel
 * @property {string} riskLabel
 * @property {string} statusLabel
 * @property {string} lastActionLabel
 * @property {ErpRowTone} tone
 * @property {ErpRowTone} [riskTone]
 * @property {ErpRowTone} [collectionTone]
 */

/**
 * @typedef {Object} OrdersOpsDetailView
 * @property {string} customer
 * @property {string} orderNo
 * @property {string} terminLabel
 * @property {string} collectionLabel
 * @property {string} shipmentLabel
 * @property {string} riskLabel
 * @property {ErpRowTone} riskTone
 * @property {ErpRowTone} collectionTone
 */

export const ORDERS_OPS_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'new', label: 'Yeni Sipariş' },
  { id: 'production', label: 'Üretimde' },
  { id: 'shipment-wait', label: 'Sevk Bekliyor' },
  { id: 'completed', label: 'Tamamlandı' },
  { id: 'critical', label: 'Kritik Risk' },
])

/**
 * @param {OrderListRowVM} row
 */
export function isOpenOrder(row) {
  return row.status !== 'Teslim Edildi'
}

/**
 * @param {OrderListRowVM} row
 */
export function isNewOrder(row) {
  return row.status === 'Bekleniyor'
}

/**
 * @param {OrderListRowVM} row
 */
export function isProductionOrder(row) {
  return row.status === 'Üretimde' || row.status === 'Geldi'
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function isShipmentWaitingOrder(row, dto) {
  if (row.status === 'Hazır') return true
  if (!dto || !isOpenOrder(row)) return false
  const rem = Number.parseFloat(dto.remainingQty ?? '0')
  if ((dto.shipmentSummaryOpenCount ?? 0) > 0 && Number.isFinite(rem) && rem > 0.001) return true
  const fs = dto.operationalState?.fulfillmentState
  return fs === FULFILLMENT_STATE.PLANNED || fs === FULFILLMENT_STATE.PARTIAL
}

/**
 * @param {OrderListRowVM} row
 */
export function isCompletedOrder(row) {
  return row.status === 'Teslim Edildi'
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function isCriticalRiskOrder(row, dto, todayIso) {
  if (dto?.currentRiskSeverity === RISK_SEVERITY.CRITICAL || dto?.currentRiskSeverity === RISK_SEVERITY.HIGH) {
    return true
  }
  if (isTerminOverdue(row, todayIso) && isOpenOrder(row)) return true
  if ((dto?.openMissingItemsCount ?? 0) > 0) return true
  if (dto?.hasShipmentIssue) return true
  if (dto?.riskSignalOverduePartialShipment) return true
  if (row.status === 'Eksik Var') return true
  return false
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function isCollectionRiskOrder(row, dto) {
  const rem = remainingBalance(row)
  if (rem <= 0.009) return false
  if (dto?.hasOverdueBalance) return true
  if (dto?.operationalState?.financialState === 'OVERDUE') return true
  return rem > 0.009 && isOpenOrder(row)
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @returns {ErpRowTone}
 */
function rowTone(row, dto, todayIso) {
  if (isCriticalRiskOrder(row, dto, todayIso)) return 'critical'
  if (isCollectionRiskOrder(row, dto)) return 'warning'
  if (isCompletedOrder(row)) return 'success'
  return 'neutral'
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function buildRiskLabel(row, dto, todayIso) {
  if ((dto?.openMissingItemsCount ?? 0) > 0) return 'Eksik Parça'
  if (isTerminOverdue(row, todayIso) && isOpenOrder(row)) return 'Termin geçti'
  if (dto?.currentRiskSeverity === RISK_SEVERITY.CRITICAL) return 'Kritik'
  if (dto?.currentRiskSeverity === RISK_SEVERITY.HIGH) return 'Yüksek'
  if (dto?.operationalState?.riskState) {
    return labelFor(OPERATIONAL_RISK_STATE_LABELS, dto.operationalState.riskState)
  }
  return 'Normal'
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildCollectionLabel(row, dto) {
  const rem = remainingBalance(row)
  if (rem <= 0.009) return 'Kapandı'
  if (dto?.hasOverdueBalance) return `Gecikmiş · ${formatTry(rem)}`
  if (dto?.paymentProgress != null) {
    return `%${Math.round(dto.paymentProgress * 100)} · ${formatTry(rem)}`
  }
  return formatTry(rem)
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildShipmentLabel(row, dto) {
  const fromDisplay = shipmentColumnLabelFromDisplayStatus(dto?.displayStatus ?? row.status)
  if (fromDisplay) return fromDisplay
  if (isCompletedOrder(row)) return 'Teslim'
  if ((dto?.inTransitShipmentCount ?? 0) > 0) return 'Yolda'
  if (row.status === 'Hazır') return 'Bekliyor'
  if ((dto?.shipmentSummaryOpenCount ?? 0) > 0) return 'Planlı'
  const fs = dto?.operationalState?.fulfillmentState
  if (fs === FULFILLMENT_STATE.NOT_PLANNED) return 'Plansız'
  if (fs === FULFILLMENT_STATE.PLANNED) return 'Planlı'
  if (fs === FULFILLMENT_STATE.PARTIAL) return 'Kısmi'
  if (fs === FULFILLMENT_STATE.SHIPPED) return 'Sevkte'
  if (fs === FULFILLMENT_STATE.DELIVERED) return 'Teslim'
  return '—'
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildLastActionLabel(row, dto) {
  if (dto?.lastPaymentAt) {
    return `Tahsilat · ${formatShortDate(dto.lastPaymentAt.slice(0, 10))}`
  }
  if (row.salesPerson?.trim()) return row.salesPerson.trim()
  return `Sipariş · ${formatShortDate(row.orderDate)}`
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @returns {OrdersOpsTableRow}
 */
export function buildOrdersOpsTableRow(row, dto, todayIso) {
  const terminOverdue = isTerminOverdue(row, todayIso)
  const critical = isCriticalRiskOrder(row, dto, todayIso)
  const collectRisk = isCollectionRiskOrder(row, dto)

  return {
    id: row.id,
    orderNo: row.orderNumber ?? row.id,
    customer: row.customer,
    pilotKind: getOrderPilotKind(row),
    product: row.product,
    terminLabel: row.dueDate ? formatShortDate(row.dueDate) : '—',
    terminOverdue,
    collectionLabel: buildCollectionLabel(row, dto),
    shipmentLabel: buildShipmentLabel(row, dto),
    riskLabel: buildRiskLabel(row, dto, todayIso),
    statusLabel: row.status,
    lastActionLabel: buildLastActionLabel(row, dto),
    tone: rowTone(row, dto, todayIso),
    riskTone: critical ? 'critical' : 'neutral',
    collectionTone: collectRisk ? 'warning' : remainingBalance(row) <= 0.009 ? 'success' : 'neutral',
  }
}

/**
 * @param {OrderListRowVM} row
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @returns {OrdersOpsDetailView}
 */
export function buildOrdersOpsDetail(row, dto, todayIso) {
  const critical = isCriticalRiskOrder(row, dto, todayIso)
  const collectRisk = isCollectionRiskOrder(row, dto)
  return {
    customer: row.customer,
    orderNo: row.orderNumber ?? row.id,
    terminLabel: row.dueDate ? formatShortDate(row.dueDate) : '—',
    collectionLabel: buildCollectionLabel(row, dto),
    shipmentLabel: buildShipmentLabel(row, dto),
    riskLabel: buildRiskLabel(row, dto, todayIso),
    riskTone: critical ? 'critical' : 'neutral',
    collectionTone: collectRisk ? 'warning' : 'neutral',
  }
}

/**
 * @param {OrderListRowVM[]} rows
 * @param {Map<string, SalesOrderListItemDto>} dtoById
 * @param {OrdersOpsFilterId} filterId
 * @param {string} todayIso
 */
export function filterOrdersOpsRows(rows, dtoById, filterId, todayIso) {
  if (filterId === 'all') return rows.filter(isOpenOrder)
  return rows.filter((row) => {
    const dto = dtoById.get(row.id)
    switch (filterId) {
      case 'new':
        return isNewOrder(row)
      case 'production':
        return isProductionOrder(row)
      case 'shipment-wait':
        return isShipmentWaitingOrder(row, dto)
      case 'completed':
        return isCompletedOrder(row)
      case 'critical':
        return isCriticalRiskOrder(row, dto, todayIso)
      default:
        return true
    }
  })
}

/**
 * @param {OrderListRowVM[]} rows
 * @param {Map<string, SalesOrderListItemDto>} dtoById
 * @param {string} todayIso
 */
export function buildOrdersOpsSummary(rows, dtoById, todayIso) {
  const open = rows.filter(isOpenOrder)
  const production = open.filter(isProductionOrder)
  const shipmentWait = open.filter((r) => isShipmentWaitingOrder(r, dtoById.get(r.id)))
  const critical = rows.filter((r) => isCriticalRiskOrder(r, dtoById.get(r.id), todayIso))
  const collectionRisk = rows.filter((r) => isCollectionRiskOrder(r, dtoById.get(r.id)))

  return [
    { id: 'open', label: 'Açık Sipariş', value: String(open.length) },
    { id: 'production', label: 'Üretimde', value: String(production.length) },
    { id: 'shipment-wait', label: 'Sevk Bekliyor', value: String(shipmentWait.length) },
    {
      id: 'critical',
      label: 'Kritik Risk',
      value: String(critical.length),
      valueTone: critical.length > 0 ? /** @type {const} */ ('critical') : undefined,
    },
    {
      id: 'collection-risk',
      label: 'Tahsilat Riski',
      value: String(collectionRisk.length),
      valueTone: collectionRisk.length > 0 ? /** @type {const} */ ('warning') : undefined,
    },
  ]
}

/**
 * @param {OrderListRowVM[]} rows
 * @param {Map<string, SalesOrderListItemDto>} dtoById
 * @param {OrdersOpsFilterId} filterId
 * @param {string} todayIso
 */
export function countOrdersOpsFilter(rows, dtoById, filterId, todayIso) {
  if (filterId === 'all') return rows.filter(isOpenOrder).length
  return filterOrdersOpsRows(rows, dtoById, filterId, todayIso).length
}
