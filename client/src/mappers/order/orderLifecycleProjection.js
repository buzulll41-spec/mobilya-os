import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { paymentStatusLabelTr } from './orderOperationPanelModel.js'
import { buildOperationalPhaseLabel } from './orderCommandCenterModel.js'
import { shipmentQueueCardStatusLabel } from '../shipment/shipmentOperationUx.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {Object} OrderDrawerSummaryCell
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {'default' | 'critical' | 'warning'} [tone]
 */

/**
 * @typedef {Object} OrderDrawerHeaderModel
 * @property {string} customerName
 * @property {string} orderNumber
 * @property {string} milestoneLabel
 * @property {string} phaseLabel
 * @property {import('../../contracts/v1/enums.js').RiskSeverity} riskSeverity
 * @property {string} riskLabel
 * @property {string} displayStatus
 * @property {OrderDrawerSummaryCell[]} summaryCells
 */

/**
 * @param {import('../../contracts/v1/enums.js').RiskSeverity} severity
 */
function riskLabelTr(severity) {
  switch (severity) {
    case RISK_SEVERITY.CRITICAL:
      return 'Kritik'
    case RISK_SEVERITY.HIGH:
      return 'Yüksek'
    case RISK_SEVERITY.MEDIUM:
      return 'Orta'
    case RISK_SEVERITY.LOW:
      return 'Düşük'
    default:
      return 'Normal'
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} remaining
 * @param {string} todayIso
 */
function buildMilestoneLabel(order, dto, remaining) {
  if ((dto?.openMissingItemsCount ?? 0) > 0) return 'SSH açık'
  if (dto?.hasShipmentIssue) return 'Sevk sorunu'
  if (remaining > 0.009 && dto?.hasOverdueBalance) return 'Tahsilat gecikti'
  if ((dto?.inTransitShipmentCount ?? 0) > 0) return 'Sevk yolda'
  if ((dto?.shipmentSummaryOpenCount ?? 0) > 0) return 'Sevk planlandı'
  if (dto?.installationPending) return 'Montaj bekliyor'
  if (order.status === 'Teslim Edildi') return 'Teslim edildi'
  if (order.status === 'Hazır') return 'Sevke hazır'
  if (remaining <= 0.009) return 'Tahsilat kapandı'
  return 'Sipariş aktif'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {number} remaining
 * @param {string} todayIso
 * @returns {OrderDrawerHeaderModel}
 */
export function buildOrderDrawerHeaderModel(order, dto, remaining, todayIso) {
  const risk = dto?.currentRiskSeverity ?? RISK_SEVERITY.NONE
  const termin = dto?.latestCommittedShipBy ?? order.dueDate ?? null
  const payPct =
    dto?.paymentProgress != null
      ? Math.round(dto.paymentProgress * 100)
      : order.amount > 0
        ? Math.round(((order.amount - remaining) / order.amount) * 100)
        : 0

  const shipmentLabel = dto
    ? shipmentQueueCardStatusLabel(undefined, {
        installationPending: dto.installationPending,
        hasShipmentIssue: dto.hasShipmentIssue,
      })
    : order.shipmentDate
      ? 'Planlı'
      : 'Bekliyor'

  const installLabel = dto?.installationPending
    ? 'Bekliyor'
    : order.status === 'Teslim Edildi'
      ? 'Tamam'
      : '—'

  const sshOpen = dto?.openMissingItemsCount ?? 0

  /** @type {OrderDrawerSummaryCell[]} */
  const summaryCells = [
    {
      id: 'order',
      label: 'Sipariş',
      value: `${dto?.orderNumber ?? order.id}${dto?.salesPerson ? ` · ${dto.salesPerson}` : ''}`,
    },
    {
      id: 'termin',
      label: 'Termin',
      value: termin ? formatShortDate(termin) : '—',
      tone:
        termin && termin < todayIso && order.status !== 'Teslim Edildi' ? 'warning' : 'default',
    },
    {
      id: 'collection',
      label: 'Tahsilat',
      value:
        remaining <= 0.009
          ? 'Kapandı'
          : `${payPct}% · ${formatTry(remaining)} kalan`,
      tone: dto?.hasOverdueBalance ? 'critical' : remaining > 0.009 ? 'warning' : 'default',
    },
    {
      id: 'shipment',
      label: 'Sevk',
      value: shipmentLabel,
      tone: dto?.hasShipmentIssue ? 'critical' : 'default',
    },
    {
      id: 'install',
      label: 'Montaj',
      value: installLabel,
      tone: dto?.installationPending ? 'warning' : 'default',
    },
    {
      id: 'ssh',
      label: 'SSH',
      value: sshOpen > 0 ? `${sshOpen} açık` : 'Yok',
      tone: sshOpen > 0 ? 'critical' : 'default',
    },
    {
      id: 'phase',
      label: 'Faz',
      value: buildOperationalPhaseLabel(order, dto),
    },
  ]

  return {
    customerName: dto?.customerDisplayName ?? order.customer,
    orderNumber: dto?.orderNumber ?? order.id,
    milestoneLabel: buildMilestoneLabel(order, dto, remaining),
    phaseLabel: buildOperationalPhaseLabel(order, dto),
    riskSeverity: risk,
    riskLabel: riskLabelTr(risk),
    displayStatus: dto?.displayStatus ?? order.status,
    summaryCells,
  }
}

/**
 * @param {Order} order
 * @param {number} remaining
 */
export function buildCollectionSummaryHint(order, remaining) {
  return paymentStatusLabelTr(order, remaining)
}
