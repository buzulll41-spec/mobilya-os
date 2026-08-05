import type { Prisma, PrismaClient } from '@prisma/client'

import { deriveOrderDisplayStatusFromLines } from '../lib/deriveOrderDisplayStatus.js'

import { countOpenMissingItems } from '../lib/autoShipmentReady.js'



type DbClient = PrismaClient | Prisma.TransactionClient



/**

 * Sipariş displayStatus alanını satır depo durumu + SSH/eksik parça engellerinden türetir ve günceller.

 */

export async function syncSalesOrderDisplayStatusFromLines(

  prisma: DbClient,

  salesOrderId: string,

): Promise<string | null> {

  const order = await prisma.salesOrder.findUnique({

    where: { id: salesOrderId },

    select: { displayStatus: true },

  })

  if (!order) return null



  const [lines, missingItems] = await Promise.all([

    prisma.orderLine.findMany({

      where: { salesOrderId },

      select: { warehouseEntryStatus: true, shipmentReady: true },

    }),

    prisma.orderMissingItem.findMany({

      where: { orderId: salesOrderId },

      select: { status: true },

    }),

  ])



  const nextDisplayStatus = deriveOrderDisplayStatusFromLines(lines, order.displayStatus, {

    openMissingItemsCount: countOpenMissingItems(missingItems),

  })

  if (nextDisplayStatus !== order.displayStatus) {

    await prisma.salesOrder.update({

      where: { id: salesOrderId },

      data: { displayStatus: nextDisplayStatus, version: { increment: 1 } },

    })

  }



  return nextDisplayStatus

}

