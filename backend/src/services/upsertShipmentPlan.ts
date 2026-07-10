import type { PrismaClient } from '@prisma/client'
import { SHIPMENT_PLAN_EVENT, SHIPMENT_PLAN_STATUS } from '../constants/shipmentPlanStatuses.js'
import {
  mapShipmentPlanRow,
  normalizePlanTimeInput,
  optionalString,
  parseIsoDateInput,
  type ShipmentPlanDto,
} from '../contracts/shipmentPlanDto.js'
import { AppHttpError } from '../errors/apiError.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import {
  ORDER_SHIPMENT_DISPLAY,
  syncOrderShipmentDisplayStatus,
} from '../lib/orderShipmentDisplayStatus.js'

export type UpsertShipmentPlanRequest = {
  salesOrderId: string
  plannedDate: string
  plannedTime?: string
  region?: string
  vehicleName?: string
  crewPrimary?: string
  crewSecondary?: string
  note?: string
  status?: string
  groupId?: string | null
}

export function assertValidUpsertShipmentPlanRequest(body: unknown): UpsertShipmentPlanRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const salesOrderId = typeof o.salesOrderId === 'string' ? o.salesOrderId.trim() : ''
  const plannedDate = typeof o.plannedDate === 'string' ? o.plannedDate.trim() : ''
  const details: Record<string, string> = {}
  if (!salesOrderId) details.salesOrderId = 'Required'
  if (!plannedDate) details.plannedDate = 'Required'
  if (Object.keys(details).length) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  parseIsoDateInput(plannedDate)

  return {
    salesOrderId,
    plannedDate,
    plannedTime: optionalString(o.plannedTime),
    region: optionalString(o.region),
    vehicleName: optionalString(o.vehicleName),
    crewPrimary: optionalString(o.crewPrimary),
    crewSecondary: optionalString(o.crewSecondary),
    note: optionalString(o.note),
    status:
      typeof o.status === 'string' && o.status.trim()
        ? o.status.trim()
        : SHIPMENT_PLAN_STATUS.PLANNED,
    groupId: o.groupId === null ? null : optionalString(o.groupId),
  }
}

export async function upsertShipmentPlan(
  prisma: PrismaClient,
  body: UpsertShipmentPlanRequest,
  options?: { authUser?: AuthUserContext; existingId?: string },
): Promise<ShipmentPlanDto> {
  const order = await prisma.salesOrder.findUnique({ where: { id: body.salesOrderId } })
  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found', { salesOrderId: body.salesOrderId })
  }

  const plannedDate = parseIsoDateInput(body.plannedDate)
  const plannedTime = normalizePlanTimeInput(body.plannedTime ?? null)
  const now = new Date()

  const existing = options?.existingId
    ? await prisma.shipmentPlan.findUnique({ where: { id: options.existingId } })
    : await prisma.shipmentPlan.findUnique({ where: { salesOrderId: body.salesOrderId } })

  const data = {
    salesOrderId: body.salesOrderId,
    plannedDate,
    plannedTime,
    region: body.region ?? null,
    vehicleName: body.vehicleName ?? null,
    crewPrimary: body.crewPrimary ?? null,
    crewSecondary: body.crewSecondary ?? null,
    note: body.note ?? null,
    status: body.status ?? SHIPMENT_PLAN_STATUS.PLANNED,
    groupId: body.groupId ?? null,
    updatedAt: now,
  }

  const row = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.shipmentPlan.update({ where: { id: existing.id }, data })
      : await tx.shipmentPlan.create({ data })

    const eventType = existing ? SHIPMENT_PLAN_EVENT.UPDATED : SHIPMENT_PLAN_EVENT.CREATED
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        body.salesOrderId,
        'SalesOrder',
        eventType,
        `corr-${body.salesOrderId}-plan-${saved.id}-${eventType}`,
        now,
        {
          planId: saved.id,
          region: saved.region,
          vehicle: saved.vehicleName,
          crewPrimary: saved.crewPrimary,
          crewSecondary: saved.crewSecondary,
          plannedDate: body.plannedDate,
          plannedTime: saved.plannedTime,
          orderIds: [body.salesOrderId],
        },
        options?.authUser,
      ),
    })

    const order = await tx.salesOrder.findUnique({
      where: { id: body.salesOrderId },
      select: { displayStatus: true },
    })
    if (order?.displayStatus !== ORDER_SHIPMENT_DISPLAY.DELIVERED) {
      await syncOrderShipmentDisplayStatus(tx, body.salesOrderId, ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED)
    }

    return saved
  })

  return mapShipmentPlanRow(row)
}

export function assertValidPatchShipmentPlanRequest(body: unknown): Partial<UpsertShipmentPlanRequest> {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const out: Partial<UpsertShipmentPlanRequest> = {}
  if (typeof o.plannedDate === 'string') {
    parseIsoDateInput(o.plannedDate.trim())
    out.plannedDate = o.plannedDate.trim()
  }
  if (o.plannedTime !== undefined) out.plannedTime = optionalString(o.plannedTime)
  if (o.region !== undefined) out.region = optionalString(o.region)
  if (o.vehicleName !== undefined) out.vehicleName = optionalString(o.vehicleName)
  if (o.crewPrimary !== undefined) out.crewPrimary = optionalString(o.crewPrimary)
  if (o.crewSecondary !== undefined) out.crewSecondary = optionalString(o.crewSecondary)
  if (o.note !== undefined) out.note = optionalString(o.note)
  if (o.status !== undefined && typeof o.status === 'string') out.status = o.status.trim()
  if (o.groupId === null) out.groupId = null
  else if (o.groupId !== undefined) out.groupId = optionalString(o.groupId)
  return out
}

export async function patchShipmentPlan(
  prisma: PrismaClient,
  planId: string,
  patch: Partial<UpsertShipmentPlanRequest>,
  options?: { authUser?: AuthUserContext },
): Promise<ShipmentPlanDto> {
  const existing = await prisma.shipmentPlan.findUnique({ where: { id: planId } })
  if (!existing) {
    throw new AppHttpError(404, 'Sevk planı bulunamadı', 'Not Found')
  }

  return upsertShipmentPlan(
    prisma,
    {
      salesOrderId: existing.salesOrderId,
      plannedDate: patch.plannedDate ?? existing.plannedDate.toISOString().slice(0, 10),
      plannedTime: patch.plannedTime ?? existing.plannedTime ?? undefined,
      region: patch.region ?? existing.region ?? undefined,
      vehicleName: patch.vehicleName ?? existing.vehicleName ?? undefined,
      crewPrimary: patch.crewPrimary ?? existing.crewPrimary ?? undefined,
      crewSecondary: patch.crewSecondary ?? existing.crewSecondary ?? undefined,
      note: patch.note ?? existing.note ?? undefined,
      status: patch.status ?? existing.status,
      groupId: patch.groupId !== undefined ? patch.groupId : existing.groupId,
    },
    { authUser: options?.authUser, existingId: existing.id },
  )
}

export async function deleteShipmentPlan(
  prisma: PrismaClient,
  planId: string,
): Promise<{ ok: true }> {
  const existing = await prisma.shipmentPlan.findUnique({ where: { id: planId } })
  if (!existing) {
    throw new AppHttpError(404, 'Sevk planı bulunamadı', 'Not Found')
  }
  await prisma.shipmentPlan.delete({ where: { id: planId } })
  return { ok: true }
}
