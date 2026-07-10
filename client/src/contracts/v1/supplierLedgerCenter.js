/**
 * @typedef {Object} SupplierLedgerCenterRowDto
 * @property {string} id
 * @property {string} companyName
 * @property {string} totalDebt
 * @property {string} overdueDebt
 * @property {string} monthPayment
 * @property {string} pendingOrderDebt
 * @property {number} pendingProductCount
 * @property {string} totalRisk
 * @property {string | null} lastMovementAt
 * @property {string | null} lastMovementLabel
 * @property {string | null} lastPaymentAt
 * @property {string | null} upcomingDueAt
 * @property {string} statusLabel
 * @property {string} healthStatus
 * @property {boolean} isActive
 */

/**
 * @typedef {Object} SupplierLedgerCenterKpisDto
 * @property {number} totalSuppliers
 * @property {string} totalDebt
 * @property {string} overdueDebt
 * @property {string} monthPayments
 * @property {string} pendingOrderDebt
 * @property {number} pendingProductCount
 * @property {string} totalSupplierRisk
 * @property {string} upcomingPayments7
 * @property {string} upcomingPayments15
 * @property {string} upcomingPayments30
 * @property {string} currency
 */

/**
 * @typedef {Object} SupplierLedgerReportRowDto
 * @property {string} supplierId
 * @property {string} companyName
 * @property {string} amount
 * @property {string} currency
 */

/**
 * @typedef {Object} MailOrderDistributionRowDto
 * @property {string} supplierId
 * @property {string} companyName
 * @property {string} mailOrderTotal
 * @property {number} transactionCount
 * @property {string} currency
 */

/**
 * @typedef {Object} SupplierLedgerCenterReportsDto
 * @property {SupplierLedgerReportRowDto[]} topDebtSuppliers
 * @property {SupplierLedgerReportRowDto[]} monthPaidSuppliers
 * @property {SupplierLedgerReportRowDto[]} overdueDebts
 * @property {MailOrderDistributionRowDto[]} mailOrderDistribution
 */

/**
 * @typedef {Object} SupplierLedgerCenterDto
 * @property {SupplierLedgerCenterKpisDto} kpis
 * @property {SupplierLedgerCenterRowDto[]} suppliers
 * @property {SupplierLedgerCenterReportsDto} reports
 */

export {}
