import type { PrismaClient } from '@prisma/client'
import {
  canTransitionShipmentStatus,
  isShipmentOperationStatus,
  SHIPMENT_OPERATION_STATUS,
  shipmentEventTypeForStatus,
  normalizeShipmentStatusValue,
  type ShipmentOperationStatus,
} from '../constants/shipmentStatuses.js'
import { mapShipmentRow, type ShipmentDto } from '../contracts/shipmentDto.js'
import { AppHttpError } from '../errors/apiError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'
import {
  ORDER_SHIPMENT_DISPLAY,
  syncOrderShipmentDisplayStatus,
} from '../lib/orderShipmentDisplayStatus.js'

export type PatchShipmentStatusRequest = {
  status: ShipmentOperationStatus
  issueNote?: string
  deliveredBy?: string
  vehicle?: string
  deliveredAt?: string
  deliveryNote?: string
  customerConfirmNote?: string
}

export function assertValidPatchShipmentStatusRequest(body: unknown): PatchShipmentStatusRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const statusRaw = typeof o.status === 'string' ? o.status.trim().toUpperCase() : ''
  const issueNote =
    typeof o.issueNote === 'string' && o.issueNote.trim() ? o.issueNote.trim() : undefined
  const deliveredBy =
    typeof o.deliveredBy === 'string' && o.deliveredBy.trim() ? o.deliveredBy.trim() : undefined
  const vehicle = typeof o.vehicle === 'string' && o.vehicle.trim() ? o.vehicle.trim() : undefined
  const deliveredAt =
    typeof o.deliveredAt === 'string' && o.deliveredAt.trim() ? o.deliveredAt.trim() : undefined
  const deliveryNote =
    typeof o.deliveryNote === 'string' && o.deliveryNote.trim() ? o.deliveryNote.trim() : undefined
  const customerConfirmNote =
    typeof o.customerConfirmNote === 'string' && o.customerConfirmNote.trim()
      ? o.customerConfirmNote.trim()
      : undefined

  const details: Record<string, string> = {}
  if (!isShipmentOperationStatus(statusRaw)) details.status = 'Invalid status'
  if (statusRaw === SHIPMENT_OPERATION_STATUS.ISSUE && !issueNote) {
    details.issueNote = 'Required for ISSUE'
  }
  if (statusRaw === SHIPMENT_OPERATION_STATUS.DELIVERED) {
    if (!deliveredBy) details.deliveredBy = 'Required for DELIVERED'
    if (!vehicle) details.vehicle = 'Required for DELIVERED'
    if (!deliveredAt) details.deliveredAt = 'Required for DELIVERED'
  }

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return {
    status: statusRaw as ShipmentOperationStatus,
    ...(issueNote ? { issueNote } : {}),
    ...(deliveredBy ? { deliveredBy } : {}),
    ...(vehicle ? { vehicle } : {}),
    ...(deliveredAt ? { deliveredAt } : {}),
    ...(deliveryNote ? { deliveryNote } : {}),
    ...(customerConfirmNote ? { customerConfirmNote } : {}),
  }
}

export async function patchShipmentStatus(
  prisma: PrismaClient,
  shipmentId: string,
  body: PatchShipmentStatusRequest,
  options?: { authUser?: AuthUserContext },
): Promise<{ shipment: ShipmentDto; order: SalesOrderListItemDto }> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    include: { lines: true },
  })
  if (!existing) {
    throw new AppHttpError(404, 'Sevk kaydı bulunamadı', 'Not Found')
  }

  const from = existing.status
  const to = body.status
  if (!canTransitionShipmentStatus(from, to)) {
    throw new AppHttpError(400, `Geçersiz durum geçişi: ${from} → ${to}`, 'Bad Request', {
      status: 'Invalid transition',
    })
  }

  const orderId = existing.salesOrderId
  const now = new Date()
  const eventType = shipmentEventTypeForStatus(to)

  const deliveryMeta =
    to === SHIPMENT_OPERATION_STATUS.DELIVERED
      ? {
          deliveredBy: body.deliveredBy,
          vehicle: body.vehicle,
          deliveredAt: body.deliveredAt,
          ...(body.deliveryNote ? { deliveryNote: body.deliveryNote } : {}),
          ...(body.customerConfirmNote ? { customerConfirmNote: body.customerConfirmNote } : {}),
        }
      : {}

  await prisma.$transaction(async (tx) => {
    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        status: to,
        ...(body.issueNote && to === SHIPMENT_OPERATION_STATUS.ISSUE
          ? { note: [existing.note, body.issueNote].filter(Boolean).join(' · ') }
          : {}),
        ...(to === SHIPMENT_OPERATION_STATUS.DELIVERED && body.vehicle
          ? { vehicleNote: body.vehicle }
          : {}),
      },
    })

    if (eventType) {
      await tx.domainEvent.create({
        data: domainEventCreateInput(
          orderId,
          'SalesOrder',
          eventType,
          `corr-${orderId}-shipment-${shipmentId}-${to.toLowerCase()}`,
          now,
          {
            shipmentId,
            fromStatus: normalizeShipmentStatusValue(from),
            toStatus: to,
            ...(body.issueNote ? { issueNote: body.issueNote } : {}),
            ...deliveryMeta,
          },
          options?.authUser,
        ),
      })
    }

    if (to === SHIPMENT_OPERATION_STATUS.DISPATCHED) {
      await syncOrderShipmentDisplayStatus(tx, orderId, ORDER_SHIPMENT_DISPLAY.DISPATCHED)
    }

    if (to === SHIPMENT_OPERATION_STATUS.DELIVERED) {
      const orderBefore = await tx.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
      const fromDisplay = orderBefore.displayStatus
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { displayStatus: 'Teslim Edildi', version: { increment: 1 } },
      })
      await tx.domainEvent.create({
        data: domainEventCreateInput(
          orderId,
          'SalesOrder',
          'order.lifecycle_changed',
          `corr-${orderId}-delivered-${Date.now()}`,
          now,
          {
            from: fromDisplay,
            to: 'Teslim Edildi',
            via: 'shipment.delivered',
            shipmentId,
            ...deliveryMeta,
          },
          options?.authUser,
        ),
      })
    }
  })

  const shipment = mapShipmentRow(
    await prisma.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
      include: { lines: true },
    }),
  )
  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  const order = projectSalesOrderListItemFromDbRow(row, todayIso)

  return { shipment, order }
}
