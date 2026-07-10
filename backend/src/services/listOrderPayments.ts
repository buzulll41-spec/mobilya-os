import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { decimalToNumber, numberToMoney } from '../lib/money.js'

const DEFAULT_CURRENCY = 'TRY'

export type OrderPaymentListItemDto = {
  id: string
  salesOrderId: string
  invoiceId: string | null
  kind: string
  method: string
  status: string
  amount: ReturnType<typeof numberToMoney>
  occurredAt: string
  idempotencyKey: string
  externalRef: string | null
  mailOrderSupplierId: string | null
  mailOrderSupplierName: string | null
}

function inferPaymentMethod(kind: string): string {
  return kind === 'MAIL_ORDER' ? 'MAIL_ORDER' : 'TRANSFER'
}

export async function listOrderPayments(
  prisma: PrismaClient,
  orderId: string,
): Promise<OrderPaymentListItemDto[]> {
  const order = await prisma.salesOrder.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }

  const rows = await prisma.paymentTransaction.findMany({
    where: { salesOrderId: orderId },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
  })

  return rows.map((p) => ({
    id: p.id,
    salesOrderId: p.salesOrderId,
    invoiceId: null,
    kind: p.kind,
    method: inferPaymentMethod(p.kind),
    status: p.status,
    amount: numberToMoney(decimalToNumber(p.amount), p.currency || DEFAULT_CURRENCY),
    occurredAt: p.occurredAt.toISOString(),
    idempotencyKey: p.id,
    externalRef: null,
    mailOrderSupplierId: p.mailOrderSupplierId,
    mailOrderSupplierName: p.mailOrderSupplierNameSnapshot,
  }))
}
