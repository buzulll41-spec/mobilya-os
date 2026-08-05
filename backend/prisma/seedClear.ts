import type { PrismaClient } from '@prisma/client'

/** Demo verisini sıfırlar — pilot canlı veriyi korumak için yalnızca db:reset-demo ile çalıştırın. */
export async function clearDemoData(prisma: PrismaClient): Promise<void> {
  await prisma.taskState.deleteMany()
  await prisma.incomingGoodsRecord.deleteMany()
  await prisma.supplierLedgerEntry.deleteMany()
  await prisma.shipmentLine.deleteMany()
  await prisma.shipment.deleteMany()
  await prisma.orderMissingItem.deleteMany()
  await prisma.paymentTransaction.deleteMany()
  await prisma.orderLine.deleteMany()
  await prisma.domainEvent.deleteMany()
  await prisma.salesOrder.deleteMany()
  // users ve suppliers silinmez — pilot kullanıcı/tedarikçi korunur
}
