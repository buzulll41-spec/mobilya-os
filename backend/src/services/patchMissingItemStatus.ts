import type { PrismaClient } from '@prisma/client'
import {
  canTransitionMissingItemStatus,
  isMissingItemStatus,
  MISSING_ITEM_STATUS,
  missingItemEventTypeForStatus,
  normalizeMissingItemStatusValue,
  type MissingItemStatus,
} from '../constants/missingItemStatuses.js'
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

export type PatchMissingItemStatusRequest = {
  status: MissingItemStatus
  supplierNote?: string
  resolutionNote?: string
}

export function assertValidPatchMissingItemStatusRequest(body: unknown): PatchMissingItemStatusRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const statusRaw = typeof o.status === 'string' ? o.status.trim().toUpperCase() : ''
  const supplierNote =
    typeof o.supplierNote === 'string' && o.supplierNote.trim() ? o.supplierNote.trim() : undefined
  const resolutionNote =
    typeof o.resolutionNote === 'string' && o.resolutionNote.trim() ? o.resolutionNote.trim() : undefined

  const details: Record<string, string> = {}
  if (!isMissingItemStatus(statusRaw)) details.status = 'Invalid status'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return {
    status: statusRaw as MissingItemStatus,
    ...(supplierNote ? { supplierNote } : {}),
    ...(resolutionNote ? { resolutionNote } : {}),
  }
}

export async function patchMissingItemStatus(
  prisma: PrismaClient,
  missingItemId: string,
  body: PatchMissingItemStatusRequest,
  options?: { authUser?: AuthUserContext },
): Promise<{ missingItem: MissingItemDto; order: SalesOrderListItemDto }> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await prisma.orderMissingItem.findUnique({ where: { id: missingItemId } })
  if (!existing) {
    throw new AppHttpError(404, 'Eksik kaydı bulunamadı', 'Not Found')
  }

  const fromNorm = normalizeMissingItemStatusValue(existing.status)
  if (!isMissingItemStatus(fromNorm)) {
    throw new AppHttpError(400, 'Kayıtta geçersiz durum', 'Bad Request', { status: existing.status })
  }
  const from = fromNorm as MissingItemStatus
  const to = body.status

  if (!canTransitionMissingItemStatus(from, to)) {
    throw new AppHttpError(400, `Geçersiz durum geçişi: ${from} → ${to}`, 'Bad Request', {
      status: 'Invalid transition',
    })
  }

  const now = new Date()
  const orderId = existing.orderId
  const eventType = missingItemEventTypeForStatus(to)
  if (!eventType || eventType === 'missing_item.created') {
    throw new AppHttpError(400, 'Durum için olay üretilemedi', 'Bad Request')
  }

  const noteMerge =
    body.resolutionNote && to === MISSING_ITEM_STATUS.RESOLVED
      ? [existing.supplierNote, body.resolutionNote].filter(Boolean).join(' · ')
      : body.supplierNote ?? existing.supplierNote

  await prisma.$transaction(async (tx) => {
    await tx.orderMissingItem.update({
      where: { id: missingItemId },
      data: {
        status: to,
        supplierNote: noteMerge ?? null,
        resolvedAt: to === MISSING_ITEM_STATUS.RESOLVED ? now : existing.resolvedAt,
      },
    })

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        eventType,
        `corr-${orderId}-missing-${missingItemId}-${to.toLowerCase()}`,
        now,
        {
          missingItemId,
          fromStatus: from,
          toStatus: to,
          title: existing.title,
          ...(body.resolutionNote ? { resolutionNote: body.resolutionNote } : {}),
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
