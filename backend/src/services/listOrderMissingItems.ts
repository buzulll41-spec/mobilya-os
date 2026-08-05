import type { PrismaClient } from '@prisma/client'
import { mapMissingItemRow, type MissingItemDto } from '../contracts/missingItemDto.js'
import { AppHttpError } from '../errors/apiError.js'

export async function listOrderMissingItems(
  prisma: PrismaClient,
  orderId: string,
): Promise<MissingItemDto[]> {
  const order = await prisma.salesOrder.findUnique({ where: { id: orderId }, select: { id: true } })
  if (!order) {
    throw new AppHttpError(404, 'Sipariş bulunamadı', 'Not Found')
  }

  const rows = await prisma.orderMissingItem.findMany({
    where: { orderId },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  })
  return rows.map(mapMissingItemRow)
}
