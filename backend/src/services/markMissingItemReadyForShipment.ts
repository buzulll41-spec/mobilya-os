import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  canTransitionMissingItemStatus,
  isMissingItemStatus,
  MISSING_ITEM_STATUS,
  missingItemEventTypeForStatus,
  normalizeMissingItemStatusValue,
  type MissingItemStatus,
} from '../constants/missingItemStatuses.js'
import { mapMissingItemRow, type MissingItemDto } from '../contracts/missingItemDto.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { syncSalesOrderDisplayStatusFromLines } from './syncSalesOrderDisplayStatus.js'

export type MarkMissingItemReadyForShipmentRequest = {
  note?: string
}

export function assertValidMarkMissingItemReadyForShipmentRequest(
  body: unknown,
): MarkMissingItemReadyForShipmentRequest {
  if (body == null || typeof body !== 'object') return {}
  const o = body as Record<string, unknown>
  const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim() : undefined
  return note ? { note } : {}
}

export async function markMissingItemReadyForShipment(
  prisma: PrismaClient,
  orderId: string,
  missingItemId: string,
  body: MarkMissingItemReadyForShipmentRequest = {},
  options?: { authUser?: AuthUserContext },
): Promise<{ missingItem: MissingItemDto; order: SalesOrderListItemDto }> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await prisma.orderMissingItem.findUnique({ where: { id: missingItemId } })
  if (!existing) {
    throw new AppHttpError(404, 'Eksik kaydı bulunamadı', 'Not Found')
  }
  if (existing.orderId !== orderId) {
    throw new AppHttpError(404, 'Eksik kaydı bu siparişe ait değil', 'Not Found')
  }

  const fromNorm = normalizeMissingItemStatusValue(existing.status)
  if (!isMissingItemStatus(fromNorm)) {
    throw new AppHttpError(400, 'Kayıtta geçersiz durum', 'Bad Request', { status: existing.status })
  }
  const from = fromNorm as MissingItemStatus
  const to = MISSING_ITEM_STATUS.READY_FOR_SHIPMENT

  if (!canTransitionMissingItemStatus(from, to)) {
    throw new AppHttpError(400, `Geçersiz durum geçişi: ${from} → ${to}`, 'Bad Request', {
      status: 'Invalid transition',
    })
  }

  const now = new Date()
  const eventType = missingItemEventTypeForStatus(to)
  if (!eventType) {
    throw new AppHttpError(400, 'Durum için olay üretilemedi', 'Bad Request')
  }

  const noteLine = body.note?.trim() || 'Parça sevke hazır olarak işaretlendi'
  const noteMerge = [existing.supplierNote, noteLine].filter(Boolean).join(' · ')

  await prisma.$transaction(async (tx) => {
    await tx.orderMissingItem.update({
      where: { id: missingItemId },
      data: {
        status: to,
        supplierNote: noteMerge ?? null,
      },
    })

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        eventType,
        `corr-${orderId}-missing-${missingItemId}-ready-for-shipment`,
        now,
        {
          missingItemId,
          fromStatus: from,
          toStatus: to,
          title: existing.title,
          note: noteLine,
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
