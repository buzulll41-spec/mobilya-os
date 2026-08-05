import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { isPaymentMethod } from '../constants/paymentMethods.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../constants/supplierLedgerEntryTypes.js'
import {
  mapSupplierDetailDto,
  mapSupplierLedgerEntryDto,
  type SupplierDetailDto,
  type SupplierLedgerEntryDto,
} from '../contracts/supplierDto.js'
import { isIsoDateString, parseIsoDateOnly, toIsoDateString } from '../lib/isoDate.js'
import { loadSupplierBalanceSnapshot } from './supplierBalance.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'

const SUPPLIER_PAYMENT_POSTED_EVENT = 'supplier.payment_posted'

export type PostSupplierPaymentRequest = {
  amount: number
  method: string
  occurredAt?: string
  description?: string
  documentNo?: string
}

export type PostSupplierPaymentResult = {
  entry: SupplierLedgerEntryDto
  supplier: SupplierDetailDto
}

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function assertValidPostSupplierPaymentRequest(body: unknown): PostSupplierPaymentRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const amount = typeof o.amount === 'number' ? o.amount : Number.NaN
  const method = typeof o.method === 'string' ? o.method.trim().toUpperCase() : ''
  const occurredAt = typeof o.occurredAt === 'string' ? o.occurredAt.trim() : undefined
  const description = optString(o.description)
  const documentNo = optString(o.documentNo)

  const details: Record<string, string> = {}
  if (!Number.isFinite(amount) || amount <= 0) details.amount = 'Must be > 0'
  if (!isPaymentMethod(method)) details.method = 'Invalid payment method'
  if (occurredAt && !isIsoDateString(occurredAt)) details.occurredAt = 'YYYY-MM-DD'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return {
    amount,
    method,
    ...(occurredAt ? { occurredAt } : {}),
    ...(description ? { description } : {}),
    ...(documentNo ? { documentNo } : {}),
  }
}

export async function postSupplierPayment(
  prisma: PrismaClient,
  supplierId: string,
  body: PostSupplierPaymentRequest,
  options?: { authUser?: AuthUserContext },
): Promise<PostSupplierPaymentResult> {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) {
    throw new AppHttpError(404, 'Tedarikçi bulunamadı', 'Not Found')
  }
  if (!supplier.isActive) {
    throw new AppHttpError(409, 'Pasif tedarikçiye ödeme girilemez', 'Conflict', {
      isActive: 'Supplier inactive',
    })
  }

  const occurredAt = body.occurredAt
    ? parseIsoDateOnly(body.occurredAt)
    : parseIsoDateOnly(process.env.DEMO_TODAY ?? toIsoDateString(new Date()))

  const description =
    body.description?.trim() ||
    `Ödeme — ${body.method}${body.documentNo ? ` (${body.documentNo})` : ''}`

  const entry = await prisma.$transaction(async (tx) => {
    const snap = await loadSupplierBalanceSnapshot(tx, supplierId)
    const balanceBefore = snap.openBalance
    if (body.amount > balanceBefore + 0.009) {
      throw new AppHttpError(400, 'Ödeme tutarı açık bakiyeyi aşamaz', 'Bad Request', {
        amount: 'Exceeds open balance',
      })
    }

    const balanceAfter = balanceBefore - body.amount

    const entry = await tx.supplierLedgerEntry.create({
      data: {
        supplierId,
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
        occurredAt,
        description,
        debitAmount: new Prisma.Decimal(body.amount),
        creditAmount: new Prisma.Decimal(0),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        currency: 'TRY',
        paymentMethod: body.method,
        documentNo: body.documentNo ?? null,
      },
    })

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        supplierId,
        'Supplier',
        SUPPLIER_PAYMENT_POSTED_EVENT,
        `corr-supplier-pay-${entry.id}`,
        occurredAt,
        {
          ledgerEntryId: entry.id,
          amount: body.amount,
          method: body.method,
          documentNo: body.documentNo ?? null,
        },
        options?.authUser,
      ),
    })

    return entry
  })

  const updatedSupplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } })
  const snap = await loadSupplierBalanceSnapshot(prisma, supplierId)

  return {
    entry: mapSupplierLedgerEntryDto(entry),
    supplier: mapSupplierDetailDto(updatedSupplier, snap.openBalance, snap.lastMovementAt),
  }
}

/** Test / seed — manuel GOODS_RECEIPT (Dilim B öncesi demo) */
export async function appendSupplierLedgerCredit(
  prisma: PrismaClient,
  supplierId: string,
  input: {
    amount: number
    description: string
    occurredAt?: Date
    documentNo?: string
    entryType?: string
  },
) {
  const occurredAt = input.occurredAt ?? new Date()
  return prisma.$transaction(async (tx) => {
    const snap = await loadSupplierBalanceSnapshot(tx, supplierId)
    const balanceAfter = snap.openBalance + input.amount
    return tx.supplierLedgerEntry.create({
      data: {
        supplierId,
        entryType: input.entryType ?? SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
        occurredAt,
        description: input.description,
        debitAmount: new Prisma.Decimal(0),
        creditAmount: new Prisma.Decimal(input.amount),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        currency: 'TRY',
        documentNo: input.documentNo ?? null,
      },
    })
  })
}
