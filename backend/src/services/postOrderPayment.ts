import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { PAYMENT_METHOD } from '../constants/paymentMethods.js'
import { isPaymentMethod } from '../constants/paymentMethods.js'
import { USER_ROLE } from '../constants/userRoles.js'
import { decimalToNumber } from '../lib/money.js'
import { sumPostedCaptureAmount } from '../lib/paymentLedger.js'
import {
  PAYMENT_TX_STATUS,
  paymentAutoApprovesForRole,
} from '../lib/paymentApprovalPolicy.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { mergeActorIntoPayload, resolveOperationActor } from '../lib/operationActor.js'
import { finalizeOrderPaymentPosting } from './finalizeOrderPaymentPosting.js'
import { resolveMailOrderSupplierFields } from './resolveMailOrderSupplierFields.js'
import { createPendingMailOrderSupplierLedger } from './appendMailOrderSupplierLedger.js'
import {
  buildDeterministicTransactionId,
  isPrismaUniqueViolation,
  normalizeIdempotencyKey,
} from '../lib/idempotency.js'

const PAYMENT_PENDING_EVENT = 'payment.pending'

export type PostOrderPaymentRequest = {
  amount: number
  method: string
  note?: string
  mailOrderSupplierId?: string
  mailOrderCustomerId?: string
  idempotencyKey?: string
}

export function assertValidPostOrderPaymentRequest(body: unknown): PostOrderPaymentRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const amount = typeof o.amount === 'number' ? o.amount : Number.NaN
  const method = typeof o.method === 'string' ? o.method.trim().toUpperCase() : ''
  const note = typeof o.note === 'string' ? o.note.trim() : undefined
  const mailOrderSupplierId =
    typeof o.mailOrderSupplierId === 'string' ? o.mailOrderSupplierId.trim() : undefined
  const mailOrderCustomerId =
    typeof o.mailOrderCustomerId === 'string' ? o.mailOrderCustomerId.trim() : undefined
  const idempotencyKey = normalizeIdempotencyKey(o.idempotencyKey)

  const details: Record<string, string> = {}
  if (!Number.isFinite(amount) || amount <= 0) details.amount = 'Must be > 0'
  if (!isPaymentMethod(method)) details.method = 'Invalid payment method'
  if (method === PAYMENT_METHOD.MAIL_ORDER && !mailOrderSupplierId) {
    details.mailOrderSupplierId = 'Required for mail order'
  }

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return {
    amount,
    method,
    ...(note ? { note } : {}),
    ...(mailOrderSupplierId ? { mailOrderSupplierId } : {}),
    ...(mailOrderCustomerId ? { mailOrderCustomerId } : {}),
    ...(idempotencyKey ? { idempotencyKey } : {}),
  }
}

export async function postOrderPayment(
  prisma: PrismaClient,
  orderId: string,
  body: PostOrderPaymentRequest,
  options?: { authUser?: AuthUserContext },
): Promise<SalesOrderListItemDto> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await loadSalesOrderWithRelations(prisma, orderId)
  const total = decimalToNumber(existing.totalAmount)
  const postedBefore = sumPostedCaptureAmount(existing.payments)
  const nextPaid = postedBefore + body.amount

  if (nextPaid > total + 0.009) {
    throw new AppHttpError(400, 'Ödeme tutarı kalan bakiyeyi aşamaz', 'Bad Request', {
      amount: 'Exceeds amount due',
    })
  }

  const isMailOrder = body.method === PAYMENT_METHOD.MAIL_ORDER
  const paymentKind = isMailOrder ? 'MAIL_ORDER' : 'CAPTURE'
  const autoApprove =
    paymentAutoApprovesForRole(options?.authUser?.role) ||
    (!isMailOrder && options?.authUser?.role === USER_ROLE.SALES)
  const initialStatus = autoApprove ? PAYMENT_TX_STATUS.POSTED : PAYMENT_TX_STATUS.PENDING_APPROVAL
  const mailOrderCustomerId = body.mailOrderCustomerId?.trim() || existing.customerName

  const now = new Date()
  const paymentIdempotencyKey =
    body.idempotencyKey ??
    buildDeterministicTransactionId(
      'IDK',
      orderId,
      [body.amount, body.method, body.note ?? '', body.mailOrderSupplierId ?? '', body.mailOrderCustomerId ?? '', paymentKind].join('|'),
    )
  const paymentId = buildDeterministicTransactionId('PTX', orderId, paymentIdempotencyKey)

  try {
    await prisma.$transaction(async (tx) => {
      const mailOrderSupplierFields =
        isMailOrder && body.mailOrderSupplierId
          ? await resolveMailOrderSupplierFields(tx, body.mailOrderSupplierId)
          : {}

      await tx.paymentTransaction.create({
        data: {
          id: paymentId,
          salesOrderId: orderId,
          kind: paymentKind,
          status: initialStatus,
          amount: new Prisma.Decimal(body.amount),
          currency: existing.currency,
          occurredAt: now,
          idempotencyKey: paymentIdempotencyKey,
          ...mailOrderSupplierFields,
        },
      })

      if (autoApprove) {
        await finalizeOrderPaymentPosting(
          tx,
          {
            orderId,
            paymentId,
            amount: body.amount,
            method: body.method,
            currency: existing.currency,
            customerName: existing.customerName,
            ...(body.note ? { note: body.note } : {}),
            ...(body.mailOrderSupplierId ? { mailOrderSupplierId: body.mailOrderSupplierId } : {}),
            ...(mailOrderCustomerId ? { mailOrderCustomerId } : {}),
          },
          options,
        )
      } else {
        const pendingPayload = mergeActorIntoPayload(
          {
            transactionId: paymentId,
            amount: body.amount.toFixed(2),
            currency: existing.currency,
            method: body.method,
            status: PAYMENT_TX_STATUS.PENDING_APPROVAL,
            ...(body.note ? { note: body.note } : {}),
            ...(isMailOrder && body.mailOrderSupplierId
              ? {
                  mailOrderSupplierId: body.mailOrderSupplierId,
                  mailOrderCustomerId,
                  mailOrder: true,
                }
              : {}),
          },
          resolveOperationActor(undefined, options?.authUser, PAYMENT_PENDING_EVENT),
        )

        await tx.domainEvent.create({
          data: {
            type: PAYMENT_PENDING_EVENT,
            aggregateType: 'SalesOrder',
            aggregateId: orderId,
            occurredAt: now,
            correlationId: `corr-${orderId}-pay-pending-${paymentId}`,
            payload: pendingPayload as Prisma.InputJsonValue,
          },
        })
        if (isMailOrder) {
          await tx.domainEvent.create({
            data: {
              type: 'mailOrder.pending',
              aggregateType: 'SalesOrder',
              aggregateId: orderId,
              occurredAt: now,
              correlationId: `corr-${orderId}-mo-pending-${paymentId}`,
              payload: pendingPayload as Prisma.InputJsonValue,
            },
          })
          if (body.mailOrderSupplierId) {
            await createPendingMailOrderSupplierLedger(tx, {
              supplierId: body.mailOrderSupplierId,
              orderId,
              paymentId,
              amount: body.amount,
              mailOrderCustomerId,
              ...(body.note ? { paymentNote: body.note } : {}),
            })
          }
        }
      }
    })
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      const existingPayment = await prisma.paymentTransaction.findFirst({
        where: { salesOrderId: orderId, idempotencyKey: paymentIdempotencyKey },
      })
      if (existingPayment && existingPayment.salesOrderId === orderId) {
        const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
        return projectSalesOrderListItemFromDbRow(row, todayIso)
      }
    }
    throw err
  }

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return projectSalesOrderListItemFromDbRow(row, todayIso)
}
