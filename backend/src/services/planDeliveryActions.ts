import type { PrismaClient } from '@prisma/client'
import {
  DELIVERY_FAIL_REASONS,
  SHIPMENT_PLAN_EVENT,
  SHIPMENT_PLAN_STATUS,
  type DeliveryFailReason,
} from '../constants/shipmentPlanStatuses.js'
import {
  canTransitionShipmentStatus,
  nextShipmentOperationStatus,
  SHIPMENT_OPERATION_STATUS,
} from '../constants/shipmentStatuses.js'
import { mapShipmentPlanRow, type ShipmentPlanDto } from '../contracts/shipmentPlanDto.js'
import { AppHttpError } from '../errors/apiError.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { patchShipmentStatus, type PatchShipmentStatusRequest } from './patchShipmentStatus.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'

export type ConfirmPlanDeliveryRequest = {
  deliveredBy: string
  vehicle: string
  deliveredAt: string
  deliveryNote?: string
  customerConfirmNote?: string
}

export function assertValidConfirmPlanDeliveryRequest(body: unknown): ConfirmPlanDeliveryRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const deliveredBy = typeof o.deliveredBy === 'string' ? o.deliveredBy.trim() : ''
  const vehicle = typeof o.vehicle === 'string' ? o.vehicle.trim() : ''
  const deliveredAt = typeof o.deliveredAt === 'string' ? o.deliveredAt.trim() : ''
  const details: Record<string, string> = {}
  if (!deliveredBy) details.deliveredBy = 'Required'
  if (!vehicle) details.vehicle = 'Required'
  if (!deliveredAt) details.deliveredAt = 'Required'
  if (Object.keys(details).length) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }
  const deliveryNote =
    typeof o.deliveryNote === 'string' && o.deliveryNote.trim() ? o.deliveryNote.trim() : undefined
  const customerConfirmNote =
    typeof o.customerConfirmNote === 'string' && o.customerConfirmNote.trim()
      ? o.customerConfirmNote.trim()
      : undefined
  return { deliveredBy, vehicle, deliveredAt, deliveryNote, customerConfirmNote }
}

export async function confirmPlanDelivery(
  prisma: PrismaClient,
  planId: string,
  body: ConfirmPlanDeliveryRequest,
  options?: { authUser?: AuthUserContext },
): Promise<{ plan: ShipmentPlanDto; order: SalesOrderListItemDto }> {
  const plan = await prisma.shipmentPlan.findUnique({ where: { id: planId } })
  if (!plan) throw new AppHttpError(404, 'Sevk planı bulunamadı', 'Not Found')
  if (plan.status !== SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    throw new AppHttpError(400, 'Plan teslim onayı beklemiyor', 'Bad Request')
  }

  const orderId = plan.salesOrderId
  const now = new Date()
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'

  const shipment = await prisma.shipment.findFirst({
    where: { salesOrderId: orderId },
    orderBy: { id: 'desc' },
  })

  if (shipment) {
    let currentStatus = shipment.status
    const target = SHIPMENT_OPERATION_STATUS.DELIVERED
    while (currentStatus !== target) {
      const nextStatus = canTransitionShipmentStatus(currentStatus, target)
        ? target
        : nextShipmentOperationStatus(currentStatus)
      if (!nextStatus) {
        throw new AppHttpError(400, 'Sevk durumu teslim için uygun değil', 'Bad Request')
      }
      const patchBody: PatchShipmentStatusRequest =
        nextStatus === SHIPMENT_OPERATION_STATUS.DELIVERED
          ? {
              status: SHIPMENT_OPERATION_STATUS.DELIVERED,
              deliveredBy: body.deliveredBy,
              vehicle: body.vehicle,
              deliveredAt: body.deliveredAt,
              ...(body.deliveryNote ? { deliveryNote: body.deliveryNote } : {}),
              ...(body.customerConfirmNote ? { customerConfirmNote: body.customerConfirmNote } : {}),
            }
          : { status: nextStatus }
      await patchShipmentStatus(prisma, shipment.id, patchBody, options)
      currentStatus = nextStatus
    }
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.salesOrder.update({
        where: { id: orderId },
        data: { displayStatus: 'Teslim Edildi', version: { increment: 1 } },
      })
    })
  }

  const updatedPlan = await prisma.$transaction(async (tx) => {
    const saved = await tx.shipmentPlan.update({
      where: { id: planId },
      data: { status: SHIPMENT_PLAN_STATUS.DELIVERED, updatedAt: now },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SHIPMENT_PLAN_EVENT.CONFIRMED,
        `corr-${orderId}-delivery-confirmed-${planId}`,
        now,
        {
          planId,
          deliveredBy: body.deliveredBy,
          vehicle: body.vehicle,
          deliveredAt: body.deliveredAt,
          crewPrimary: plan.crewPrimary,
          crewSecondary: plan.crewSecondary,
        },
        options?.authUser,
      ),
    })
    return saved
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return {
    plan: mapShipmentPlanRow(updatedPlan),
    order: projectSalesOrderListItemFromDbRow(row, todayIso),
  }
}

export type FailPlanDeliveryRequest = { reason: DeliveryFailReason; note?: string }

export function assertValidFailPlanDeliveryRequest(body: unknown): FailPlanDeliveryRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const reason = typeof o.reason === 'string' ? o.reason.trim().toUpperCase() : ''
  if (!DELIVERY_FAIL_REASONS.includes(reason as DeliveryFailReason)) {
    throw new AppHttpError(400, 'Geçersiz teslim edilemedi sebebi', 'Bad Request', { reason: 'Invalid' })
  }
  const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim() : undefined
  return { reason: reason as DeliveryFailReason, note }
}

export async function failPlanDelivery(
  prisma: PrismaClient,
  planId: string,
  body: FailPlanDeliveryRequest,
  options?: { authUser?: AuthUserContext },
): Promise<{ plan: ShipmentPlanDto; order: SalesOrderListItemDto }> {
  const plan = await prisma.shipmentPlan.findUnique({ where: { id: planId } })
  if (!plan) throw new AppHttpError(404, 'Sevk planı bulunamadı', 'Not Found')
  if (plan.status !== SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    throw new AppHttpError(400, 'Plan teslim onayı beklemiyor', 'Bad Request')
  }

  const orderId = plan.salesOrderId
  const now = new Date()
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'

  const updatedPlan = await prisma.$transaction(async (tx) => {
    const saved = await tx.shipmentPlan.update({
      where: { id: planId },
      data: { status: SHIPMENT_PLAN_STATUS.DELIVERY_FAILED, updatedAt: now },
    })
    await tx.salesOrder.update({
      where: { id: orderId },
      data: { displayStatus: 'Sevke Hazır', version: { increment: 1 } },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SHIPMENT_PLAN_EVENT.FAILED,
        `corr-${orderId}-delivery-failed-${planId}`,
        now,
        { planId, reason: body.reason, ...(body.note ? { note: body.note } : {}) },
        options?.authUser,
      ),
    })
    return saved
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return {
    plan: mapShipmentPlanRow(updatedPlan),
    order: projectSalesOrderListItemFromDbRow(row, todayIso),
  }
}

export type PostponePlanDeliveryRequest = { newDate: string; note?: string }

export function assertValidPostponePlanDeliveryRequest(body: unknown): PostponePlanDeliveryRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const newDate = typeof o.newDate === 'string' ? o.newDate.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    throw new AppHttpError(400, 'newDate YYYY-MM-DD olmalı', 'Bad Request')
  }
  const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim() : undefined
  return { newDate, note }
}

export async function postponePlanDelivery(
  prisma: PrismaClient,
  planId: string,
  body: PostponePlanDeliveryRequest,
  options?: { authUser?: AuthUserContext },
): Promise<{ plan: ShipmentPlanDto; order: SalesOrderListItemDto }> {
  const plan = await prisma.shipmentPlan.findUnique({ where: { id: planId } })
  if (!plan) throw new AppHttpError(404, 'Sevk planı bulunamadı', 'Not Found')
  if (plan.status !== SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    throw new AppHttpError(400, 'Plan teslim onayı beklemiyor', 'Bad Request')
  }

  const orderId = plan.salesOrderId
  const now = new Date()
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const previousDate = plan.plannedDate.toISOString().slice(0, 10)
  const newPlannedDate = new Date(`${body.newDate}T00:00:00.000Z`)

  const updatedPlan = await prisma.$transaction(async (tx) => {
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SHIPMENT_PLAN_EVENT.POSTPONED,
        `corr-${orderId}-delivery-postponed-${planId}-${body.newDate}`,
        now,
        {
          planId,
          previousDate,
          newDate: body.newDate,
          previousStatus: plan.status,
          ...(body.note ? { note: body.note } : {}),
        },
        options?.authUser,
      ),
    })
    const saved = await tx.shipmentPlan.update({
      where: { id: planId },
      data: {
        plannedDate: newPlannedDate,
        status: SHIPMENT_PLAN_STATUS.PLANNED,
        updatedAt: now,
      },
    })
    await tx.salesOrder.update({
      where: { id: orderId },
      data: { displayStatus: 'Planlandı', version: { increment: 1 } },
    })
    return saved
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return {
    plan: mapShipmentPlanRow(updatedPlan),
    order: projectSalesOrderListItemFromDbRow(row, todayIso),
  }
}

export async function revertPlanDelivery(
  prisma: PrismaClient,
  planId: string,
  options?: { authUser?: AuthUserContext },
): Promise<{ plan: ShipmentPlanDto; order: SalesOrderListItemDto }> {
  const plan = await prisma.shipmentPlan.findUnique({ where: { id: planId } })
  if (!plan) throw new AppHttpError(404, 'Sevk planı bulunamadı', 'Not Found')
  if (plan.status !== SHIPMENT_PLAN_STATUS.DELIVERED) {
    throw new AppHttpError(400, 'Sadece teslim edilmiş plan geri alınabilir', 'Bad Request')
  }

  const role = options?.authUser?.role
  if (role !== 'ADMIN' && role !== 'MANAGER') {
    throw new AppHttpError(403, 'Teslim geri alma yetkisi yok', 'Forbidden')
  }

  const orderId = plan.salesOrderId
  const now = new Date()
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'

  const updatedPlan = await prisma.$transaction(async (tx) => {
    const saved = await tx.shipmentPlan.update({
      where: { id: planId },
      data: { status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM, updatedAt: now },
    })
    await tx.salesOrder.update({
      where: { id: orderId },
      data: { displayStatus: 'Sevke Hazır', version: { increment: 1 } },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SHIPMENT_PLAN_EVENT.REVERTED,
        `corr-${orderId}-delivery-reverted-${planId}`,
        now,
        { planId },
        options?.authUser,
      ),
    })
    return saved
  })

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return {
    plan: mapShipmentPlanRow(updatedPlan),
    order: projectSalesOrderListItemFromDbRow(row, todayIso),
  }
}
