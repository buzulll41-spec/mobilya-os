import type { SupplierHealthStatus } from '../lib/supplierHealth.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'

export type SupplierLedgerCenterRowDto = {
  id: string
  companyName: string
  totalDebt: string
  overdueDebt: string
  monthPayment: string
  pendingOrderDebt: string
  pendingProductCount: number
  totalRisk: string
  lastMovementAt: string | null
  lastMovementLabel: string | null
  lastPaymentAt: string | null
  upcomingDueAt: string | null
  statusLabel: string
  healthStatus: SupplierHealthStatus
  isActive: boolean
}

export type SupplierLedgerCenterKpisDto = {
  totalSuppliers: number
  totalDebt: string
  overdueDebt: string
  monthPayments: string
  pendingOrderDebt: string
  pendingProductCount: number
  totalSupplierRisk: string
  upcomingPayments7: string
  upcomingPayments15: string
  upcomingPayments30: string
  currency: string
}

export type SupplierLedgerReportRowDto = {
  supplierId: string
  companyName: string
  amount: string
  currency: string
}

export type MailOrderDistributionRowDto = {
  supplierId: string
  companyName: string
  mailOrderTotal: string
  transactionCount: number
  currency: string
}

export type SupplierLedgerCenterReportsDto = {
  topDebtSuppliers: SupplierLedgerReportRowDto[]
  monthPaidSuppliers: SupplierLedgerReportRowDto[]
  overdueDebts: SupplierLedgerReportRowDto[]
  mailOrderDistribution: MailOrderDistributionRowDto[]
}

export type SupplierLedgerCenterDto = {
  kpis: SupplierLedgerCenterKpisDto
  suppliers: SupplierLedgerCenterRowDto[]
  reports: SupplierLedgerCenterReportsDto
}

export function formatCenterMoney(n: number): string {
  return formatMoneyAmount(n)
}
