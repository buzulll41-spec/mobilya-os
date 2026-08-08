import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import type { AuthUserContext } from '../lib/authUser.js'
import {
  buildDeterministicTransactionId,
  isPrismaUniqueViolation,
  normalizeIdempotencyKey,
} from '../lib/idempotency.js'
import { finalizeOrderPaymentPosting } from './finalizeOrderPaymentPosting.js'

const PAYMENT_REVERSED_EVENT = 'payment.reversed'

export type ReverseOrderPaymentRequest = {
  idempotencyKey?: string
  reversalNote?: string
  amount?: number
}

export function assertValidReverseOrderPaymentRequest(body: unknown): ReverseOrderPaymentRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }
  const o = body as Record<string, unknown>
  const reversalNote =
    typeof o.reversalNote === 'string' && o.reversalNote.trim() ? o.reversalNote.trim() : undefined
  const amount = typeof o.amount === 'number' && Number.isFinite(o.amount) ? o.amount : undefined
  if (amount != null && amount <= 0) {
    throw new AppHttpError(400, 'İade tutarı 0 dan büyük olmalı', 'Bad Request', {
      amount: 'Must be > 0',
    })
  }
  const idempotencyKey = normalizeIdempotencyKey(o.idempotencyKey)
  return {
    ...(reversalNote ? { reversalNote } : {}),
    ...(amount != null ? { amount } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  }
}

export async function reverseOrderPayment(
  prisma: PrismaClient,
  orderId: string,
  paymentId: string,
  body: ReverseOrderPaymentRequest,
  options?: { authUser?: AuthUserContext },
): Promise<SalesOrderListItemDto> {
  const sourcePayment = await prisma.paymentTransaction.findUnique({ where: { id: paymentId } })
  if (!sourcePayment || sourcePayment.salesOrderId !== orderId) {
    throw new AppHttpError(404, 'Ödeme kaydı bulunamadı', 'Not Found')
  }
  if (sourcePayment.status !== 'POSTED') {
    throw new AppHttpError(409, 'Sadece POSTED ödemeler iade edilebilir', 'Conflict')
  }
  if (sourcePayment.kind === 'REFUND' || sourcePayment.kind === 'CHARGEBACK') {
    throw new AppHttpError(409, 'Bu hareket için tekrar iade oluşturulamaz', 'Conflict')
  }

  const amount = body.amount ?? Number(sourcePayment.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppHttpError(400, 'İade tutarı geçersiz', 'Bad Request', {
      amount: 'Invalid refund amount',
    })
  }

  const refundIdempotencyKey =
    body.idempotencyKey ??
    buildDeterministicTransactionId(
      'IDK',
      paymentId,
      [orderId, amount, sourcePayment.currency, body.reversalNote ?? ''].join('|'),
    )
  const refundId = buildDeterministicTransactionId('RFX', paymentId, refundIdempotencyKey)

  try {
    await prisma.$transaction(async (tx) => {
      await tx.paymentTransaction.create({
        data: {
          id: refundId,
          salesOrderId: orderId,
          kind: 'REFUND',
          status: 'POSTED',
          amount: new Prisma.Decimal(amount),
          currency: sourcePayment.currency,
          occurredAt: new Date(),
          idempotencyKey: refundIdempotencyKey,
          reversalSourcePaymentId: paymentId,
          mailOrderSupplierId: sourcePayment.mailOrderSupplierId,
          mailOrderSupplierNameSnapshot: sourcePayment.mailOrderSupplierNameSnapshot,
        },
      })

      await finalizeOrderPaymentPosting(
        tx,
        {
          orderId,
          paymentId: refundId,
          amount,
          method: 'REFUND',
          currency: sourcePayment.currency,
          customerName: (await tx.salesOrder.findUniqueOrThrow({ where: { id: orderId } })).customerName,
          ...(body.reversalNote ? { note: body.reversalNote } : {}),
        },
        options,
      )

      await tx.domainEvent.create({
        data: {
          type: PAYMENT_REVERSED_EVENT,
          aggregateType: 'SalesOrder',
          aggregateId: orderId,
          occurredAt: new Date(),
          correlationId: `corr-${orderId}-pay-reversed-${refundId}`,
          payloadSchemaVersion: '1',
          payload: {
            sourcePaymentId: paymentId,
            reversalPaymentId: refundId,
            amount: amount.toFixed(2),
            currency: sourcePayment.currency,
            ...(body.reversalNote ? { reversalNote: body.reversalNote } : {}),
          },
        },
      })
    })
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      const existingRefund = await prisma.paymentTransaction.findFirst({
        where: {
          salesOrderId: orderId,
          OR: [{ id: refundId }, { reversalSourcePaymentId: paymentId }],
        },
      })
      if (existingRefund && existingRefund.salesOrderId === orderId) {
        const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
        return projectSalesOrderListItemFromDbRow(row, process.env.DEMO_TODAY ?? '2026-05-14')
      }
    }
    throw err
  }

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return projectSalesOrderListItemFromDbRow(row, process.env.DEMO_TODAY ?? '2026-05-14')
}
