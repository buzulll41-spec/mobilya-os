import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { PAYMENT_TRANSACTION_KIND } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { getPaymentTransactionsForSalesOrder } from '../../services/mockPaymentStore.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'
import { riskSeverityBadgeLabelTr } from '../risk/riskDrawerUi.js'

/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */

/** @typedef {'healthy' | 'warning' | 'critical' | 'neutral'} CollectionHealthTone */
/** @typedef {'all' | 'critical' | 'overdue' | 'delivered-open' | 'pre-shipment' | 'partial' | 'none' | 'pending-approval' | 'approved-payments' | 'rejected-payments' | 'mail-order'} CollectionFilterId */

/**
 * @typedef {Object} CollectionKpiCard
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {string} hint
 * @property {CollectionFilterId | null} filterTarget
 */

/**
 * @typedef {Object} CollectionCardModel
 * @property {CollectionRowVM} row
 * @property {number} remaining
 * @property {number} collected
 * @property {number} paidPct
 * @property {CollectionHealthTone} healthTone
 * @property {'critical' | 'warning' | 'neutral'} stripeTone
 * @property {string} healthLabel
 * @property {string} riskLabel
 * @property {number} riskScore
 * @property {string} orderNo
 * @property {string} productDisplay
 * @property {string | null} productOverflow
 */

export const COLLECTION_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'pending-approval', label: 'Onay Bekleyenler' },
  { id: 'approved-payments', label: 'Onaylananlar' },
  { id: 'rejected-payments', label: 'Reddedilenler' },
  { id: 'mail-order', label: 'Mail Order' },
  { id: 'critical', label: 'Kritik' },
  { id: 'overdue', label: 'Gecikmiş' },
  { id: 'delivered-open', label: 'Teslim edildi · bakiye var' },
  { id: 'pre-shipment', label: 'Sevk öncesi tahsilat' },
  { id: 'partial', label: 'Kısmi ödeme' },
  { id: 'none', label: 'Hiç ödeme yok' },
])

/** Öncelikli arama KPI’sında sayılacak üst riskli müşteri sayısı */
export const PRIORITY_CALL_LIMIT = 10

/**
 * @param {string} orderId
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto | undefined} [dto]
 */
export function orderHasPendingApprovalPayment(orderId, dto) {
  if (dto && typeof dto.pendingApprovalPaymentCount === 'number') {
    return dto.pendingApprovalPaymentCount > 0
  }
  return getPaymentTransactionsForSalesOrder(orderId).some(
    (t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
  )
}

/**
 * @param {string} orderId
 */
export function orderHasRejectedPayment(orderId) {
  return getPaymentTransactionsForSalesOrder(orderId).some(
    (t) => t.status === PAYMENT_TRANSACTION_STATUS.CANCELLED,
  )
}

/**
 * @param {string} orderId
 */
export function orderHasPostedPayment(orderId) {
  return getPaymentTransactionsForSalesOrder(orderId).some(
    (t) => t.status === PAYMENT_TRANSACTION_STATUS.POSTED,
  )
}

/**
 * @param {string} orderId
 * @param {string | undefined} supplierId
 * @param {Map<string, import('../../contracts/v1/payment.js').PaymentTransactionDto[]>} [paymentsByOrderId]
 */
export function orderHasMailOrderPayment(orderId, supplierId, paymentsByOrderId) {
  const txs =
    paymentsByOrderId?.get(orderId) ?? getPaymentTransactionsForSalesOrder(orderId)
  return txs.some((t) => {
    if (t.kind !== PAYMENT_TRANSACTION_KIND.MAIL_ORDER) return false
    if (!supplierId) return true
    return t.mailOrderSupplierId === supplierId
  })
}

/**
 * @param {CollectionRowVM} row
 */
export function isDeliveredOpenBalance(row) {
  return row.status === 'Teslim Edildi' && remainingBalance(row) > 0.009
}

/**
 * Yüksek bakiye + tahsilat oranı %20 altı (KPI kritik tanımı).
 * @param {CollectionRowVM} row
 */
export function isHighBalanceLowPaymentRate(row) {
  const rem = remainingBalance(row)
  if (rem <= 0.009) return false
  const paidPct = typeof row.paymentProgress === 'number' ? row.paymentProgress : 0
  if (paidPct >= 20) return false
  return isHighCollectionBalance(rem, row.amount ?? 0)
}

/**
 * KPI / filtre kritik tanımı:
 * - Teslim edildi + bakiye açık
 * - Gecikmiş tahsilat
 * - Ödeme oranı %20 altı ve bakiye yüksek
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
export function isCollectionCritical(row, todayIso) {
  if (remainingBalance(row) <= 0.009) return false
  if (isDeliveredOpenBalance(row)) return true
  if (isCollectionOverdue(row, todayIso)) return true
  return isHighBalanceLowPaymentRate(row)
}

/**
 * Sol şerit tonu — kırmızı yalnızca teslim+ bakiye ve gecikmiş tahsilat.
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 * @returns {'critical' | 'warning' | 'neutral'}
 */
export function computeCollectionStripeTone(row, todayIso) {
  if (isDeliveredOpenBalance(row) || isCollectionOverdue(row, todayIso)) return 'critical'
  const rem = remainingBalance(row)
  if (isHighCollectionBalance(rem, row.amount ?? 0) || isHighBalanceLowPaymentRate(row)) {
    return 'warning'
  }
  return 'neutral'
}

/**
 * @param {string | undefined} productText
 */
export function formatCollectionProductSummary(productText) {
  const raw = String(productText ?? '').trim()
  if (!raw) return { display: '—', overflow: null }
  const parts = raw.split(/\s*[·•|,|\n]+\s*|\s{2,}/).filter((p) => p.length > 0)
  if (parts.length <= 1) return { display: raw, overflow: null }
  return { display: parts[0], overflow: `+${parts.length - 1} ürün daha` }
}

/** @param {number} rem @param {number} total */
export function isCriticalCollectionBalance(rem, total) {
  if (rem <= 0.009) return false
  if (rem >= 80_000) return true
  return total > 0 && rem / total >= 0.5
}

/** @param {number} rem @param {number} total */
export function isHighCollectionBalance(rem, total) {
  if (rem <= 0.009) return false
  if (isCriticalCollectionBalance(rem, total)) return true
  if (rem >= 40_000) return true
  return total > 0 && rem / total >= 0.4
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
export function computeCollectionHealth(row, todayIso) {
  const rem = remainingBalance(row)
  const total = row.amount ?? 0
  const paidPct = typeof row.paymentProgress === 'number' ? row.paymentProgress : 0
  const collected = row.paid ? total : row.paidAmount ?? 0

  if (rem <= 0.009 || paidPct >= 99.5) {
    return { tone: /** @type {const} */ ('healthy'), label: 'Ödeme tamam' }
  }

  const deliveredOpen = isDeliveredOpenBalance(row)
  const overdue = isCollectionOverdue(row, todayIso)
  const highLowRate = isHighBalanceLowPaymentRate(row)
  const highBalance = isHighCollectionBalance(rem, total)

  if (deliveredOpen) {
    return { tone: /** @type {const} */ ('critical'), label: 'Teslim · bakiye açık' }
  }
  if (overdue) {
    return { tone: /** @type {const} */ ('critical'), label: 'Gecikmiş tahsilat' }
  }
  if (highLowRate) {
    return { tone: /** @type {const} */ ('warning'), label: 'Düşük tahsilat oranı' }
  }
  if (highBalance) {
    return { tone: /** @type {const} */ ('warning'), label: 'Yüksek bakiye' }
  }

  if (collected > 0.009 || paidPct >= 15) {
    return { tone: /** @type {const} */ ('warning'), label: 'Kısmi ödeme' }
  }

  return { tone: /** @type {const} */ ('neutral'), label: 'Tahsilat bekleniyor' }
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
export function computeCollectionRiskScore(row, todayIso) {
  const rem = remainingBalance(row)
  const total = row.amount ?? 0
  const paidPct = typeof row.paymentProgress === 'number' ? row.paymentProgress : 0
  let score = rem * 0.5

  if (isDeliveredOpenBalance(row)) score += 250_000
  if (isCollectionOverdue(row, todayIso)) score += 150_000
  if (isHighBalanceLowPaymentRate(row)) score += 90_000

  score += Math.max(0, 100 - paidPct) * 800

  const shipDate = row.shipmentDate ?? row.dueDate
  if (shipDate && rem > 0.009 && row.status !== 'Teslim Edildi') {
    const days = Math.floor(
      (Date.parse(`${shipDate}T12:00:00`) - Date.parse(`${todayIso}T12:00:00`)) / 86_400_000,
    )
    if (days <= 0) score += 20_000
    else if (days <= 7) score += 10_000
  }

  const sev = row.riskSeverity
  if (sev === RISK_SEVERITY.CRITICAL) score += 15_000
  else if (sev === RISK_SEVERITY.HIGH) score += 8_000

  if (Boolean(row.riskSignalOverduePartialShipment)) score += 5_000

  return score
}

/**
 * @param {CollectionRowVM} row
 * @param {string} [todayIso]
 */
export function collectionRiskLabel(row, todayIso) {
  if (isDeliveredOpenBalance(row)) return 'Teslim · bakiye'
  if (row.hasOverdueBalance) return 'Gecikmiş tahsilat'
  if (todayIso && isTerminOverdue(row, todayIso)) return 'Gecikmiş termin'
  if (isHighBalanceLowPaymentRate(row)) return 'Yüksek bakiye · düşük oran'
  const sev = row.riskSeverity
  if (sev && sev !== RISK_SEVERITY.NONE && sev !== RISK_SEVERITY.LOW) {
    return riskSeverityBadgeLabelTr(sev)
  }
  if ((row.paidAmount ?? 0) <= 0.009) return 'Ödeme yok'
  return 'Takip'
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 * @returns {CollectionCardModel}
 */
export function buildCollectionCardModel(row, todayIso) {
  const remaining = remainingBalance(row)
  const total = row.amount ?? 0
  const collected = row.paid ? total : row.paidAmount ?? 0
  const paidPct = total > 0 ? Math.min(100, Math.round((collected / total) * 100)) : 0
  const health = computeCollectionHealth(row, todayIso)
  const productParts = formatCollectionProductSummary(row.product)

  return {
    row,
    remaining,
    collected,
    paidPct,
    healthTone: health.tone,
    stripeTone: computeCollectionStripeTone(row, todayIso),
    healthLabel: health.label,
    riskLabel: collectionRiskLabel(row, todayIso),
    riskScore: computeCollectionRiskScore(row, todayIso),
    orderNo: row.orderNumber ?? row.id,
    productDisplay: productParts.display,
    productOverflow: productParts.overflow,
  }
}

/**
 * @param {CollectionRowVM[]} rows
 * @param {string} todayIso
 */
export function sortCollectionByRisk(rows, todayIso) {
  return [...rows]
    .map((row) => buildCollectionCardModel(row, todayIso))
    .sort((a, b) => {
      const aDelivered = isDeliveredOpenBalance(a.row) ? 1 : 0
      const bDelivered = isDeliveredOpenBalance(b.row) ? 1 : 0
      if (aDelivered !== bDelivered) return bDelivered - aDelivered
      return b.riskScore - a.riskScore || b.remaining - a.remaining
    })
}

/**
 * @param {CollectionRowVM[]} rows
 * @param {string} todayIso
 * @param {number} [limit]
 */
export function pickPriorityCallRows(rows, todayIso, limit = PRIORITY_CALL_LIMIT) {
  const openRows = rows.filter((row) => remainingBalance(row) > 0.009)
  return sortCollectionByRisk(openRows, todayIso).slice(0, limit)
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
export function isCollectionOverdue(row, todayIso) {
  return Boolean(row.hasOverdueBalance) || isTerminOverdue(row, todayIso)
}

/**
 * @param {CollectionRowVM} row
 * @param {string} todayIso
 */
export function isPreShipmentCollection(row, todayIso) {
  if (row.status === 'Teslim Edildi') return false
  if (remainingBalance(row) <= 0.009) return false
  if (row.status === 'Hazır') return true
  if (row.shipmentDate) {
    const days = Math.floor(
      (Date.parse(`${row.shipmentDate}T12:00:00`) - Date.parse(`${todayIso}T12:00:00`)) / 86_400_000,
    )
    return days <= 14
  }
  if (row.dueDate) {
    const days = Math.floor(
      (Date.parse(`${row.dueDate}T12:00:00`) - Date.parse(`${todayIso}T12:00:00`)) / 86_400_000,
    )
    return days <= 14
  }
  return false
}

/**
 * @param {CollectionRowVM} row
 * @param {CollectionFilterId} filterId
 * @param {string} todayIso
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto | undefined} [dto]
 * @param {{ mailOrderSupplierId?: string, paymentsByOrderId?: Map<string, import('../../contracts/v1/payment.js').PaymentTransactionDto[]> }} [options]
 */
export function matchesCollectionFilter(row, filterId, todayIso, dto, options = {}) {
  if (filterId === 'mail-order') {
    return orderHasMailOrderPayment(
      row.id,
      options.mailOrderSupplierId,
      options.paymentsByOrderId,
    )
  }
  if (filterId === 'pending-approval') {
    return orderHasPendingApprovalPayment(row.id, dto)
  }
  if (filterId === 'rejected-payments') {
    return orderHasRejectedPayment(row.id)
  }
  if (filterId === 'approved-payments') {
    const collected = row.paid ? row.amount : row.paidAmount ?? 0
    return collected > 0.009 && !orderHasPendingApprovalPayment(row.id, dto)
  }

  const rem = remainingBalance(row)
  if (rem <= 0.009) return false
  if (filterId === 'all') return true

  const collected = row.paid ? row.amount : row.paidAmount ?? 0

  switch (filterId) {
    case 'critical':
      return isCollectionCritical(row, todayIso)
    case 'overdue':
      return isCollectionOverdue(row, todayIso)
    case 'delivered-open':
      return row.status === 'Teslim Edildi'
    case 'pre-shipment':
      return isPreShipmentCollection(row, todayIso)
    case 'partial':
      return collected > 0.009 && rem > 0.009
    case 'none':
      return collected <= 0.009
    default:
      return true
  }
}

/**
 * @param {CollectionRowVM[]} rows
 * @param {CollectionFilterId} filterId
 * @param {string} todayIso
 * @param {Map<string, import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>} [dtoById]
 * @param {{ mailOrderSupplierId?: string, paymentsByOrderId?: Map<string, import('../../contracts/v1/payment.js').PaymentTransactionDto[]> }} [options]
 */
export function filterCollectionRows(rows, filterId, todayIso, dtoById = new Map(), options = {}) {
  return rows.filter((row) =>
    matchesCollectionFilter(row, filterId, todayIso, dtoById.get(row.id), options),
  )
}

/**
 * @param {CollectionRowVM[]} rows
 * @param {string} todayIso
 * @returns {CollectionKpiCard[]}
 */
export function computeCollectionKpis(rows, todayIso) {
  const openRows = rows.filter((row) => remainingBalance(row) > 0.009)
  const totalOpen = openRows.reduce((sum, row) => sum + remainingBalance(row), 0)

  const criticalRows = openRows.filter((row) => isCollectionCritical(row, todayIso))
  const criticalTotal = criticalRows.reduce((sum, row) => sum + remainingBalance(row), 0)

  const priorityCallRows = pickPriorityCallRows(openRows, todayIso)

  const overdueRows = openRows.filter((row) => isCollectionOverdue(row, todayIso))

  const avgRate =
    openRows.length > 0
      ? Math.round(
          openRows.reduce((sum, row) => sum + (row.paymentProgress ?? 0), 0) / openRows.length,
        )
      : 100

  return [
    {
      id: 'total-open',
      label: 'Toplam açık bakiye',
      value: formatTry(totalOpen),
      hint: `${openRows.length} sipariş`,
      filterTarget: 'all',
    },
    {
      id: 'critical-balance',
      label: 'Kritik bakiye',
      value: formatTry(criticalTotal),
      hint: `${criticalRows.length} sipariş`,
      filterTarget: 'critical',
    },
    {
      id: 'priority-call',
      label: 'Öncelikli aranacak',
      value: String(priorityCallRows.length),
      hint: `En riskli ${PRIORITY_CALL_LIMIT}`,
      filterTarget: 'critical',
    },
    {
      id: 'overdue',
      label: 'Gecikmiş tahsilat',
      value: String(overdueRows.length),
      hint: 'Termin / vade',
      filterTarget: 'overdue',
    },
    {
      id: 'avg-rate',
      label: 'Ort. tahsilat oranı',
      value: `%${avgRate}`,
      hint: openRows.length ? 'Açık siparişler' : '—',
      filterTarget: null,
    },
  ]
}

/**
 * @param {CollectionRowVM[]} rows
 * @param {CollectionFilterId} filterId
 * @param {string} todayIso
 */
export function buildCollectionCommandCenterView(rows, filterId, todayIso) {
  const openRows = rows.filter((row) => remainingBalance(row) > 0.009)
  const filtered = filterCollectionRows(openRows, filterId, todayIso)
  const cards = sortCollectionByRisk(filtered, todayIso)
  const kpis = computeCollectionKpis(openRows, todayIso)
  return { kpis, cards, openCount: openRows.length, filteredCount: filtered.length }
}
