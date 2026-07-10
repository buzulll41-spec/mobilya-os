import { RISK_SEVERITY } from '../../contracts/v1/enums.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/enums.js').RiskSeverity} RiskSeverity */

const RISK_RANK = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

/**
 * @param {RiskSeverity} a
 * @param {RiskSeverity} b
 */
function maxRiskSeverity(a, b) {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b
}

/**
 * @param {SalesOrderListItemDto} d
 */
function orderHasAnyShipmentActivity(d) {
  const shipped = Number.parseFloat(d.qtyShippedTotal ?? '0')
  const open = d.shipmentSummaryOpenCount ?? 0
  const transit = d.inTransitShipmentCount ?? 0
  return open > 0 || transit > 0 || (Number.isFinite(shipped) && shipped > 0.0001)
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {string} todayIso
 * @returns {{
 *   overdueTermin: boolean
 *   partialShip: boolean
 *   riskSignalOverduePartialShipment: boolean
 *   currentRiskSeverity: RiskSeverity
 * }}
 */
export function getCompositeListItemRiskContext(dto, order, todayIso) {
  const overdueTermin =
    order.status !== 'Teslim Edildi' && Boolean(order.dueDate) && order.dueDate < todayIso
  const partialShip = Boolean(dto.partiallyShipped)
  const riskSignalOverduePartialShipment = overdueTermin && partialShip

  /** @type {RiskSeverity} */
  let currentRiskSeverity = RISK_SEVERITY.NONE
  const openMissing = (dto.openMissingItemsCount ?? 0) > 0
  const hasShipmentIssue = Boolean(dto.hasShipmentIssue)
  const noShipmentPlan =
    (dto.shipmentSummaryOpenCount ?? 0) === 0 &&
    !orderHasAnyShipmentActivity(dto) &&
    order.status !== 'Teslim Edildi'

  if (openMissing || hasShipmentIssue) {
    currentRiskSeverity = RISK_SEVERITY.HIGH
  } else if (riskSignalOverduePartialShipment) {
    currentRiskSeverity = RISK_SEVERITY.HIGH
  } else if (overdueTermin && noShipmentPlan) {
    currentRiskSeverity = RISK_SEVERITY.HIGH
  } else if (overdueTermin) {
    currentRiskSeverity = RISK_SEVERITY.MEDIUM
  }

  if ((dto.missingItemsOpenStatusCount ?? 0) > 0) {
    currentRiskSeverity = maxRiskSeverity(currentRiskSeverity, RISK_SEVERITY.MEDIUM)
  }

  return {
    overdueTermin,
    partialShip,
    riskSignalOverduePartialShipment,
    currentRiskSeverity,
  }
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {string} todayIso
 * @returns {SalesOrderListItemDto}
 */
export function applyCompositeListItemRisk(dto, order, todayIso) {
  const ctx = getCompositeListItemRiskContext(dto, order, todayIso)
  return {
    ...dto,
    currentRiskSeverity: ctx.currentRiskSeverity,
    riskSignalOverduePartialShipment: ctx.riskSignalOverduePartialShipment,
  }
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {string} todayIso
 * @returns {{ headline: string, lines: string[] }}
 */
export function explainCompositeListItemRiskForDebug(dto, order, todayIso) {
  const ctx = getCompositeListItemRiskContext(dto, order, todayIso)
  /** @type {string[]} */
  const lines = []

  if (dto.hasShipmentIssue) {
    lines.push('Sevk / montaj ISSUE → HIGH risk.')
  }
  if (ctx.overdueTermin && (dto.shipmentSummaryOpenCount ?? 0) === 0 && !orderHasAnyShipmentActivity(dto)) {
    lines.push('Termin gecikti ve sevk planı yok → HIGH.')
  }
  if (order.status === 'Eksik Var') {
    lines.push('Legacy durum "Eksik Var" → açık eksik kayıtları HIGH tetikler.')
  }
  if (ctx.overdueTermin) {
    lines.push(
      `Termin gecikmesi: \`dueDate\` (${order.dueDate}) < bugün (${todayIso}) ve sipariş teslim edilmedi.`,
    )
  } else {
    lines.push('Termin gecikmesi yok (veya teslim edildi / termin tarihi yok).')
  }
  if (ctx.partialShip) {
    lines.push('Kısmi sevk: `partiallyShipped` = true.')
  } else {
    lines.push('Kısmi sevk sinyali yok.')
  }
  if (ctx.riskSignalOverduePartialShipment) {
    lines.push('Birleşik sinyal: termin gecikti ∧ kısmi sevk → HIGH.')
  }

  /** @type {string} */
  let headline
  if (ctx.currentRiskSeverity === RISK_SEVERITY.HIGH) {
    if (dto.hasShipmentIssue) headline = 'HIGH: sevk / montaj sorunu (ISSUE).'
    else if (ctx.riskSignalOverduePartialShipment) headline = 'HIGH: termin gecikti ve kısmi sevk.'
    else if (ctx.overdueTermin) headline = 'HIGH: termin gecikti (plan yok veya eksik).'
    else headline = 'HIGH: açık eksik veya birleşik kurallar.'
  } else if (ctx.currentRiskSeverity === RISK_SEVERITY.MEDIUM) {
    headline = 'MEDIUM: termin gecikmesi veya OPEN eksik durumu.'
  } else if (ctx.currentRiskSeverity === RISK_SEVERITY.NONE) {
    headline = 'NONE: kurallar HIGH/MEDIUM tetiklemedi.'
  } else {
    headline = `Wire risk: ${ctx.currentRiskSeverity}.`
  }

  return { headline, lines }
}
