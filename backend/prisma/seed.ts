import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { seedDemoCatalog } from './seedProducts.js'
import { seedProductVariants } from './productVariantSeedData.js'
import { seedUsers } from './seedUsers.js'
import { seedPilotKupasiPaymentApproval } from './seedPilotKupasiPaymentApproval.js'
import { seedMediaAssets } from './seedMediaAssets.js'
import { clearDemoData } from './seedClear.js'

const prisma = new PrismaClient()

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`)
}

async function seedDemoOrdersIfEmpty() {
  const count = await prisma.salesOrder.count()
  if (count > 0) {
    console.log(`Pilot-safe seed: ${count} sipariş mevcut — demo siparişler atlandı`)
    return
  }

  console.log('Demo siparişler oluşturuluyor…')
  await prisma.salesOrder.create({
    data: {
      id: 'S-DEMO-PARTIAL',
      customerName: 'Kısmi Sevk A.Ş.',
      customerPhone: '+90 555 0101',
      productSummary: 'Panel + Aksesuar seti',
      displayStatus: 'Üretimde',
      currency: 'TRY',
      totalAmount: 250_000,
      paidAmount: 125_000,
      isFullyPaid: false,
      orderDate: d('2026-05-08'),
      dueDate: d('2026-05-10'),
      shipmentDate: d('2026-05-18'),
      salesPerson: 'Elçin Korkmaz',
      lineCostAmount: 140_000,
      notes: 'Termin gecikti + kısmi sevk → HIGH (birleşik sinyal)',
      version: 1,
      lines: {
        create: [
          { id: 'OL-PARTIAL-1', title: 'Panel 240', qtyOrdered: 10 },
          { id: 'OL-PARTIAL-2', title: 'Aksesuar', qtyOrdered: 10 },
        ],
      },
      shipments: {
        create: [
          {
            id: 'SH-PARTIAL-DISP',
            status: 'DISPATCHED',
            plannedShipDate: d('2026-05-12'),
            lines: {
              create: [{ id: 'SL-PARTIAL-1', orderLineId: 'OL-PARTIAL-1', qty: 5 }],
            },
          },
          {
            id: 'SH-PARTIAL-OPEN',
            status: 'PLANNED',
            plannedShipDate: d('2026-05-20'),
            lines: { create: [] },
          },
        ],
      },
      payments: {
        create: [],
      },
    },
  })

  await prisma.salesOrder.create({
    data: {
      id: 'S-DEMO-PAYMENT',
      customerName: 'Tahsilat Demo Ltd.',
      customerPhone: '+90 555 0202',
      productSummary: 'Toplu dolap siparişi',
      displayStatus: 'Hazır',
      currency: 'TRY',
      totalAmount: 100_000,
      paidAmount: 0,
      isFullyPaid: false,
      orderDate: d('2026-05-12'),
      dueDate: d('2026-06-01'),
      shipmentDate: d('2026-05-22'),
      salesPerson: 'Murat Tekin',
      lineCostAmount: 62_000,
      notes: 'POSTED kısmi tahsilat + PENDING kaparo',
      version: 1,
      lines: {
        create: [{ id: 'OL-PAY-1', title: 'Dolap gövdesi', qtyOrdered: 4 }],
      },
      shipments: {
        create: [],
      },
      payments: {
        create: [
          {
            id: 'PT-PAY-POSTED',
            kind: 'CAPTURE',
            status: 'POSTED',
            amount: 40_000,
            currency: 'TRY',
            occurredAt: new Date('2026-05-13T14:30:00.000Z'),
          },
          {
            id: 'PT-PAY-PENDING',
            kind: 'CAPTURE',
            status: 'PENDING',
            amount: 60_000,
            currency: 'TRY',
            occurredAt: new Date('2026-05-14T09:00:00.000Z'),
          },
        ],
      },
    },
  })

  await prisma.salesOrder.create({
    data: {
      id: 'S-DEMO-EKSIK',
      customerName: 'Eksik Parça Mobilya',
      customerPhone: '+90 555 0303',
      productSummary: 'Mutfak üst modül',
      displayStatus: 'Eksik Var',
      currency: 'TRY',
      totalAmount: 88_000,
      paidAmount: 44_000,
      isFullyPaid: false,
      orderDate: d('2026-05-01'),
      dueDate: d('2026-05-20'),
      shipmentDate: null,
      salesPerson: 'Selin Yıldız',
      lineCostAmount: 51_000,
      notes: 'Operasyon durumu "Eksik Var" → doğrudan HIGH risk',
      version: 1,
      lines: {
        create: [{ id: 'OL-EK-1', title: 'Üst modül', qtyOrdered: 6 }],
      },
      shipments: { create: [] },
      payments: { create: [] },
      missingItems: {
        create: {
          id: 'OMI-DEMO-EKSIK-1',
          lineId: 'OL-EK-1',
          title: 'Kulp seti',
          quantity: 4,
          reason: 'Sevkiyatta eksik geldi',
          status: 'OPEN',
          supplierNote: 'Tedarikçiye mail atıldı',
        },
      },
    },
  })

  await prisma.domainEvent.create({
    data: {
      type: 'missing_item.created',
      aggregateType: 'SalesOrder',
      aggregateId: 'S-DEMO-EKSIK',
      occurredAt: new Date('2026-05-10T11:00:00.000Z'),
      correlationId: 'seed-S-DEMO-EKSIK-missing',
      payload: {
        missingItemId: 'OMI-DEMO-EKSIK-1',
        title: 'Kulp seti',
        quantity: '4.00',
        reason: 'Sevkiyatta eksik geldi',
        lineId: 'OL-EK-1',
        status: 'OPEN',
      },
    },
  })

  await prisma.salesOrder.create({
    data: {
      id: 'S-DEMO-DELIVERED',
      customerName: 'Referans Müşteri',
      customerPhone: null,
      productSummary: 'Ofis masası',
      displayStatus: 'Teslim Edildi',
      currency: 'TRY',
      totalAmount: 12_500,
      paidAmount: 12_500,
      isFullyPaid: true,
      orderDate: d('2026-04-20'),
      dueDate: d('2026-05-05'),
      shipmentDate: d('2026-05-04'),
      salesPerson: 'Elçin Korkmaz',
      lineCostAmount: 7_200,
      notes: null,
      version: 1,
      lines: {
        create: [{ id: 'OL-OK-1', title: 'Masa 160', qtyOrdered: 1 }],
      },
      shipments: { create: [] },
      payments: { create: [] },
    },
  })

  const demoOrders = ['S-DEMO-PARTIAL', 'S-DEMO-PAYMENT', 'S-DEMO-EKSIK', 'S-DEMO-DELIVERED'] as const
  for (const oid of demoOrders) {
    await prisma.domainEvent.create({
      data: {
        type: 'SalesOrder.Seeded',
        aggregateType: 'SALES_ORDER',
        aggregateId: oid,
        occurredAt: new Date(),
        correlationId: `seed-${oid}`,
        payload: { message: 'Foundation seed', orderId: oid },
      },
    })
  }
}

async function main() {
  if (process.env.SEED_RESET === '1') {
    console.log('SEED_RESET=1 — demo verisi sıfırlanıyor…')
    await clearDemoData(prisma)
  }

  await seedDemoOrdersIfEmpty()

  const catalog = await seedDemoCatalog(prisma)
  const variants = await seedProductVariants(prisma)

  const abc = await prisma.supplier.findUnique({ where: { id: 'sup-seed-abc' } })

  const ledgerExists =
    abc &&
    (await prisma.supplierLedgerEntry.findFirst({
      where: { supplierId: abc.id, documentNo: 'FTR-SEED-001' },
    }))
  if (abc && !ledgerExists) {
    await prisma.supplierLedgerEntry.create({
      data: {
        supplierId: abc.id,
        entryType: 'GOODS_RECEIPT',
        occurredAt: d('2026-05-14'),
        description: 'Mayer Köşe — demo mal girişi',
        debitAmount: 0,
        creditAmount: 45_000,
        balanceAfter: 45_000,
        documentNo: 'FTR-SEED-001',
      },
    })
  }

  await seedUsers(prisma)
  await seedPilotKupasiPaymentApproval(prisma)

  const media = await seedMediaAssets(prisma)

  console.log(
    `Seed OK: sales_orders + suppliers + domain_events + users · katalog: ${catalog.productCount} ürün (+${catalog.productsCreated} yeni, ${catalog.productsSkipped} mevcut kod atlandı) · varyant: ${variants.variantCount} (+${variants.variantsUpserted} upsert) · medya: ${media.assetCount} asset (+${media.linksCreated} link)`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
