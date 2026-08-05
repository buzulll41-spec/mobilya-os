import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'

const TERMIN_CHANGED_EVENT = 'order_line.committed_ship_by_changed'

export type PatchOrderTerminRequest = {
  committedShipBy: string
  reason: string
}

function parseIsoDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function optionalIsoDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toISOString().slice(0, 10)
}

export function assertValidPatchOrderTerminRequest(body: unknown): PatchOrderTerminRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const committedShipBy = typeof o.committedShipBy === 'string' ? o.committedShipBy.trim() : ''
  const reason = typeof o.reason === 'string' ? o.reason.trim() : ''

  const details: Record<string, string> = {}
  if (!parseIsoDateOnly(committedShipBy)) details.committedShipBy = 'Must be YYYY-MM-DD'
  if (!reason) details.reason = 'Required'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return { committedShipBy, reason }
}

export async function patchOrderTermin(
  prisma: PrismaClient,
  orderId: string,
  body: PatchOrderTerminRequest,
  options?: { authUser?: AuthUserContext },
): Promise<SalesOrderListItemDto> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await loadSalesOrderWithRelations(prisma, orderId)
  const newDate = parseIsoDateOnly(body.committedShipBy)
  if (!newDate) {
    throw new AppHttpError(400, 'Geçersiz termin tarihi', 'Bad Request')
  }

  const oldDate = optionalIsoDate(existing.dueDate)
  const newDateIso = body.committedShipBy
  const firstLine = existing.lines[0]
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        dueDate: newDate,
        version: { increment: 1 },
      },
    })

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        TERMIN_CHANGED_EVENT,
        `corr-${orderId}-termin-${Date.now()}`,
        now,
        {
          orderLineId: firstLine?.id ?? null,
          oldDate,
          newDate: newDateIso,
          reason: body.reason,
        },
        options?.authUser,
      ),
    })
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return projectSalesOrderListItemFromDbRow(row, todayIso)
}
