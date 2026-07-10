import type { SupplierHealthStatus } from '../lib/supplierHealth.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'

export type SupplierOpsListItemDto = {
  id: string
  code: string | null
  companyName: string
  contactName: string | null
  phone: string | null
  openBalance: string
  currency: string
  lastMovementAt: string | null
  isActive: boolean
  city: string | null
  healthStatus: SupplierHealthStatus
  healthLabel: string
  openProductCount: number
  pendingOrderCount: number
  lastActivityLabel: string
}

export type SupplierOpenProductDto = {
  orderLineId: string
  salesOrderId: string
  orderNumber: string
  customerName: string
  productTitle: string
  qtyOrdered: string
  qtyReceived: string
  qtyMissing: string
  orderDate: string | null
  dueDate: string | null
  estimatedUnitCost: string
  isOverdue: boolean
}

export type SupplierPendingOrderDto = {
  salesOrderId: string
  orderNumber: string
  customerName: string
  openLineCount: number
  missingQtyTotal: string
  dueDate: string | null
}

export type SupplierIncomingHistoryDto = {
  id: string
  productTitle: string
  qty: string
  unitPurchasePrice: string
  lineTotal: string
  receivedAt: string
  orderNumber: string | null
  customerName: string | null
}

export type SupplierCommercialSummaryDto = {
  totalPurchases: string
  totalPayments: string
  openBalance: string
  openProductCostEstimate: string
  currency: string
}

export type SupplierOperationsDetailDto = {
  supplierId: string
  commercial: SupplierCommercialSummaryDto
  openProducts: SupplierOpenProductDto[]
  pendingOrders: SupplierPendingOrderDto[]
  incomingHistory: SupplierIncomingHistoryDto[]
  healthStatus: SupplierHealthStatus
  healthLabel: string
  openProductCount: number
  pendingOrderCount: number
  lastActivityLabel: string
}

export type SupplyOperationsKpisDto = {
  criticalSupplierCount: number
  openProductCount: number
  missingProductQty: string
  todayIncomingCount: number
  totalOpenDebt: string
  currency: string
}

export type SupplyOperationsBoardDto = {
  kpis: SupplyOperationsKpisDto
  suppliers: SupplierOpsListItemDto[]
}

export function formatQtyAmount(n: number): string {
  return n.toFixed(2)
}

export function formatCommercialMoney(n: number): string {
  return formatMoneyAmount(n)
}
