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
import { rejectPendingMailOrderSupplierLedger } from './appendMailOrderSupplierLedger.js'

const PAYMENT_REJECTED_EVENT = 'payment.rejected'

export type RejectOrderPaymentRequest = {
  rejectionNote?: string
}

export function assertValidRejectOrderPaymentRequest(body: unknown): RejectOrderPaymentRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppHttpError(400, 'Red sebebi zorunludur', 'Bad Request', {
      rejectionNote: 'Required',
    })
  }
  const o = body as Record<string, unknown>
  const rejectionNote =
    typeof o.rejectionNote === 'string' && o.rejectionNote.trim() ? o.rejectionNote.trim() : ''
  if (!rejectionNote) {
    throw new AppHttpError(400, 'Red sebebi zorunludur', 'Bad Request', {
      rejectionNote: 'Required',
    })
  }
  return { rejectionNote }
}

export async function rejectOrderPayment(
  prisma: PrismaClient,
  orderId: string,
  paymentId: string,
  body: RejectOrderPaymentRequest,
  options?: { authUser?: AuthUserContext },
): Promise<SalesOrderListItemDto> {
  if (!canApprovePayments(options?.authUser?.role)) {
    throw new AppHttpError(403, 'Tahsilat red yetkisi yok', 'Forbidden')
  }

  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const payment = await prisma.paymentTransaction.findUnique({ where: { id: paymentId } })
  if (!payment || payment.salesOrderId !== orderId) {
    throw new AppHttpError(404, 'Ödeme kaydı bulunamadı', 'Not Found')
  }
  if (payment.status !== PAYMENT_TX_STATUS.PENDING_APPROVAL) {
    throw new AppHttpError(409, 'Ödeme onay bekliyor durumunda değil', 'Conflict')
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.paymentTransaction.update({
      where: { id: paymentId },
      data: { status: PAYMENT_TX_STATUS.CANCELLED },
    })

    const rejectedPayload = mergeActorIntoPayload(
      {
        transactionId: paymentId,
        amount: Number(payment.amount).toFixed(2),
        currency: payment.currency,
        ...(body.rejectionNote ? { rejectionNote: body.rejectionNote } : {}),
      },
      resolveOperationActor(undefined, options?.authUser, PAYMENT_REJECTED_EVENT),
    )

    await tx.domainEvent.create({
      data: {
        type: PAYMENT_REJECTED_EVENT,
        aggregateType: 'SalesOrder',
        aggregateId: orderId,
        occurredAt: now,
        correlationId: `corr-${orderId}-pay-rejected-${paymentId}`,
        payload: rejectedPayload as Prisma.InputJsonValue,
      },
    })

    if (payment.kind === 'MAIL_ORDER') {
      await rejectPendingMailOrderSupplierLedger(tx, paymentId)
      await tx.domainEvent.create({
        data: {
          type: 'mailOrder.rejected',
          aggregateType: 'SalesOrder',
          aggregateId: orderId,
          occurredAt: now,
          correlationId: `corr-${orderId}-mo-rejected-${paymentId}`,
          payload: rejectedPayload as Prisma.InputJsonValue,
        },
      })
    }
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return projectSalesOrderListItemFromDbRow(row, todayIso)
}
