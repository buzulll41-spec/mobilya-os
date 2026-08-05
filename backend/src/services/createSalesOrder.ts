import { Prisma, type PrismaClient } from '@prisma/client'
import type { CreateOrderRequest, NormalizedCreateOrderRequest } from '../contracts/createOrderRequest.js'
import { AppHttpError } from '../errors/apiError.js'
import { isOrderDisplayStatus } from '../constants/orderStatuses.js'
import { SALES_SOURCE_TYPE } from '../constants/salesSourceTypes.js'
import { PAYMENT_METHOD } from '../constants/paymentMethods.js'
import { parseCreateOrderCommercialFields } from '../lib/parseCreateOrderCommercial.js'
import { buildPersistedOrderLineFields } from '../lib/buildLineCommercialSnapshot.js'
import {
  computeLineTotal,
  computeSubtotalFromLineTotals,
  resolveCommerceTotals,
} from '../lib/commerceFinance.js'
import {
  buildOrderLineIds,
  formatProductSummaryFromLines,
  roundMoney,
  sortLinesByOrder,
  type CreateOrderLineInput,
} from '../lib/orderLineCreate.js'
import {
  parseLineConfiguration,
  validateLineConfiguration,
} from '../constants/productConfigurationSchema.js'
import {
  resolveCreateOrderLines,
  type RawCreateOrderLine,
} from '../lib/resolveOrderLinesFromProducts.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import {
  PAYMENT_TX_STATUS,
  paymentAutoApprovesForRole,
} from '../lib/paymentApprovalPolicy.js'
import { USER_ROLE } from '../constants/userRoles.js'
import { finalizeOrderPaymentPosting } from './finalizeOrderPaymentPosting.js'
import { resolveMailOrderSupplierFields } from './resolveMailOrderSupplierFields.js'
import { createPendingMailOrderSupplierLedger } from './appendMailOrderSupplierLedger.js'
import { mergeActorIntoPayload, resolveOperationActor } from '../lib/operationActor.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'

const ORDER_PLACED_EVENT = 'order.placed'
const PAYMENT_PENDING_EVENT = 'payment.pending'
const MAIL_ORDER_PENDING_EVENT = 'mailOrder.pending'
const PAYMENT_APPROVED_EVENT = 'payment.approved'

function parseOrderDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

function parseOptionalIsoDate(raw: unknown, field: 'dueDate' | 'shipmentDate'): Date | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  if (!value) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', {
      [field]: 'Must be YYYY-MM-DD',
    })
  }
  const dt = parseOrderDate(value)
  if (Number.isNaN(dt.getTime())) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', {
      [field]: 'Invalid date',
    })
  }
  return dt
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function newOrderId(): string {
  return `S-${Date.now()}`
}

function parseLine(raw: unknown, index: number): CreateOrderLineInput | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const quantity = typeof o.quantity === 'number' ? o.quantity : Number.NaN
  const unitPrice = typeof o.unitPrice === 'number' ? o.unitPrice : Number.NaN
  const sortOrder =
    typeof o.sortOrder === 'number' && Number.isInteger(o.sortOrder) ? o.sortOrder : index
  const productGroup = typeof o.productGroup === 'string' ? o.productGroup.trim() : undefined
  const productId = typeof o.productId === 'string' && o.productId.trim() ? o.productId.trim() : undefined
  const configuration = parseLineConfiguration(o.configuration)
  const supplierId =
    typeof o.supplierId === 'string' && o.supplierId.trim() ? o.supplierId.trim() : undefined
  const supplierNameSnapshot =
    typeof o.supplierNameSnapshot === 'string' && o.supplierNameSnapshot.trim()
      ? o.supplierNameSnapshot.trim()
      : undefined
  const soldSalesSourceType =
    typeof o.soldSalesSourceType === 'string' && o.soldSalesSourceType.trim()
      ? o.soldSalesSourceType.trim()
      : undefined
  const soldDisplayFloor =
    typeof o.soldDisplayFloor === 'string' && o.soldDisplayFloor.trim()
      ? o.soldDisplayFloor.trim()
      : undefined
  const soldExternalSupplyType =
    typeof o.soldExternalSupplyType === 'string' && o.soldExternalSupplyType.trim()
      ? o.soldExternalSupplyType.trim()
      : undefined
  const soldUnitCost =
    typeof o.soldUnitCost === 'number' && Number.isFinite(o.soldUnitCost) ? o.soldUnitCost : undefined
  if ((!title && !productId) || !Number.isFinite(quantity) || quantity <= 0) return null
  if (!Number.isFinite(unitPrice) || unitPrice < 0) return null
  const unit = roundMoney(unitPrice)
  const lineTotal = computeLineTotal(quantity, unit)
  if (lineTotal <= 0) return null
  return {
    title,
    quantity,
    unitPrice: unit,
    lineTotal,
    sortOrder,
    ...(productGroup ? { productGroup } : {}),
    ...(productId ? { productId } : {}),
    ...(configuration ? { configuration } : {}),
    ...(supplierId ? { supplierId } : {}),
    ...(supplierNameSnapshot ? { supplierNameSnapshot } : {}),
    ...(soldSalesSourceType ? { soldSalesSourceType } : {}),
    ...(soldDisplayFloor ? { soldDisplayFloor } : {}),
    ...(soldExternalSupplyType ? { soldExternalSupplyType } : {}),
    ...(soldUnitCost != null ? { soldUnitCost } : {}),
  }
}

function resolveCommerceFromBody(
  body: CreateOrderRequest,
  lines: CreateOrderLineInput[],
): ReturnType<typeof resolveCommerceTotals> {
  const subtotalAmount = computeSubtotalFromLineTotals(lines.map((l) => l.lineTotal))
  try {
    return resolveCommerceTotals({
      subtotalAmount:
        typeof body.subtotalAmount === 'number' && Number.isFinite(body.subtotalAmount)
          ? body.subtotalAmount
          : subtotalAmount,
      paidAmount: body.paidAmount,
      totalAmount: body.totalAmount,
      discountType: body.discountType,
      discountPercent: body.discountPercent,
      discountFixedAmount: body.discountFixedAmount,
      discountAmount: body.discountAmount,
      discountNote: body.discountNote,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid commerce totals'
    throw new AppHttpError(400, msg, 'Bad Request')
  }
}

export function normalizeCreateOrderRequest(body: CreateOrderRequest): NormalizedCreateOrderRequest {
  const customerName = body.customerName.trim()
  const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : undefined
  const salesPerson =
    typeof body.salesPerson === 'string' && body.salesPerson.trim()
      ? body.salesPerson.trim()
      : undefined
  const dueDate =
    typeof body.dueDate === 'string' && body.dueDate.trim() ? body.dueDate.trim() : undefined
  const shipmentDate =
    typeof body.shipmentDate === 'string' && body.shipmentDate.trim()
      ? body.shipmentDate.trim()
      : undefined
  const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : undefined
  const cost =
    typeof body.cost === 'number' && Number.isFinite(body.cost) && body.cost >= 0
      ? roundMoney(body.cost)
      : undefined
  const status = body.status

  let lines: CreateOrderLineInput[] = []

  if (Array.isArray(body.lines) && body.lines.length > 0) {
    lines = body.lines
      .map((raw, i) => parseLine(raw, i))
      .filter((l): l is CreateOrderLineInput => l != null)
    if (lines.length === 0) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', { lines: 'Invalid line items' })
    }
    lines = sortLinesByOrder(lines)
  } else {
    const productTitle = typeof body.productTitle === 'string' ? body.productTitle.trim() : ''
    const totalAmount = typeof body.totalAmount === 'number' ? body.totalAmount : Number.NaN
    if (!productTitle) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', {
        productTitle: 'Required when lines is omitted',
      })
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', { totalAmount: 'Must be > 0' })
    }
    const unit = roundMoney(totalAmount)
    lines = [
      {
        title: productTitle,
        quantity: 1,
        unitPrice: unit,
        lineTotal: unit,
        sortOrder: 0,
      },
    ]
  }

  if (lines.length === 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { lines: 'At least one line required' })
  }

  const commerce = resolveCommerceFromBody(body, lines)
  const productTitle = formatProductSummaryFromLines(lines)

  return {
    customerName,
    ...(phone ? { phone } : {}),
    ...(salesPerson ? { salesPerson } : {}),
    ...(dueDate ? { dueDate } : {}),
    ...(shipmentDate ? { shipmentDate } : {}),
    ...(notes ? { notes } : {}),
    ...(cost != null ? { cost } : {}),
    productTitle,
    subtotalAmount: commerce.subtotalAmount,
    discountAmount: commerce.discountAmount,
    discountType: commerce.discountType,
    discountPercent: commerce.discountPercent,
    discountFixedAmount: commerce.discountFixedAmount,
    discountNote: commerce.discountNote,
    totalAmount: commerce.totalAmount,
    paidAmount: commerce.paidAmount,
    remainingAmount: commerce.remainingAmount,
    isFullyPaid: commerce.isFullyPaid,
    status,
    lines,
  }
}

export function assertValidCreateOrderRequest(body: unknown): NormalizedCreateOrderRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const customerName = typeof o.customerName === 'string' ? o.customerName.trim() : ''
  const paidAmount = typeof o.paidAmount === 'number' ? o.paidAmount : Number.NaN
  const status = typeof o.status === 'string' ? o.status.trim() : ''

  const details: Record<string, string> = {}
  if (!customerName) details.customerName = 'Required'
  if (!Number.isFinite(paidAmount) || paidAmount < 0) details.paidAmount = 'Must be >= 0'
  if (!isOrderDisplayStatus(status)) details.status = 'Invalid status'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  const request: CreateOrderRequest = {
    customerName,
    paidAmount,
    status: status as CreateOrderRequest['status'],
    ...(typeof o.phone === 'string' ? { phone: o.phone } : {}),
    ...(typeof o.salesPerson === 'string' ? { salesPerson: o.salesPerson } : {}),
    ...(typeof o.dueDate === 'string' ? { dueDate: o.dueDate } : {}),
    ...(typeof o.shipmentDate === 'string' ? { shipmentDate: o.shipmentDate } : {}),
    ...(typeof o.notes === 'string' ? { notes: o.notes } : {}),
    ...(typeof o.cost === 'number' ? { cost: o.cost } : {}),
    ...(typeof o.productTitle === 'string' ? { productTitle: o.productTitle } : {}),
    ...(typeof o.subtotalAmount === 'number' ? { subtotalAmount: o.subtotalAmount } : {}),
    ...(typeof o.discountAmount === 'number' ? { discountAmount: o.discountAmount } : {}),
    ...(typeof o.discountType === 'string' ? { discountType: o.discountType as CreateOrderRequest['discountType'] } : {}),
    ...(typeof o.discountPercent === 'number' ? { discountPercent: o.discountPercent } : {}),
    ...(typeof o.discountFixedAmount === 'number' ? { discountFixedAmount: o.discountFixedAmount } : {}),
    ...(typeof o.discountNote === 'string' ? { discountNote: o.discountNote } : {}),
    ...(typeof o.totalAmount === 'number' ? { totalAmount: o.totalAmount } : {}),
    ...(Array.isArray(o.lines) ? { lines: o.lines as CreateOrderRequest['lines'] } : {}),
  }

  const normalized = normalizeCreateOrderRequest(request)
  parseOptionalIsoDate(normalized.dueDate, 'dueDate')
  parseOptionalIsoDate(normalized.shipmentDate, 'shipmentDate')
  const commercial = parseCreateOrderCommercialFields(o, normalized)
  return { ...normalized, ...commercial }
}

export async function createSalesOrder(
  prisma: PrismaClient,
  body: NormalizedCreateOrderRequest,
  options?: { authUser?: import('../lib/authUser.js').AuthUserContext },
): Promise<{ dto: SalesOrderListItemDto; createdAt: Date; updatedAt: Date }> {
  const resolvedLines = await resolveCreateOrderLines(
    prisma,
    body.lines as RawCreateOrderLine[],
  )

  const productIds = [...new Set(resolvedLines.map((l) => l.productId).filter(Boolean))] as string[]
  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, category: true, suiteType: true },
        })
      : []
  const productById = new Map(products.map((p) => [p.id, p]))

  for (const ln of resolvedLines) {
    const product = ln.productId ? productById.get(ln.productId) : undefined
    const { errors } = validateLineConfiguration(
      {
        category: product?.category ?? ln.productGroup,
        productGroup: ln.productGroup,
        suiteType: product?.suiteType ?? undefined,
        title: ln.title,
      },
      ln.configuration,
    )
    if (errors.length > 0) {
      throw new AppHttpError(400, 'Validation failed', 'Bad Request', {
        lines: `${ln.title}: ${errors[0]}`,
      })
    }
  }

  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const orderDate = parseOrderDate(todayIso)
  const dueDate = parseOptionalIsoDate(body.dueDate, 'dueDate') ?? addDaysUtc(orderDate, 14)
  const shipmentDate =
    parseOptionalIsoDate(body.shipmentDate, 'shipmentDate') ?? addDaysUtc(dueDate, 5)
  const orderId = newOrderId()
  const lineIds = buildOrderLineIds(orderId, resolvedLines.length)
  const now = new Date()
  const isMailOrder = body.paymentMethod === PAYMENT_METHOD.MAIL_ORDER
  const paymentKind = isMailOrder ? 'MAIL_ORDER' : 'CAPTURE'
  const autoApprove =
    paymentAutoApprovesForRole(options?.authUser?.role) ||
    (!isMailOrder && options?.authUser?.role === USER_ROLE.SALES)
  const hasInitialPayment = body.paidAmount > 0
  const initialPaymentStatus = autoApprove ? PAYMENT_TX_STATUS.POSTED : PAYMENT_TX_STATUS.PENDING_APPROVAL
  const ledgerPaidAtCreate = autoApprove && hasInitialPayment ? body.paidAmount : 0
  const remainingAtCreate = Math.max(0, body.totalAmount - ledgerPaidAtCreate)
  const paymentId = hasInitialPayment ? `PTX-${orderId}-initial` : null

  return prisma.$transaction(async (tx) => {
    const mailOrderSupplierFields =
      isMailOrder && body.mailOrderSupplierId
        ? await resolveMailOrderSupplierFields(tx, body.mailOrderSupplierId)
        : {}

    await tx.salesOrder.create({
      data: {
        id: orderId,
        customerName: body.customerName,
        ...(typeof body.phone === 'string' && body.phone.trim()
          ? { customerPhone: body.phone.trim() }
          : {}),
        productSummary: body.productTitle,
        displayStatus: body.status,
        currency: 'TRY',
        subtotalAmount: new Prisma.Decimal(body.subtotalAmount),
        discountAmount: new Prisma.Decimal(body.discountAmount),
        discountType: body.discountType,
        ...(body.discountPercent != null
          ? { discountPercent: new Prisma.Decimal(body.discountPercent) }
          : {}),
        ...(body.discountFixedAmount != null
          ? { discountFixedAmount: new Prisma.Decimal(body.discountFixedAmount) }
          : {}),
        ...(body.discountNote ? { discountNote: body.discountNote } : {}),
        totalAmount: new Prisma.Decimal(body.totalAmount),
        paidAmount: new Prisma.Decimal(ledgerPaidAtCreate),
        remainingAmount: new Prisma.Decimal(remainingAtCreate),
        isFullyPaid: remainingAtCreate <= 0.009,
        orderDate,
        dueDate,
        shipmentDate,
        ...(body.salesPerson ? { salesPerson: body.salesPerson } : {}),
        ...(body.notes ? { notes: body.notes } : {}),
        ...(body.cost != null ? { lineCostAmount: new Prisma.Decimal(body.cost) } : {}),
        version: 1,
        lines: {
          create: resolvedLines.map((ln, i) => {
            const product = ln.productId ? productById.get(ln.productId) : undefined
            const snap = buildPersistedOrderLineFields(ln, {
              title: ln.title,
              productGroup: ln.productGroup,
              category: product?.category ?? ln.productGroup,
              suiteType: product?.suiteType ?? undefined,
            })
            return {
              id: lineIds[i],
              title: snap.title,
              productTitleSnapshot: snap.productTitleSnapshot,
              productGroupSnapshot: snap.productGroupSnapshot,
              unitPrice: new Prisma.Decimal(snap.unitPrice),
              lineTotal: new Prisma.Decimal(snap.lineTotal),
              qtyOrdered: new Prisma.Decimal(snap.qtyOrdered),
              ...(ln.productId ? { product: { connect: { id: ln.productId } } } : {}),
              ...(snap.supplierId
                ? { supplier: { connect: { id: snap.supplierId } } }
                : {}),
              ...(snap.supplierNameSnapshot
                ? { supplierNameSnapshot: snap.supplierNameSnapshot }
                : {}),
              ...(ln.configuration
                ? { configuration: ln.configuration as Prisma.InputJsonValue }
                : {}),
              ...(snap.configurationSummary
                ? { configurationSummary: snap.configurationSummary as Prisma.InputJsonValue }
                : {}),
              // Satış kaynağı snapshot — daima yazılır (çözülemezse UNKNOWN / maliyet 0).
              soldSalesSourceType: ln.soldSalesSourceType ?? SALES_SOURCE_TYPE.UNKNOWN,
              soldUnitCost: new Prisma.Decimal(ln.soldUnitCost ?? 0),
              ...(ln.soldWholesalePrice != null
                ? { soldWholesalePrice: new Prisma.Decimal(ln.soldWholesalePrice) }
                : {}),
              ...(ln.soldWholesaleDiscountRate != null
                ? { soldWholesaleDiscountRate: new Prisma.Decimal(ln.soldWholesaleDiscountRate) }
                : {}),
              ...(ln.soldDisplayFloor ? { soldDisplayFloor: ln.soldDisplayFloor } : {}),
              ...(ln.soldExternalSupplyType
                ? { soldExternalSupplyType: ln.soldExternalSupplyType }
                : {}),
            }
          }),
        },
        ...(hasInitialPayment
          ? {
              payments: {
                create: {
                  id: paymentId!,
                  kind: paymentKind,
                  status: initialPaymentStatus,
                  amount: new Prisma.Decimal(body.paidAmount),
                  currency: 'TRY',
                  occurredAt: now,
                  ...mailOrderSupplierFields,
                },
              },
            }
          : {}),
      },
    })

    if (hasInitialPayment && paymentId) {
      const method = isMailOrder ? PAYMENT_METHOD.MAIL_ORDER : PAYMENT_METHOD.TRANSFER
      if (autoApprove) {
        await finalizeOrderPaymentPosting(
          tx,
          {
            orderId,
            paymentId,
            amount: body.paidAmount,
            method,
            currency: 'TRY',
            customerName: body.customerName,
            ...(body.paymentNote ? { note: body.paymentNote } : {}),
            ...(body.mailOrderSupplierId ? { mailOrderSupplierId: body.mailOrderSupplierId } : {}),
            ...(body.mailOrderCustomerId ? { mailOrderCustomerId: body.mailOrderCustomerId } : {}),
          },
          options,
        )
        await tx.domainEvent.create({
          data: domainEventCreateInput(
            orderId,
            'SalesOrder',
            PAYMENT_APPROVED_EVENT,
            `corr-${orderId}-pay-approved-${paymentId}`,
            now,
            { transactionId: paymentId, amount: body.paidAmount.toFixed(2), autoApproved: true },
            options?.authUser,
          ),
        })
        if (isMailOrder) {
          await tx.domainEvent.create({
            data: domainEventCreateInput(
              orderId,
              'SalesOrder',
              'mailOrder.approved',
              `corr-${orderId}-mo-approved-${paymentId}`,
              now,
              {
                transactionId: paymentId,
                mailOrderSupplierId: body.mailOrderSupplierId,
                mailOrderCustomerId: body.mailOrderCustomerId,
              },
              options?.authUser,
            ),
          })
        }
      } else {
        const pendingPayload = mergeActorIntoPayload(
          {
            transactionId: paymentId,
            amount: body.paidAmount.toFixed(2),
            currency: 'TRY',
            method,
            status: PAYMENT_TX_STATUS.PENDING_APPROVAL,
            ...(body.paymentNote ? { note: body.paymentNote } : {}),
            ...(isMailOrder && body.mailOrderSupplierId
              ? {
                  mailOrderSupplierId: body.mailOrderSupplierId,
                  mailOrderCustomerId: body.mailOrderCustomerId,
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
            data: domainEventCreateInput(
              orderId,
              'SalesOrder',
              MAIL_ORDER_PENDING_EVENT,
              `corr-${orderId}-mo-pending-${paymentId}`,
              now,
              {
                transactionId: paymentId,
                mailOrderSupplierId: body.mailOrderSupplierId,
                mailOrderCustomerId: body.mailOrderCustomerId,
              },
              options?.authUser,
            ),
          })
          if (body.mailOrderSupplierId) {
            await createPendingMailOrderSupplierLedger(tx, {
              supplierId: body.mailOrderSupplierId,
              orderId,
              paymentId,
              amount: body.paidAmount,
              mailOrderCustomerId: body.mailOrderCustomerId ?? body.customerName,
              ...(body.paymentNote ? { paymentNote: body.paymentNote } : {}),
              ...(body.mailOrderCommissionRate != null
                ? { mailOrderCommissionRate: body.mailOrderCommissionRate }
                : {}),
            })
          }
        }
      }
    }

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        ORDER_PLACED_EVENT,
        `corr-${orderId}-placed`,
        now,
        {
          customerName: body.customerName,
          productTitle: body.productTitle,
          totalAmount: body.totalAmount,
          paidAmount: body.paidAmount,
          status: body.status,
          lineCount: body.lines.length,
          ...(body.paymentMethod ? { paymentMethod: body.paymentMethod } : {}),
          ...(body.paymentNote ? { paymentNote: body.paymentNote } : {}),
          ...(body.mailOrderCustomerId ? { mailOrderCustomerId: body.mailOrderCustomerId } : {}),
          ...(body.mailOrderSupplierId ? { mailOrderSupplierId: body.mailOrderSupplierId } : {}),
          ...(isMailOrder ? { mailOrder: true } : {}),
        },
        options?.authUser,
      ),
    })

    const row = (await tx.salesOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        lines: true,
        payments: true,
        shipments: { include: { lines: true } },
      },
    })) as SalesOrderWithRelations

    if (row.lines.length === 0) {
      throw new AppHttpError(500, 'Order created without order lines', 'Internal Server Error')
    }

    return {
      dto: projectSalesOrderListItemFromDbRow(row, todayIso),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  })
}
