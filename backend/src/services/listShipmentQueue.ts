import type { PrismaClient } from '@prisma/client'
import {
  SHIPMENT_OPERATION_STATUS,
  normalizeShipmentStatusValue,
} from '../constants/shipmentStatuses.js'
import {
  mapShipmentQueueRow,
  type ShipmentQueueItemDto,
} from '../contracts/shipmentQueueItemDto.js'
import { deriveShipmentInstallationSummary } from '../projection/deriveShipmentInstallationSummary.js'

const QUEUE_STATUSES = [
  SHIPMENT_OPERATION_STATUS.PLANNED,
  SHIPMENT_OPERATION_STATUS.LOADED,
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
  SHIPMENT_OPERATION_STATUS.DELIVERED,
  SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
  SHIPMENT_OPERATION_STATUS.ISSUE,
  'PICKING',
  'READY_TO_DISPATCH',
  'ON_HOLD',
]

export async function listShipmentQueue(
  prisma: PrismaClient,
): Promise<ShipmentQueueItemDto[]> {
  const rows = await prisma.shipment.findMany({
    where: {
      status: { in: QUEUE_STATUSES },
    },
    include: {
      salesOrder: {
        select: {
          displayStatus: true,
          customerName: true,
          customerPhone: true,
          productSummary: true,
        },
      },
    },
    orderBy: [{ plannedShipDate: 'asc' }, { id: 'asc' }],
  })

  const orderIds = [...new Set(rows.map((r) => r.salesOrderId))]
  const installByOrder = new Map<string, ReturnType<typeof deriveShipmentInstallationSummary>>()

  if (orderIds.length) {
    const allForOrders = await prisma.shipment.findMany({
      where: { salesOrderId: { in: orderIds } },
      select: { salesOrderId: true, status: true },
    })
    const byOrder = new Map<string, { status: string }[]>()
    for (const sh of allForOrders) {
      const list = byOrder.get(sh.salesOrderId) ?? []
      list.push({ status: sh.status })
      byOrder.set(sh.salesOrderId, list)
    }
    for (const [orderId, shipments] of byOrder) {
      installByOrder.set(orderId, deriveShipmentInstallationSummary(shipments))
    }
  }

  return rows
    .filter((r) => normalizeShipmentStatusValue(r.status) !== 'CANCELLED')
    .map((r) => {
      const install = installByOrder.get(r.salesOrderId)
      return mapShipmentQueueRow({
        ...r,
        installationPending: install?.installationPending ?? false,
        hasShipmentIssue: install?.hasShipmentIssue ?? false,
      })
    })
}
