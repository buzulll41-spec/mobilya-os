import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { explainCompositeListItemRiskForDebug } from './applyCompositeListItemRisk.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/enums.js').RiskSeverity} RiskSeverity */

/** @param {RiskSeverity} s */
export function riskSeverityBadgeLabelTr(s) {
  switch (s) {
    case RISK_SEVERITY.NONE:
      return 'Yok'
    case RISK_SEVERITY.LOW:
      return 'Düşük'
    case RISK_SEVERITY.MEDIUM:
      return 'Orta'
    case RISK_SEVERITY.HIGH:
      return 'Yüksek'
    case RISK_SEVERITY.CRITICAL:
      return 'Kritik'
    default:
      return s
  }
}

/**
 * Debug açıklamasındaki teknik token’ları sadeleştirir.
 * @param {string} line
 */
export function humanizeRiskLine(line) {
  return line
    .replace(/`partiallyShipped`/g, 'kısmi sevk')
    .replace(/`dueDate`/g, 'termin tarihi')
    .replace(/`currentRiskSeverity`/g, 'risk seviyesi')
    .replace(/`riskSignalOverduePartialShipment`/g, 'termin + kısmi sevk sinyali')
    .replace(/`([^`]+)`/g, '“$1”')
}

/**
 * @param {SalesOrderListItemDto | null | undefined} dto
 * @param {Order | null | undefined} order
 * @param {string} todayIso
 */
export function buildRiskDrawerModel(dto, order, todayIso) {
  if (!dto || !order) {
    return {
      state: /** @type {const} */ ('loading'),
      severity: RISK_SEVERITY.NONE,
      badgeLabel: '…',
      summary: null,
      bullets: /** @type {string[]} */ ([]),
      elevated: false,
      showNoneMessage: false,
      signalOverduePartial: false,
    }
  }

  const severity = dto.currentRiskSeverity
  const explain = explainCompositeListItemRiskForDebug(dto, order, todayIso)
  const summary = humanizeRiskLine(explain.headline)
  const bullets = explain.lines.map(humanizeRiskLine)
  const elevated = severity === RISK_SEVERITY.HIGH || severity === RISK_SEVERITY.CRITICAL
  const showNoneMessage = severity === RISK_SEVERITY.NONE

  return {
    state: /** @type {const} */ ('ready'),
    severity,
    badgeLabel: riskSeverityBadgeLabelTr(severity),
    summary,
    bullets,
    elevated,
    showNoneMessage,
    signalOverduePartial: Boolean(dto.riskSignalOverduePartialShipment),
  }
}
