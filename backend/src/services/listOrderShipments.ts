import type { PrismaClient } from '@prisma/client'
import { mapShipmentRow, type ShipmentDto } from '../contracts/shipmentDto.js'
import { AppHttpError } from '../errors/apiError.js'

export async function listOrderShipments(
  prisma: PrismaClient,
  orderId: string,
): Promise<ShipmentDto[]> {
  const order = await prisma.salesOrder.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }

  const rows = await prisma.shipment.findMany({
    where: { salesOrderId: orderId },
    include: { lines: true },
    orderBy: [{ plannedShipDate: 'asc' }, { id: 'asc' }],
  })

  return rows.map(mapShipmentRow)
}
