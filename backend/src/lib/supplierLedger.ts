import type { SupplierLedgerEntry } from '@prisma/client'
import { decimalToNumber } from './money.js'
import { isSupplierLedgerBalanceStatus } from '../constants/supplierLedgerStatuses.js'

export function sumSupplierLedgerBalance(
  entries: Pick<SupplierLedgerEntry, 'debitAmount' | 'creditAmount' | 'status'>[],
): number {
  let credit = 0
  let debit = 0
  for (const e of entries) {
    if (!isSupplierLedgerBalanceStatus(e.status)) continue
    credit += decimalToNumber(e.creditAmount)
    debit += decimalToNumber(e.debitAmount)
  }
  return Math.max(0, credit - debit)
}

export function formatMoneyAmount(n: number): string {
  return n.toFixed(2)
}

export function formatMailOrderLedgerDescription(
  customerName: string,
  orderId: string,
  amount: number,
): string {
  const formatted = amount.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  return `${customerName} - ${orderId} - Mail Order - ${formatted} ₺`
}

export function formatGoodsReceiptLedgerDescription(input: {
  customerName?: string | null
  orderId?: string | null
  productTitle: string
  qty: number
  unitPrice: number
  lineTotal: number
}): string {
  const unit = input.unitPrice.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const total = input.lineTotal.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  const parts = [
    input.customerName?.trim() || null,
    input.orderId?.trim() || null,
    input.productTitle.trim(),
    `Ürün alışı · ${input.qty} adet × ${unit} ₺ = ${total} ₺`,
  ].filter(Boolean)
  return parts.join(' · ')
}
