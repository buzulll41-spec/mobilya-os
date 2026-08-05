import type { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import {
  buildOrderLineStateCorrection,
  canMarkShipmentReady,
  canRevertShipmentReady,
  canRevertSupplySent,
  type OrderLineSupplySnapshot,
} from '../lib/orderLineSupplyState.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import { decimalToNumber } from '../lib/money.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { syncSalesOrderDisplayStatusFromLines } from './syncSalesOrderDisplayStatus.js'

export const SHIPMENT_READY_MARKED_EVENT = 'shipment.ready.marked'
export const SHIPMENT_READY_REVERTED_EVENT = 'shipment.ready.reverted'
export const SUPPLY_ORDER_REVERTED_EVENT = 'supply.order.reverted'
export const ORDER_LINE_STATE_RECONCILED_EVENT = 'order_line.state.reconciled'

function toSnapshot(line: {
  supplyStatus: string
  warehouseEntryStatus: string
  qtyOrdered: Prisma.Decimal
  qtyReceived: Prisma.Decimal
  shipmentReady: boolean
}): OrderLineSupplySnapshot {
  return {
    supplyStatus: line.supplyStatus,
    warehouseEntryStatus: line.warehouseEntryStatus,
    qtyOrdered: decimalToNumber(line.qtyOrdered),
    qtyReceived: decimalToNumber(line.qtyReceived),
    shipmentReady: line.shipmentReady,
  }
}

async function loadLine(prisma: PrismaClient, orderId: string, lineId: string) {
  const line = await prisma.orderLine.findFirst({
    where: { id: lineId, salesOrderId: orderId },
  })
  if (!line) {
    throw new AppHttpError(404, 'Sipariş kalemi bulunamadı', 'Not Found')
  }
  return line
}

export async function markOrderLineShipmentReady(
  prisma: PrismaClient,
  orderId: string,
  lineId: string,
  options?: { authUser?: AuthUserContext },
): Promise<{ orderLineId: string }> {
  const line = await loadLine(prisma, orderId, lineId)
  const snapshot = toSnapshot(line)

  if (!canMarkShipmentReady(snapshot)) {
    throw new AppHttpError(
      409,
      'Sevke hazır işaretlemek için tedarik verilmiş ve depo girişi Geldi olmalı',
      'Conflict',
    )
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.orderLine.update({
      where: { id: line.id },
      data: { shipmentReady: true },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SHIPMENT_READY_MARKED_EVENT,
        `corr-ship-ready-${line.id}-${now.getTime()}`,
        now,
        { orderLineId: line.id, lineTitle: line.title },
        options?.authUser,
      ),
    })
    await syncSalesOrderDisplayStatusFromLines(tx, orderId)
  })

  return { orderLineId: line.id }
}

export async function revertOrderLineShipmentReady(
  prisma: PrismaClient,
  orderId: string,
  lineId: string,
  options?: { authUser?: AuthUserContext },
): Promise<{ orderLineId: string }> {
  const line = await loadLine(prisma, orderId, lineId)
  const snapshot = toSnapshot(line)

  if (!canRevertShipmentReady(snapshot)) {
    throw new AppHttpError(409, 'Sevke hazır işareti yok', 'Conflict')
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.orderLine.update({
      where: { id: line.id },
      data: { shipmentReady: false },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SHIPMENT_READY_REVERTED_EVENT,
        `corr-ship-ready-revert-${line.id}-${now.getTime()}`,
        now,
        { orderLineId: line.id, lineTitle: line.title },
        options?.authUser,
      ),
    })
    await syncSalesOrderDisplayStatusFromLines(tx, orderId)
  })

  return { orderLineId: line.id }
}

export async function revertOrderLineSupplySent(
  prisma: PrismaClient,
  orderId: string,
  lineId: string,
  options?: { authUser?: AuthUserContext },
): Promise<{ orderLineId: string }> {
  const line = await loadLine(prisma, orderId, lineId)
  const snapshot = toSnapshot(line)

  if (!canRevertSupplySent(snapshot)) {
    throw new AppHttpError(
      409,
      'Tedarik geri almak için önce depo girişini geri alın veya geliş olmamalı',
      'Conflict',
    )
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.orderLine.update({
      where: { id: line.id },
      data: {
        supplyStatus: SUPPLY_STATUS.NOT_SENT,
        supplyChannel: null,
        supplySentAt: null,
        supplySentByUserId: null,
        supplySentByName: null,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
        qtyReceived: new Prisma.Decimal(0),
        shipmentReady: false,
      },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        SUPPLY_ORDER_REVERTED_EVENT,
        `corr-supply-revert-${line.id}-${now.getTime()}`,
        now,
        { orderLineId: line.id, lineTitle: line.title },
        options?.authUser,
      ),
    })
    await syncSalesOrderDisplayStatusFromLines(tx, orderId)
  })

  return { orderLineId: line.id }
}

export async function reconcileOrderLineSupplyState(
  prisma: PrismaClient,
  orderId: string,
  lineId: string,
  options?: { authUser?: AuthUserContext },
): Promise<{ orderLineId: string; corrected: boolean }> {
  const line = await loadLine(prisma, orderId, lineId)
  const snapshot = toSnapshot(line)
  const correction = buildOrderLineStateCorrection(snapshot)

  const needsCorrection =
    line.supplyStatus !== correction.supplyStatus ||
    line.warehouseEntryStatus !== correction.warehouseEntryStatus ||
    decimalToNumber(line.qtyReceived) !== correction.qtyReceived ||
    line.shipmentReady !== correction.shipmentReady

  if (!needsCorrection) {
    return { orderLineId: line.id, corrected: false }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.orderLine.update({
      where: { id: line.id },
      data: {
        supplyStatus: correction.supplyStatus,
        warehouseEntryStatus: correction.warehouseEntryStatus,
        qtyReceived: new Prisma.Decimal(correction.qtyReceived),
        shipmentReady: correction.shipmentReady,
        ...(correction.clearSupplyMetadata
          ? {
              supplyChannel: null,
              supplySentAt: null,
              supplySentByUserId: null,
              supplySentByName: null,
            }
          : {}),
      },
    })
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        ORDER_LINE_STATE_RECONCILED_EVENT,
        `corr-line-state-${line.id}-${now.getTime()}`,
        now,
        {
          orderLineId: line.id,
          lineTitle: line.title,
          previous: snapshot,
          corrected: correction,
        },
        options?.authUser,
      ),
    })
    await syncSalesOrderDisplayStatusFromLines(tx, orderId)
  })

  return { orderLineId: line.id, corrected: true }
}
