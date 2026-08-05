import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { SHIPMENT_PLAN_EVENT, SHIPMENT_PLAN_STATUS } from '../constants/shipmentPlanStatuses.js'
import {
  mapShipmentGroupRow,
  normalizePlanTimeInput,
  optionalString,
  parseIsoDateInput,
  type ShipmentGroupDto,
} from '../contracts/shipmentPlanDto.js'
import { AppHttpError } from '../errors/apiError.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'

export type CreateShipmentGroupOrderInput = {
  salesOrderId: string
  plannedTime?: string
}

export type CreateShipmentGroupRequest = {
  region: string
  plannedDate: string
  vehicleName?: string
  crewPrimary?: string
  crewSecondary?: string
  estimatedSaving: number
  orders: CreateShipmentGroupOrderInput[]
}

export function assertValidCreateShipmentGroupRequest(body: unknown): CreateShipmentGroupRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const region = typeof o.region === 'string' ? o.region.trim() : ''
  const plannedDate = typeof o.plannedDate === 'string' ? o.plannedDate.trim() : ''
  const estimatedSaving =
    typeof o.estimatedSaving === 'number' ? o.estimatedSaving : Number(o.estimatedSaving)

  const details: Record<string, string> = {}
  if (!region) details.region = 'Required'
  if (!plannedDate) details.plannedDate = 'Required'
  if (!Number.isFinite(estimatedSaving)) details.estimatedSaving = 'Invalid'
  if (!Array.isArray(o.orders) || o.orders.length < 2) details.orders = 'At least 2 orders required'
  if (Object.keys(details).length) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  parseIsoDateInput(plannedDate)

  /** @type {CreateShipmentGroupOrderInput[]} */
  const orders = []
  for (const item of o.orders as unknown[]) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const salesOrderId = typeof row.salesOrderId === 'string' ? row.salesOrderId.trim() : ''
    if (!salesOrderId) {
      throw new AppHttpError(400, 'salesOrderId zorunlu', 'Bad Request')
    }
    orders.push({
      salesOrderId,
      plannedTime: optionalString(row.plannedTime),
    })
  }

  if (orders.length < 2) {
    throw new AppHttpError(400, 'En az 2 sipariş gerekli', 'Bad Request')
  }

  return {
    region,
    plannedDate,
    vehicleName: optionalString(o.vehicleName),
    crewPrimary: optionalString(o.crewPrimary),
    crewSecondary: optionalString(o.crewSecondary),
    estimatedSaving,
    orders,
  }
}

async function nextGroupNo(prisma: PrismaClient): Promise<string> {
  const count = await prisma.shipmentGroup.count()
  return `SG-${String(count + 1).padStart(4, '0')}`
}

export async function createShipmentGroup(
  prisma: PrismaClient,
  body: CreateShipmentGroupRequest,
  options?: { authUser?: AuthUserContext },
): Promise<ShipmentGroupDto> {
  const plannedDate = parseIsoDateInput(body.plannedDate)
  const orderIds = body.orders.map((o) => o.salesOrderId)
  const salesOrders = await prisma.salesOrder.findMany({ where: { id: { in: orderIds } } })
  if (salesOrders.length !== orderIds.length) {
    throw new AppHttpError(404, 'Bazı siparişler bulunamadı', 'Not Found')
  }

  const totalAmount = salesOrders.reduce((sum, o) => sum + o.totalAmount.toNumber(), 0)
  const now = new Date()
  const groupNo = await nextGroupNo(prisma)

  const saved = await prisma.$transaction(async (tx) => {
    const group = await tx.shipmentGroup.create({
      data: {
        groupNo,
        region: body.region,
        plannedDate,
        vehicleName: body.vehicleName ?? null,
        crewPrimary: body.crewPrimary ?? null,
        crewSecondary: body.crewSecondary ?? null,
        estimatedSaving: new Prisma.Decimal(body.estimatedSaving),
        totalOrders: body.orders.length,
        totalAmount: new Prisma.Decimal(totalAmount),
      },
    })

    for (const orderInput of body.orders) {
      const plannedTime = normalizePlanTimeInput(orderInput.plannedTime ?? null)
      await tx.shipmentPlan.upsert({
        where: { salesOrderId: orderInput.salesOrderId },
        create: {
          salesOrderId: orderInput.salesOrderId,
          plannedDate,
          plannedTime,
          region: body.region,
          vehicleName: body.vehicleName ?? null,
          crewPrimary: body.crewPrimary ?? null,
          crewSecondary: body.crewSecondary ?? null,
          note: `${body.region} sevk grubu`,
          status: SHIPMENT_PLAN_STATUS.APPLIED,
          groupId: group.id,
        },
        update: {
          plannedDate,
          plannedTime,
          region: body.region,
          vehicleName: body.vehicleName ?? null,
          crewPrimary: body.crewPrimary ?? null,
          crewSecondary: body.crewSecondary ?? null,
          note: `${body.region} sevk grubu`,
          status: SHIPMENT_PLAN_STATUS.APPLIED,
          groupId: group.id,
          updatedAt: now,
        },
      })
    }

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        group.id,
        'ShipmentGroup',
        SHIPMENT_PLAN_EVENT.GROUP_CREATED,
        `corr-group-${group.id}-created`,
        now,
        {
          groupId: group.id,
          groupNo: group.groupNo,
          region: body.region,
          vehicle: body.vehicleName,
          crewPrimary: body.crewPrimary,
          crewSecondary: body.crewSecondary,
          orderIds,
          estimatedSaving: body.estimatedSaving,
          plannedDate: body.plannedDate,
        },
        options?.authUser,
      ),
    })

    for (const orderId of orderIds) {
      await tx.domainEvent.create({
        data: domainEventCreateInput(
          orderId,
          'SalesOrder',
          SHIPMENT_PLAN_EVENT.GROUP_APPLIED,
          `corr-${orderId}-group-${group.id}-applied`,
          now,
          {
            groupId: group.id,
            groupNo: group.groupNo,
            region: body.region,
            vehicle: body.vehicleName,
            crewPrimary: body.crewPrimary,
            crewSecondary: body.crewSecondary,
            orderIds,
            estimatedSaving: body.estimatedSaving,
          },
          options?.authUser,
        ),
      })
    }

    return tx.shipmentGroup.findUniqueOrThrow({
      where: { id: group.id },
      include: { plans: { select: { salesOrderId: true } } },
    })
  })

  return mapShipmentGroupRow(saved)
}
