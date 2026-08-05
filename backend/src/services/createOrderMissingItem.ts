import { Prisma, type PrismaClient } from '@prisma/client'
import { MISSING_ITEM_STATUS, missingItemEventTypeForStatus } from '../constants/missingItemStatuses.js'
import { mapMissingItemRow, type MissingItemDto } from '../contracts/missingItemDto.js'
import { AppHttpError } from '../errors/apiError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { syncSalesOrderDisplayStatusFromLines } from './syncSalesOrderDisplayStatus.js'

export type CreateOrderMissingItemRequest = {
  title: string
  quantity: number
  reason: string
  lineId?: string
  supplierNote?: string
}

export function assertValidCreateOrderMissingItemRequest(body: unknown): CreateOrderMissingItemRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  const reason = typeof o.reason === 'string' ? o.reason.trim() : ''
  const quantity = typeof o.quantity === 'number' ? o.quantity : Number.NaN
  const lineId = typeof o.lineId === 'string' && o.lineId.trim() ? o.lineId.trim() : undefined
  const supplierNote =
    typeof o.supplierNote === 'string' && o.supplierNote.trim() ? o.supplierNote.trim() : undefined

  const details: Record<string, string> = {}
  if (!title || title.length > 200) details.title = 'Required, max 200'
  if (!reason || reason.length > 500) details.reason = 'Required, max 500'
  if (!Number.isFinite(quantity) || quantity <= 0) details.quantity = 'Must be > 0'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return { title, reason, quantity, ...(lineId ? { lineId } : {}), ...(supplierNote ? { supplierNote } : {}) }
}

export async function createOrderMissingItem(
  prisma: PrismaClient,
  orderId: string,
  body: CreateOrderMissingItemRequest,
  options?: { authUser?: AuthUserContext },
): Promise<{ missingItem: MissingItemDto; order: SalesOrderListItemDto }> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await loadSalesOrderWithRelations(prisma, orderId)

  if (body.lineId) {
    const line = existing.lines.find((l) => l.id === body.lineId)
    if (!line || line.salesOrderId !== orderId) {
      throw new AppHttpError(400, 'Geçersiz sipariş satırı', 'Bad Request', { lineId: 'Not found on order' })
    }
  }

  const now = new Date()
  const missingItemId = `OMI-${orderId}-${Date.now()}`

  await prisma.$transaction(async (tx) => {
    await tx.orderMissingItem.create({
      data: {
        id: missingItemId,
        orderId,
        lineId: body.lineId ?? null,
        title: body.title,
        quantity: new Prisma.Decimal(body.quantity),
        reason: body.reason,
        status: MISSING_ITEM_STATUS.OPEN,
        supplierNote: body.supplierNote ?? null,
      },
    })

    const eventType = missingItemEventTypeForStatus(MISSING_ITEM_STATUS.OPEN)
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        eventType!,
        `corr-${orderId}-missing-${missingItemId}-created`,
        now,
        {
          missingItemId,
          title: body.title,
          quantity: body.quantity.toFixed(2),
          reason: body.reason,
          lineId: body.lineId ?? null,
          status: MISSING_ITEM_STATUS.OPEN,
        },
        options?.authUser,
      ),
    })

    await syncSalesOrderDisplayStatusFromLines(tx, orderId)
  })

  const missingItem = mapMissingItemRow(
    await prisma.orderMissingItem.findUniqueOrThrow({ where: { id: missingItemId } }),
  )
  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  const order = projectSalesOrderListItemFromDbRow(row, todayIso)

  return { missingItem, order }
}
