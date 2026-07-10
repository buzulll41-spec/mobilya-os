import { formatProductMoney } from '../../lib/formatProductMoney.js'
import { SUPPLIER_HEALTH_STATUS } from '../../mappers/supply/supplierHealth.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterKpisDto} SupplierLedgerCenterKpisDto */
/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterRowDto} SupplierLedgerCenterRowDto */
/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterReportsDto} SupplierLedgerCenterReportsDto */

/**
 * @param {string | number | null | undefined} amount
 */
export function parseRiskAmount(amount) {
  const n = Number.parseFloat(String(amount ?? ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Toplam risk renk bandı: 0–100k yeşil, 100k–300k turuncu, 300k+ kırmızı
 * @param {string | number | null | undefined} amount
 * @returns {'success' | 'warning' | 'critical' | undefined}
 */
export function riskAmountTone(amount) {
  const n = parseRiskAmount(amount)
  if (n <= 0.009) return undefined
  if (n <= 100_000) return 'success'
  if (n <= 300_000) return 'warning'
  return 'critical'
}

/**
 * @param {string | number | null | undefined} amount
 */
function formatMoney(amount) {
  const n = parseRiskAmount(amount)
  if (n <= 0.009) return '—'
  return formatProductMoney(n)
}

/**
 * @param {SupplierLedgerCenterKpisDto | null} kpis
 */
export function buildSupplierLedgerCenterSummary(kpis) {
  const totalDebt = parseRiskAmount(kpis?.totalDebt)
  const pendingOrderDebt = parseRiskAmount(kpis?.pendingOrderDebt)
  const totalRisk = parseRiskAmount(kpis?.totalSupplierRisk) || totalDebt + pendingOrderDebt
  const upcoming30 = parseRiskAmount(kpis?.upcomingPayments30)

  return [
    {
      id: 'total-debt',
      label: 'Toplam Cari Borç',
      value: formatMoney(kpis?.totalDebt ?? '0'),
      valueTone: totalDebt > 0 ? /** @type {const} */ ('warning') : undefined,
    },
    {
      id: 'pending-order-debt',
      label: 'Bekleyen Sipariş Borcu',
      value: formatMoney(kpis?.pendingOrderDebt ?? '0'),
      valueTone: pendingOrderDebt > 0 ? /** @type {const} */ ('warning') : undefined,
    },
    {
      id: 'total-risk',
      label: 'Toplam Tedarikçi Riski',
      value: formatMoney(kpis?.totalSupplierRisk ?? totalRisk),
      valueTone: riskAmountTone(totalRisk),
    },
    {
      id: 'upcoming-30',
      label: '30 Gün İçinde Beklenen Ödeme',
      value: formatMoney(kpis?.upcomingPayments30 ?? '0'),
      valueTone: upcoming30 > 0 ? /** @type {const} */ ('warning') : undefined,
    },
  ]
}

/**
 * @param {SupplierLedgerCenterRowDto} row
 */
export function rowTone(row) {
  if (row.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL) return 'critical'
  if (row.healthStatus === SUPPLIER_HEALTH_STATUS.RISKY) return 'warning'
  if (!row.isActive) return 'neutral'
  return 'neutral'
}

/**
 * @param {SupplierLedgerCenterRowDto} row
 */
export function supplierLedgerCenterTableRow(row) {
  const totalRiskTone = riskAmountTone(row.totalRisk)
  return {
    id: row.id,
    companyName: row.companyName,
    totalDebt: formatMoney(row.totalDebt),
    pendingOrderDebt: formatMoney(row.pendingOrderDebt),
    pendingProductCount: row.pendingProductCount > 0 ? String(row.pendingProductCount) : '—',
    totalRisk: formatMoney(row.totalRisk),
    totalRiskTone,
    monthPayment: formatMoney(row.monthPayment),
    overdueDebt: formatMoney(row.overdueDebt),
    lastMovement: row.lastMovementAt ? formatShortDate(row.lastMovementAt) : '—',
    upcomingDue: row.upcomingDueAt ? formatShortDate(row.upcomingDueAt) : '—',
    statusLabel: row.statusLabel,
    tone: rowTone(row),
  }
}

/**
 * @param {import('../../contracts/v1/supplierOperations.js').SupplierOpenProductDto[]} openProducts
 * @param {Map<string, number>} lineAmounts
 */
export function buildCustomerRiskSummary(openProducts, lineAmounts) {
  /** @type {Map<string, number>} */
  const byCustomer = new Map()
  for (const p of openProducts) {
    const name = p.customerName?.trim() || '—'
    const amount = lineAmounts.get(p.orderLineId) ?? 0
    byCustomer.set(name, (byCustomer.get(name) ?? 0) + amount)
  }
  return [...byCustomer.entries()]
    .map(([customerName, amount]) => ({ customerName, amount }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * @param {string | undefined | null} tone
 */
export function riskToneClass(tone, prefix = 'mos-erp-summary__value') {
  if (tone === 'critical') return `${prefix}--critical`
  if (tone === 'warning') return `${prefix}--warning`
  if (tone === 'success') return `${prefix}--success`
  return ''
}

/**
 * @param {SupplierLedgerCenterReportsDto | null | undefined} reports
 */
export function buildSupplierLedgerReports(reports) {
  if (!reports) {
    return {
      topRisk: [],
      monthPaid: [],
      overdue: [],
      mailOrder: [],
    }
  }
  return {
    topRisk: reports.topDebtSuppliers.map((r) => ({
      id: r.supplierId,
      label: r.companyName,
      value: formatProductMoney(r.amount),
      tone: riskAmountTone(r.amount),
    })),
    monthPaid: reports.monthPaidSuppliers.map((r) => ({
      id: r.supplierId,
      label: r.companyName,
      value: formatProductMoney(r.amount),
    })),
    overdue: reports.overdueDebts.map((r) => ({
      id: r.supplierId,
      label: r.companyName,
      value: formatProductMoney(r.amount),
    })),
    mailOrder: reports.mailOrderDistribution.map((r) => ({
      id: r.supplierId,
      label: r.companyName,
      value: formatProductMoney(r.mailOrderTotal),
      count: r.transactionCount,
    })),
  }
}

/**
 * @param {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterRowDto | null | undefined} row
 * @param {string} todayIso
 */
export function formatLastPaymentLabel(row, todayIso) {
  if (!row?.lastPaymentAt) return '—'
  if (row.lastPaymentAt === todayIso) return 'Bugün'
  return formatShortDate(row.lastPaymentAt)
}
