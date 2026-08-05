import type { Supplier, SupplierLedgerEntry } from '@prisma/client'
import { optionalIsoDate, toIsoDateString } from '../lib/isoDate.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { decimalToNumber } from '../lib/money.js'

export type SupplierListItemDto = {
  id: string
  code: string | null
  companyName: string
  contactName: string | null
  phone: string | null
  openBalance: string
  currency: string
  lastMovementAt: string | null
  isActive: boolean
}

export type SupplierDetailDto = {
  id: string
  code: string | null
  companyName: string
  contactName: string | null
  phone: string | null
  iban: string | null
  taxNumber: string | null
  taxOffice: string | null
  address: string | null
  isActive: boolean
  openBalance: string
  currency: string
  lastMovementAt: string | null
  createdAt: string
  updatedAt: string
}

export type SupplierLedgerEntryDto = {
  id: string
  supplierId: string
  entryType: string
  occurredAt: string
  description: string
  debitAmount: string
  creditAmount: string
  balanceAfter: string
  currency: string
  paymentMethod: string | null
  documentNo: string | null
  paymentTransactionId: string | null
  salesOrderId: string | null
  customerNameSnapshot: string | null
  productTitleSnapshot: string | null
  dueAt: string | null
  source: string | null
  status: string
  reversesEntryId: string | null
  createdAt: string
}

export function mapSupplierLedgerEntryDto(row: SupplierLedgerEntry): SupplierLedgerEntryDto {
  return {
    id: row.id,
    supplierId: row.supplierId,
    entryType: row.entryType,
    occurredAt: optionalIsoDate(row.occurredAt) ?? toIsoDateString(row.occurredAt),
    description: row.description,
    debitAmount: formatMoneyAmount(decimalToNumber(row.debitAmount)),
    creditAmount: formatMoneyAmount(decimalToNumber(row.creditAmount)),
    balanceAfter: formatMoneyAmount(decimalToNumber(row.balanceAfter)),
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    documentNo: row.documentNo,
    paymentTransactionId: row.paymentTransactionId,
    salesOrderId: row.salesOrderId,
    customerNameSnapshot: row.customerNameSnapshot,
    productTitleSnapshot: row.productTitleSnapshot,
    dueAt: optionalIsoDate(row.dueAt),
    source: row.source,
    status: row.status,
    reversesEntryId: row.reversesEntryId,
    createdAt: row.createdAt.toISOString(),
  }
}

export function mapSupplierListItemDto(
  row: Supplier,
  openBalance: number,
  lastMovementAt: Date | null,
): SupplierListItemDto {
  return {
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    contactName: row.contactName,
    phone: row.phone,
    openBalance: formatMoneyAmount(openBalance),
    currency: 'TRY',
    lastMovementAt: optionalIsoDate(lastMovementAt),
    isActive: row.isActive,
  }
}

export function mapSupplierDetailDto(
  row: Supplier,
  openBalance: number,
  lastMovementAt: Date | null,
): SupplierDetailDto {
  return {
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    contactName: row.contactName,
    phone: row.phone,
    iban: row.iban,
    taxNumber: row.taxNumber,
    taxOffice: row.taxOffice,
    address: row.address,
    isActive: row.isActive,
    openBalance: formatMoneyAmount(openBalance),
    currency: 'TRY',
    lastMovementAt: optionalIsoDate(lastMovementAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
