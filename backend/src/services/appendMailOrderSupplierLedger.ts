import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { PAYMENT_METHOD } from '../constants/paymentMethods.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../constants/supplierLedgerEntryTypes.js'
import {
  SUPPLIER_LEDGER_SOURCE,
  SUPPLIER_LEDGER_STATUS,
} from '../constants/supplierLedgerStatuses.js'
import { isIsoDateString, parseIsoDateOnly, toIsoDateString } from '../lib/isoDate.js'
import { formatMailOrderLedgerDescription } from '../lib/supplierLedger.js'
import { loadSupplierBalanceSnapshot } from './supplierBalance.js'

type Tx = Prisma.TransactionClient | PrismaClient

export type MailOrderSupplierLedgerInput = {
  supplierId: string
  orderId: string
  paymentId: string
  amount: number
  mailOrderCustomerId: string
  paymentNote?: string
  mailOrderCommissionRate?: number
}

function resolveOccurredAt(): Date {
  const todayIso = process.env.DEMO_TODAY ?? toIsoDateString(new Date())
  return parseIsoDateOnly(isIsoDateString(todayIso) ? todayIso : toIsoDateString(new Date()))
}

async function assertActiveSupplier(tx: Tx, supplierId: string) {
  const supplier = await tx.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    throw new AppHttpError(404, 'Mail order tedarikçisi bulunamadı', 'Not Found')
  }
  if (!supplier.isActive) {
    throw new AppHttpError(409, 'Pasif tedarikçiye mail order kaydı girilemez', 'Conflict')
  }
  return supplier
}

function buildDescription(input: MailOrderSupplierLedgerInput): string {
  let description = formatMailOrderLedgerDescription(
    input.mailOrderCustomerId,
    input.orderId,
    input.amount,
  )
  if (input.mailOrderCommissionRate != null && input.mailOrderCommissionRate > 0) {
    description += ` · Komisyon: %${input.mailOrderCommissionRate}`
  }
  if (input.paymentNote) description += ` · ${input.paymentNote}`
  return description
}

export async function createPendingMailOrderSupplierLedger(
  tx: Tx,
  input: MailOrderSupplierLedgerInput,
): Promise<void> {
  await assertActiveSupplier(tx, input.supplierId)

  const existing = await tx.supplierLedgerEntry.findUnique({
    where: { paymentTransactionId: input.paymentId },
  })
  if (existing) return

  const snap = await loadSupplierBalanceSnapshot(tx, input.supplierId)
  const occurredAt = resolveOccurredAt()

  await tx.supplierLedgerEntry.create({
    data: {
      supplierId: input.supplierId,
      entryType: SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
      occurredAt,
      description: buildDescription(input),
      debitAmount: new Prisma.Decimal(0),
      creditAmount: new Prisma.Decimal(input.amount),
      balanceAfter: new Prisma.Decimal(snap.openBalance),
      currency: 'TRY',
      paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
      documentNo: input.orderId,
      paymentTransactionId: input.paymentId,
      salesOrderId: input.orderId,
      customerNameSnapshot: input.mailOrderCustomerId,
      source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
      status: SUPPLIER_LEDGER_STATUS.PENDING,
    },
  })
}

export async function approveMailOrderSupplierLedger(
  tx: Tx,
  input: MailOrderSupplierLedgerInput,
): Promise<void> {
  await assertActiveSupplier(tx, input.supplierId)

  const pending = await tx.supplierLedgerEntry.findUnique({
    where: { paymentTransactionId: input.paymentId },
  })

  const snap = await loadSupplierBalanceSnapshot(tx, input.supplierId)
  const balanceAfter = snap.openBalance + input.amount
  const occurredAt = resolveOccurredAt()
  const description = buildDescription(input)

  if (pending) {
    await tx.supplierLedgerEntry.update({
      where: { id: pending.id },
      data: {
        description,
        creditAmount: new Prisma.Decimal(input.amount),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        status: SUPPLIER_LEDGER_STATUS.APPROVED,
        customerNameSnapshot: input.mailOrderCustomerId,
        salesOrderId: input.orderId,
        source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
      },
    })
    return
  }

  await tx.supplierLedgerEntry.create({
    data: {
      supplierId: input.supplierId,
      entryType: SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
      occurredAt,
      description,
      debitAmount: new Prisma.Decimal(0),
      creditAmount: new Prisma.Decimal(input.amount),
      balanceAfter: new Prisma.Decimal(balanceAfter),
      currency: 'TRY',
      paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
      documentNo: input.orderId,
      paymentTransactionId: input.paymentId,
      salesOrderId: input.orderId,
      customerNameSnapshot: input.mailOrderCustomerId,
      source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
      status: SUPPLIER_LEDGER_STATUS.APPROVED,
    },
  })
}

export async function rejectPendingMailOrderSupplierLedger(
  tx: Tx,
  paymentId: string,
): Promise<void> {
  const pending = await tx.supplierLedgerEntry.findUnique({
    where: { paymentTransactionId: paymentId },
  })
  if (!pending || pending.status !== SUPPLIER_LEDGER_STATUS.PENDING) return

  await tx.supplierLedgerEntry.update({
    where: { id: pending.id },
    data: { status: SUPPLIER_LEDGER_STATUS.REJECTED },
  })
}

export async function reverseApprovedMailOrderSupplierLedger(
  tx: Tx,
  paymentId: string,
  reason?: string,
): Promise<void> {
  const original = await tx.supplierLedgerEntry.findUnique({
    where: { paymentTransactionId: paymentId },
  })
  if (!original || original.status !== SUPPLIER_LEDGER_STATUS.APPROVED) return

  const existingReversal = await tx.supplierLedgerEntry.findFirst({
    where: { reversesEntryId: original.id },
  })
  if (existingReversal) return

  const amount = Number(original.creditAmount)
  const snap = await loadSupplierBalanceSnapshot(tx, original.supplierId)
  const balanceAfter = Math.max(0, snap.openBalance - amount)
  const occurredAt = resolveOccurredAt()

  let description = `Mail order iptali · ${original.description}`
  if (reason?.trim()) description += ` · ${reason.trim()}`

  await tx.supplierLedgerEntry.create({
    data: {
      supplierId: original.supplierId,
      entryType: SUPPLIER_LEDGER_ENTRY_TYPE.ADJUSTMENT,
      occurredAt,
      description,
      debitAmount: new Prisma.Decimal(amount),
      creditAmount: new Prisma.Decimal(0),
      balanceAfter: new Prisma.Decimal(balanceAfter),
      currency: original.currency,
      paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
      documentNo: original.documentNo,
      paymentTransactionId: null,
      salesOrderId: original.salesOrderId,
      customerNameSnapshot: original.customerNameSnapshot,
      source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
      status: SUPPLIER_LEDGER_STATUS.REVERSED,
      reversesEntryId: original.id,
    },
  })
}

/** @deprecated use approveMailOrderSupplierLedger */
export async function appendMailOrderSupplierLedger(
  tx: Tx,
  input: Omit<MailOrderSupplierLedgerInput, 'paymentId'> & { paymentId?: string },
): Promise<void> {
  await approveMailOrderSupplierLedger(tx, {
    ...input,
    paymentId: input.paymentId ?? `legacy-${input.orderId}-${Date.now()}`,
  })
}
