import { Prisma, type PrismaClient } from '@prisma/client'
import { PAYMENT_METHOD } from '../constants/paymentMethods.js'
import { decimalToNumber } from '../lib/money.js'
import { sumPostedCaptureAmount } from '../lib/paymentLedger.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { mergeActorIntoPayload, resolveOperationActor } from '../lib/operationActor.js'
import { approveMailOrderSupplierLedger } from './appendMailOrderSupplierLedger.js'

const PAYMENT_POSTED_EVENT = 'payment.posted'

type Tx = Prisma.TransactionClient | PrismaClient

export type FinalizePaymentInput = {
  orderId: string
  paymentId: string
  amount: number
  method: string
  currency: string
  customerName: string
  note?: string
  mailOrderSupplierId?: string
  mailOrderCustomerId?: string
}

export async function finalizeOrderPaymentPosting(
  tx: Tx,
  input: FinalizePaymentInput,
  options?: { authUser?: AuthUserContext },
): Promise<void> {
  const isMailOrder = input.method === PAYMENT_METHOD.MAIL_ORDER
  const mailOrderCustomerId = input.mailOrderCustomerId?.trim() || input.customerName

  if (isMailOrder && input.mailOrderSupplierId) {
    await approveMailOrderSupplierLedger(tx, {
      supplierId: input.mailOrderSupplierId,
      orderId: input.orderId,
      paymentId: input.paymentId,
      amount: input.amount,
      mailOrderCustomerId,
      ...(input.note ? { paymentNote: input.note } : {}),
    })
  }

  const existing = await tx.salesOrder.findUniqueOrThrow({ where: { id: input.orderId } })
  const total = decimalToNumber(existing.totalAmount)
  const allPosted = await tx.paymentTransaction.findMany({
    where: { salesOrderId: input.orderId, status: 'POSTED' },
  })
  const ledgerPaid = sumPostedCaptureAmount(allPosted)
  const remaining = Math.max(0, total - ledgerPaid)

  await tx.salesOrder.update({
    where: { id: input.orderId },
    data: {
      paidAmount: new Prisma.Decimal(ledgerPaid),
      remainingAmount: new Prisma.Decimal(remaining),
      isFullyPaid: remaining <= 0.009,
      version: { increment: 1 },
    },
  })

  const now = new Date()
  const payPayload = mergeActorIntoPayload(
    {
      transactionId: input.paymentId,
      amount: input.amount.toFixed(2),
      currency: input.currency,
      method: input.method,
      ...(input.note ? { note: input.note } : {}),
      ...(isMailOrder && input.mailOrderSupplierId
        ? {
            mailOrderSupplierId: input.mailOrderSupplierId,
            mailOrderCustomerId,
            mailOrder: true,
          }
        : {}),
    },
    resolveOperationActor(undefined, options?.authUser, PAYMENT_POSTED_EVENT),
  )

  await tx.domainEvent.create({
    data: {
      type: PAYMENT_POSTED_EVENT,
      aggregateType: 'SalesOrder',
      aggregateId: input.orderId,
      occurredAt: now,
      correlationId: `corr-${input.orderId}-pay-${input.paymentId}`,
      payload: payPayload as Prisma.InputJsonValue,
    },
  })
}
