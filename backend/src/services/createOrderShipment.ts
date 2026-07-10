import { Prisma, type PrismaClient } from '@prisma/client'
import {
  SHIPMENT_OPERATION_STATUS,
  shipmentEventTypeForStatus,
} from '../constants/shipmentStatuses.js'
import { mapShipmentRow, type ShipmentDto } from '../contracts/shipmentDto.js'
import { AppHttpError } from '../errors/apiError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { isMissingItemResolvedStatus } from '../constants/missingItemStatuses.js'
import {
  computeShipmentPlanLines,
  orderHasRemainingAfterPlan,
  validateSelectedShipmentLines,
  type SelectedShipmentLine,
} from './computeLineAvailability.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import {
  assertPolicyAllowsProceed,
  evaluateShipmentCreatePolicies,
} from '../policy/evaluateOrderPolicies.js'
import { policyOverrideEventCreateData } from '../lib/policyOverrideEvent.js'

export type CreateOrderShipmentLineInput = {
  orderLineId: string
  qty: number
}

export type CreateOrderShipmentRequest = {
  plannedDate: string
  crewName?: string
  vehicleNote?: string
  note?: string
  lines?: CreateOrderShipmentLineInput[]
  allowReceivingRisk?: boolean
  policyOverrides?: string[]
}

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppHttpError(400, 'plannedDate YYYY-MM-DD olmalı', 'Bad Request', {
      plannedDate: 'Invalid format',
    })
  }
  return new Date(`${value}T00:00:00.000Z`)
}

function parseSelectedLines(raw: unknown): CreateOrderShipmentLineInput[] | undefined {
  if (raw === undefined || raw === null) return undefined
  if (!Array.isArray(raw)) {
    throw new AppHttpError(400, 'lines bir dizi olmalı', 'Bad Request', { lines: 'Invalid' })
  }
  /** @type {CreateOrderShipmentLineInput[]} */
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const orderLineId = typeof o.orderLineId === 'string' ? o.orderLineId.trim() : ''
    const qty = typeof o.qty === 'number' ? o.qty : Number.NaN
    if (!orderLineId) {
      throw new AppHttpError(400, 'orderLineId zorunlu', 'Bad Request', { lines: 'orderLineId required' })
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppHttpError(400, 'qty > 0 olmalı', 'Bad Request', { lines: 'qty invalid' })
    }
    out.push({ orderLineId, qty })
  }
  return out
}

export function assertValidCreateOrderShipmentRequest(body: unknown): CreateOrderShipmentRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const plannedDate = typeof o.plannedDate === 'string' ? o.plannedDate.trim() : ''
  const crewName = typeof o.crewName === 'string' && o.crewName.trim() ? o.crewName.trim() : undefined
  const vehicleNote =
    typeof o.vehicleNote === 'string' && o.vehicleNote.trim() ? o.vehicleNote.trim() : undefined
  const note = typeof o.note === 'string' && o.note.trim() ? o.note.trim() : undefined
  const lines = parseSelectedLines(o.lines)
  const allowReceivingRisk = o.allowReceivingRisk === true
  const policyOverrides = Array.isArray(o.policyOverrides)
    ? o.policyOverrides.filter((x): x is string => typeof x === 'string')
    : undefined

  const details: Record<string, string> = {}
  if (!plannedDate) details.plannedDate = 'Required'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  parseIsoDate(plannedDate)

  return {
    plannedDate,
    ...(crewName ? { crewName } : {}),
    ...(vehicleNote ? { vehicleNote } : {}),
    ...(note ? { note } : {}),
    ...(lines !== undefined ? { lines } : {}),
    ...(allowReceivingRisk ? { allowReceivingRisk: true } : {}),
    ...(policyOverrides?.length ? { policyOverrides } : {}),
  }
}

function resolveLinesToCreate(
  planLines: ReturnType<typeof computeShipmentPlanLines>,
  body: CreateOrderShipmentRequest,
): SelectedShipmentLine[] {
  if (body.lines !== undefined) {
    if (body.lines.length === 0) {
      throw new Error('En az bir ürün seçilmeli')
    }
    validateSelectedShipmentLines(planLines, body.lines, {
      allowReceivingRisk: body.allowReceivingRisk,
    })
    return body.lines
  }

  const auto: SelectedShipmentLine[] = []
  for (const p of planLines) {
    const rem = Number.parseFloat(p.qtyRemaining)
    if (rem > 0.0001) {
      auto.push({ orderLineId: p.orderLineId, qty: rem })
    }
  }
  if (!auto.length) {
    throw new AppHttpError(400, 'Planlanacak ürün kalmadı', 'Bad Request')
  }
  return auto
}

export async function createOrderShipment(
  prisma: PrismaClient,
  orderId: string,
  body: CreateOrderShipmentRequest,
  options?: { authUser?: import('../lib/authUser.js').AuthUserContext },
): Promise<{ shipment: ShipmentDto; order: SalesOrderListItemDto }> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await loadSalesOrderWithRelations(prisma, orderId)
  if (existing.lines.length === 0) {
    throw new AppHttpError(400, 'Sipariş satırı yok', 'Bad Request')
  }

  const missingRows = await prisma.orderMissingItem.findMany({
    where: { orderId },
    select: { lineId: true, status: true },
  })
  const openMissingLineIds = new Set<string>()
  for (const m of missingRows) {
    if (isMissingItemResolvedStatus(m.status)) continue
    if (m.lineId) openMissingLineIds.add(m.lineId)
  }

  const planLines = computeShipmentPlanLines(existing.lines, existing.shipments, openMissingLineIds)
  let selected: SelectedShipmentLine[]
  try {
    selected = resolveLinesToCreate(planLines, body)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Validation failed'
    throw new AppHttpError(400, msg, 'Bad Request')
  }

  const policyEval = evaluateShipmentCreatePolicies({
    operation: 'shipment_create',
    planLines,
    selected,
    allowReceivingRisk: body.allowReceivingRisk,
    policyOverrides: body.policyOverrides,
    openMissingLineIds,
  })
  try {
    assertPolicyAllowsProceed(policyEval)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Policy blocked'
    throw new AppHttpError(400, msg, 'Bad Request', { policy: policyEval.blocking.map((b) => b.code) })
  }

  const isPartial = orderHasRemainingAfterPlan(planLines, selected)
  const now = new Date()
  const shipmentId = `SHP-${orderId}-${Date.now()}`
  const plannedShipDate = parseIsoDate(body.plannedDate)

  const lineCreates = selected.map((sel) => ({
    orderLineId: sel.orderLineId,
    qty: new Prisma.Decimal(sel.qty),
  }))

  await prisma.$transaction(async (tx) => {
    await tx.shipment.create({
      data: {
        id: shipmentId,
        salesOrderId: orderId,
        status: SHIPMENT_OPERATION_STATUS.PLANNED,
        plannedShipDate,
        crewName: body.crewName ?? null,
        vehicleNote: body.vehicleNote ?? null,
        note: body.note ?? null,
        lines: { create: lineCreates },
      },
    })

    const eventType = isPartial ? 'shipment.partial' : shipmentEventTypeForStatus(SHIPMENT_OPERATION_STATUS.PLANNED)
    await tx.domainEvent.create({
      data: {
        type: eventType!,
        aggregateType: 'SalesOrder',
        aggregateId: orderId,
        occurredAt: now,
        correlationId: `corr-${orderId}-shipment-${shipmentId}-planned`,
        payload: {
          shipmentId,
          fromStatus: '',
          toStatus: SHIPMENT_OPERATION_STATUS.PLANNED,
          plannedShipDate: body.plannedDate,
          crewName: body.crewName ?? null,
          vehicleNote: body.vehicleNote ?? null,
          isPartial,
          lines: selected.map((s) => {
            const meta = planLines.find((p) => p.orderLineId === s.orderLineId)
            return {
              orderLineId: s.orderLineId,
              title: meta?.title ?? '',
              qty: s.qty,
            }
          }),
        },
      },
    })

    if (body.allowReceivingRisk) {
      await tx.domainEvent.create({
        data: policyOverrideEventCreateData(
          {
            orderId,
            code: 'allowReceivingRisk',
            reason:
              body.note?.trim() ||
              'Ürün gelmeden sevk — operasyon risk override',
            context: 'shipment.create',
            metadata: { shipmentId, plannedDate: body.plannedDate },
            authUser: options?.authUser,
          },
          now,
        ),
      })
    }

    await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        shipmentDate: existing.shipmentDate ?? plannedShipDate,
        version: { increment: 1 },
      },
    })
  })

  const shipmentRow = await prisma.shipment.findUniqueOrThrow({
    where: { id: shipmentId },
    include: { lines: true },
  })
  const shipment = mapShipmentRow(shipmentRow)
  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  const order = projectSalesOrderListItemFromDbRow(row, todayIso)

  return { shipment, order }
}
