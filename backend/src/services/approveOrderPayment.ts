import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { PAYMENT_TX_STATUS, canApprovePayments } from '../lib/paymentApprovalPolicy.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { mergeActorIntoPayload, resolveOperationActor } from '../lib/operationActor.js'
import { finalizeOrderPaymentPosting } from './finalizeOrderPaymentPosting.js'

const PAYMENT_APPROVED_EVENT = 'payment.approved'

export type ApproveOrderPaymentRequest = {
  approvalNote?: string
}

export function assertValidApproveOrderPaymentRequest(body: unknown): ApproveOrderPaymentRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {}
  }
  const o = body as Record<string, unknown>
  const approvalNote =
    typeof o.approvalNote === 'string' && o.approvalNote.trim() ? o.approvalNote.trim() : undefined
  return approvalNote ? { approvalNote } : {}
}

async function findPendingPaymentEvent(prisma: PrismaClient, orderId: string, paymentId: string) {
  const events = await prisma.domainEvent.findMany({
    where: { aggregateId: orderId, type: 'payment.pending' },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  })
  return events.find((e) => {
    const p = e.payload as Record<string, unknown> | null
    return p?.transactionId === paymentId
  })
}

export async function approveOrderPayment(
  prisma: PrismaClient,
  orderId: string,
  paymentId: string,
  body: ApproveOrderPaymentRequest,
  options?: { authUser?: AuthUserContext },
): Promise<SalesOrderListItemDto> {
  if (!canApprovePayments(options?.authUser?.role)) {
    throw new AppHttpError(403, 'Tahsilat onay yetkisi yok', 'Forbidden')
  }

  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const payment = await prisma.paymentTransaction.findUnique({ where: { id: paymentId } })
  if (!payment || payment.salesOrderId !== orderId) {
    throw new AppHttpError(404, 'Ödeme kaydı bulunamadı', 'Not Found')
  }
  if (payment.status !== PAYMENT_TX_STATUS.PENDING_APPROVAL) {
    throw new AppHttpError(409, 'Ödeme onay bekliyor durumunda değil', 'Conflict')
  }

  const pendingEvent = await findPendingPaymentEvent(prisma, orderId, paymentId)
  const payload = (pendingEvent?.payload ?? {}) as Record<string, unknown>
  const method = typeof payload.method === 'string' ? payload.method : 'CASH'
  const note = typeof payload.note === 'string' ? payload.note : undefined
  const mailOrderSupplierId =
    payment.mailOrderSupplierId ??
    (typeof payload.mailOrderSupplierId === 'string' ? payload.mailOrderSupplierId : undefined)
  const mailOrderCustomerId =
    typeof payload.mailOrderCustomerId === 'string' ? payload.mailOrderCustomerId : undefined

  const existing = await loadSalesOrderWithRelations(prisma, orderId)
  const amount = Number(payment.amount)

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.update({
      where: { id: paymentId },
      data: { status: PAYMENT_TX_STATUS.POSTED },
    })

    await finalizeOrderPaymentPosting(
      tx,
      {
        orderId,
        paymentId,
        amount,
        method,
        currency: payment.currency,
        customerName: existing.customerName,
        ...(note ? { note } : {}),
        ...(mailOrderSupplierId ? { mailOrderSupplierId } : {}),
        ...(mailOrderCustomerId ? { mailOrderCustomerId } : {}),
      },
      options,
    )

    const approvedPayload = mergeActorIntoPayload(
      {
        transactionId: paymentId,
        amount: amount.toFixed(2),
        currency: payment.currency,
        method,
        ...(body.approvalNote ? { approvalNote: body.approvalNote } : {}),
      },
      resolveOperationActor(undefined, options?.authUser, PAYMENT_APPROVED_EVENT),
    )

    await tx.domainEvent.create({
      data: {
        type: PAYMENT_APPROVED_EVENT,
        aggregateType: 'SalesOrder',
        aggregateId: orderId,
        occurredAt: now,
        correlationId: `corr-${orderId}-pay-approved-${paymentId}`,
        payload: approvedPayload as Prisma.InputJsonValue,
      },
    })

    if (payment.kind === 'MAIL_ORDER') {
      await tx.domainEvent.create({
        data: {
          type: 'mailOrder.approved',
          aggregateType: 'SalesOrder',
          aggregateId: orderId,
          occurredAt: now,
          correlationId: `corr-${orderId}-mo-approved-${paymentId}`,
          payload: approvedPayload as Prisma.InputJsonValue,
        },
      })
    }
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return projectSalesOrderListItemFromDbRow(row, todayIso)
}
