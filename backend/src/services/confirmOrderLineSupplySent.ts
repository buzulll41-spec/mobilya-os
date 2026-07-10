import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  SUPPLY_CHANNEL,
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
  isSupplyChannel,
  type SupplyChannel,
} from '../constants/supplyOrderStatus.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import type { AuthUserContext } from '../lib/authUser.js'
import { syncSalesOrderDisplayStatusFromLines } from './syncSalesOrderDisplayStatus.js'

export const SUPPLY_ORDER_SENT_EVENT = 'supply.order.sent'

export type ConfirmOrderLineSupplyRequest = {
  lineIds: string[]
  channel: SupplyChannel
}

export function assertValidConfirmOrderLineSupplyRequest(body: unknown): ConfirmOrderLineSupplyRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Geçersiz istek gövdesi', 'Validation Error')
  }
  const o = body as Record<string, unknown>
  const lineIds = Array.isArray(o.lineIds)
    ? o.lineIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    : []
  if (lineIds.length === 0) {
    throw new AppHttpError(400, 'En az bir ürün seçilmeli', 'Validation Error')
  }
  const channel = typeof o.channel === 'string' ? o.channel.trim() : ''
  if (!isSupplyChannel(channel)) {
    throw new AppHttpError(400, 'Tedarik kanalı MAIL veya WHATSAPP olmalı', 'Validation Error')
  }
  return { lineIds, channel }
}

export type ConfirmOrderLineSupplyResult = {
  updatedCount: number
  lineIds: string[]
}

export async function confirmOrderLineSupplySent(
  prisma: PrismaClient,
  orderId: string,
  body: ConfirmOrderLineSupplyRequest,
  options?: { authUser?: AuthUserContext },
): Promise<ConfirmOrderLineSupplyResult> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    select: { id: true },
  })
  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }

  const uniqueIds = [...new Set(body.lineIds)]
  const lines = await prisma.orderLine.findMany({
    where: { salesOrderId: orderId, id: { in: uniqueIds } },
  })

  if (lines.length !== uniqueIds.length) {
    throw new AppHttpError(400, 'Seçilen ürünler bu siparişe ait değil', 'Validation Error')
  }

  const alreadySent = lines.filter((ln) => ln.supplyStatus === SUPPLY_STATUS.SENT)
  if (alreadySent.length > 0) {
    throw new AppHttpError(
      409,
      `${alreadySent.length} kalem zaten tedarik verilmiş`,
      'Conflict',
    )
  }

  const now = new Date()
  const actorId = options?.authUser?.id ?? null
  const actorName = options?.authUser?.fullName ?? options?.authUser?.email ?? null

  await prisma.$transaction(async (tx) => {
    for (const line of lines) {
      const previousSupplyStatus = line.supplyStatus
      const previousWarehouseStatus = line.warehouseEntryStatus

      await tx.orderLine.update({
        where: { id: line.id },
        data: {
          supplyStatus: SUPPLY_STATUS.SENT,
          supplyChannel: body.channel,
          supplySentAt: now,
          supplySentByUserId: actorId,
          supplySentByName: actorName,
          warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
          shipmentReady: false,
        },
      })

      await tx.domainEvent.create({
        data: domainEventCreateInput(
          orderId,
          'SalesOrder',
          SUPPLY_ORDER_SENT_EVENT,
          `corr-supply-${line.id}-${now.getTime()}`,
          now,
          {
            orderLineId: line.id,
            lineTitle: line.title,
            channel: body.channel,
            previousSupplyStatus,
            newSupplyStatus: SUPPLY_STATUS.SENT,
            previousWarehouseStatus,
            newWarehouseStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
          },
          options?.authUser,
        ),
      })
    }
  })

  return { updatedCount: lines.length, lineIds: uniqueIds }
}

export const WAREHOUSE_ARRIVAL_REVERTED_EVENT = 'warehouse.arrival.reverted'

export async function revertOrderLineWarehouseArrival(
  prisma: PrismaClient,
  orderId: string,
  lineId: string,
  options?: { authUser?: AuthUserContext },
): Promise<{ orderLineId: string }> {
  const line = await prisma.orderLine.findFirst({
    where: { id: lineId, salesOrderId: orderId },
  })
  if (!line) {
    throw new AppHttpError(404, 'Sipariş kalemi bulunamadı', 'Not Found')
  }

  if (line.supplyStatus !== SUPPLY_STATUS.SENT) {
    throw new AppHttpError(400, 'Tedarik verilmeden depo girişi geri alınamaz', 'Validation Error')
  }

  const received = Number(line.qtyReceived)
  if (received <= 0.0001) {
    throw new AppHttpError(400, 'Geri alınacak depo girişi yok', 'Validation Error')
  }

  const previousWarehouseStatus = line.warehouseEntryStatus
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.orderLine.update({
      where: { id: line.id },
      data: {
        qtyReceived: 0,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
        shipmentReady: false,
      },
    })

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        WAREHOUSE_ARRIVAL_REVERTED_EVENT,
        `corr-wh-revert-${line.id}-${now.getTime()}`,
        now,
        {
          orderLineId: line.id,
          lineTitle: line.title,
          previousWarehouseStatus,
          newWarehouseStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
          previousQtyReceived: received,
          newQtyReceived: 0,
        },
        options?.authUser,
      ),
    })
    await syncSalesOrderDisplayStatusFromLines(tx, orderId)
  })

  return { orderLineId: line.id }
}

export { SUPPLY_CHANNEL }
