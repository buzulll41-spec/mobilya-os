import type { PrismaClient } from '@prisma/client'

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

/** Pilot tahsilat onay test siparişi — idempotent upsert (mevcut DB'de de çalışır). */
export async function seedPilotKupasiPaymentApproval(prisma: PrismaClient): Promise<void> {
  const orderId = 'S-DEMO-KUPASI'
  const paymentId = 'PT-DEMO-KUPASI-1'
  const occurredAt = new Date('2026-05-13T08:00:00.000Z')

  await prisma.salesOrder.upsert({
    where: { id: orderId },
    create: {
      id: orderId,
      customerName: 'DÜNYA KUPASI Organizasyon',
      customerPhone: '+90 532 880 20 26',
      productSummary: 'DÜNYA KUPASI stand dekorasyonu — özel üretim',
      displayStatus: 'Üretimde',
      currency: 'TRY',
      totalAmount: 136_800,
      paidAmount: 0,
      isFullyPaid: false,
      orderDate: d('2026-05-10'),
      dueDate: d('2026-05-24'),
      shipmentDate: d('2026-05-28'),
      salesPerson: 'Murat Tekin',
      lineCostAmount: 78_400,
      notes: 'Pilot demo — tahsilat onay akışı test siparişi.',
      version: 1,
      lines: {
        create: [{ id: 'OL-DEMO-KUPASI-1', title: 'Stand dekorasyonu', qtyOrdered: 1 }],
      },
    },
    update: {
      customerName: 'DÜNYA KUPASI Organizasyon',
      totalAmount: 136_800,
      paidAmount: 0,
      isFullyPaid: false,
      displayStatus: 'Üretimde',
    },
  })

  await prisma.paymentTransaction.upsert({
    where: { id: paymentId },
    create: {
      id: paymentId,
      salesOrderId: orderId,
      kind: 'CAPTURE',
      status: 'PENDING_APPROVAL',
      amount: 6800,
      currency: 'TRY',
      occurredAt,
    },
    update: {
      status: 'PENDING_APPROVAL',
      amount: 6800,
      occurredAt,
    },
  })

  const pendingEvent = await prisma.domainEvent.findFirst({
    where: {
      aggregateId: orderId,
      type: 'payment.pending',
    },
  })

  if (!pendingEvent) {
    await prisma.domainEvent.create({
      data: {
        type: 'payment.pending',
        aggregateType: 'SalesOrder',
        aggregateId: orderId,
        occurredAt,
        correlationId: `seed-${orderId}-pay-pending`,
        payload: {
          transactionId: paymentId,
          amount: '6800.00',
          currency: 'TRY',
          method: 'TRANSFER',
          status: 'PENDING_APPROVAL',
          note: 'Kapora havale',
          operationActor: {
            actorName: 'Murat Tekin',
            role: 'SALES',
            actor: 'Murat Tekin',
          },
        },
      },
    })
  }
}
