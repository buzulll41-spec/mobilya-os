import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { buildOrderItemSalesSnapshot } from '../src/services/buildOrderItemSalesSnapshot.js'
import { resolveSalesSourceBucket, SALES_SOURCE_BUCKETS } from '../src/constants/salesSourceBuckets.js'
import { PRODUCT_STOCK_TYPE } from '../src/constants/productStockTypes.js'
import { INCOMING_GOODS_PURPOSE } from '../src/constants/incomingGoodsPurpose.js'

/* ── Birim testler: merkezi snapshot iş kuralları ── */

describe('buildOrderItemSalesSnapshot', () => {
  it('1) IN_STORE_DISPLAY + GROUND_FLOOR → kat snapshot + maliyet', () => {
    const snap = buildOrderItemSalesSnapshot({
      salesSourceType: 'IN_STORE_DISPLAY',
      displayFloor: 'GROUND_FLOOR',
      purchasePrice: 28000,
    })
    expect(snap.soldSalesSourceType).toBe('IN_STORE_DISPLAY')
    expect(snap.soldDisplayFloor).toBe('GROUND_FLOOR')
    expect(snap.soldExternalSupplyType).toBeNull()
    expect(snap.soldUnitCost).toBe(28000)
  })

  it('2) IN_STORE_DISPLAY + BASEMENT → rapor kırılımı Bodrum Kat', () => {
    const snap = buildOrderItemSalesSnapshot({
      salesSourceType: 'IN_STORE_DISPLAY',
      displayFloor: 'BASEMENT',
      purchasePrice: 10000,
    })
    expect(resolveSalesSourceBucket(snap).label).toBe('Bodrum Kat')
  })

  it('3) EXTERNAL_SUPPLY → externalSupplyType dolu, displayFloor null', () => {
    const snap = buildOrderItemSalesSnapshot({
      salesSourceType: 'EXTERNAL_SUPPLY',
      externalSupplyType: 'CATALOG',
      purchasePrice: 9800,
    })
    expect(snap.soldSalesSourceType).toBe('EXTERNAL_SUPPLY')
    expect(snap.soldDisplayFloor).toBeNull()
    expect(snap.soldExternalSupplyType).toBe('CATALOG')
  })

  it('4) STOCK_ITEM → alt alanlar null', () => {
    const snap = buildOrderItemSalesSnapshot({ salesSourceType: 'STOCK_ITEM', purchasePrice: 5000 })
    expect(snap.soldSalesSourceType).toBe('STOCK_ITEM')
    expect(snap.soldDisplayFloor).toBeNull()
    expect(snap.soldExternalSupplyType).toBeNull()
  })

  it('5) WAREHOUSE/Depo asla satış kaynağı olmaz → UNKNOWN; Depo Katı kırılımı yok', () => {
    expect(buildOrderItemSalesSnapshot({ salesSourceType: 'WAREHOUSE' }).soldSalesSourceType).toBe('UNKNOWN')
    // IN_STORE_DISPLAY + WAREHOUSE_FLOOR (geçersiz kat) → UNKNOWN
    const bad = buildOrderItemSalesSnapshot({
      salesSourceType: 'IN_STORE_DISPLAY',
      displayFloor: 'WAREHOUSE_FLOOR',
    })
    expect(bad.soldSalesSourceType).toBe('UNKNOWN')
    expect(resolveSalesSourceBucket(bad).label).toBe('Bilinmeyen')
    expect(SALES_SOURCE_BUCKETS.some((b) => b.label === 'Depo Katı')).toBe(false)
  })

  it('6) snapshot saf fonksiyon — ürün değişimi eski snapshot’ı etkilemez', () => {
    const before = buildOrderItemSalesSnapshot({
      salesSourceType: 'IN_STORE_DISPLAY',
      displayFloor: 'GROUND_FLOOR',
      purchasePrice: 28000,
    })
    // Ürün sonradan değişse de daha önce üretilmiş snapshot sabittir.
    buildOrderItemSalesSnapshot({ salesSourceType: 'EXTERNAL_SUPPLY', externalSupplyType: 'WEBSITE', purchasePrice: 9999 })
    expect(before.soldSalesSourceType).toBe('IN_STORE_DISPLAY')
    expect(before.soldDisplayFloor).toBe('GROUND_FLOOR')
    expect(before.soldUnitCost).toBe(28000)
  })

  it('7) eksik/geçersiz kaynak → UNKNOWN, maliyet üründen', () => {
    const snap = buildOrderItemSalesSnapshot({ salesSourceType: null, purchasePrice: 1234 })
    expect(snap.soldSalesSourceType).toBe('UNKNOWN')
    expect(snap.soldDisplayFloor).toBeNull()
    expect(snap.soldExternalSupplyType).toBeNull()
    expect(snap.soldUnitCost).toBe(1234)
  })

  it('8) soldUnitCost doğru snapshotlanır (override > ürün > 0)', () => {
    expect(
      buildOrderItemSalesSnapshot({ salesSourceType: 'STOCK_ITEM', purchasePrice: 5000, unitCostOverride: 6200 })
        .soldUnitCost,
    ).toBe(6200)
    expect(buildOrderItemSalesSnapshot({ salesSourceType: 'STOCK_ITEM', purchasePrice: 5000 }).soldUnitCost).toBe(5000)
    expect(buildOrderItemSalesSnapshot({ salesSourceType: 'STOCK_ITEM' }).soldUnitCost).toBe(0)
  })
})

/* ── Entegrasyon: createSalesOrder snapshot kalitesi + değişmezlik + rapor ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('createSalesOrder satış kaynağı snapshot entegrasyonu', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let supplierId = ''
  let productId = ''
  let orderId = ''
  let incomingId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
    const supRes = await app.inject({
      method: 'POST',
      url: '/v1/suppliers',
      payload: { companyName: `Snapshot Test Tedarik ${Date.now()}` },
    })
    supplierId = (supRes.json() as { id: string }).id

    const prodRes = await app.inject({
      method: 'POST',
      url: '/v1/products',
      payload: {
        productCode: `SNP-${Date.now()}`,
        productName: 'Snapshot Test Dekor',
        category: 'Aksesuar',
        suiteType: 'Tekli',
        defaultSalePrice: 45000,
        minSalePrice: 40000,
        purchasePrice: 28000,
        defaultSupplierId: supplierId,
        deliveryDays: 21,
        stockType: PRODUCT_STOCK_TYPE.ORDER,
        salesSourceType: 'IN_STORE_DISPLAY',
        displayFloor: 'GROUND_FLOOR',
        physicalLocation: 'WAREHOUSE_FLOOR', // Depo Katı: sadece fiziksel, satış kaynağı DEĞİL
      },
    })
    expect(prodRes.statusCode).toBe(201)
    productId = (prodRes.json() as { id: string }).id
  })

  afterAll(async () => {
    if (incomingId) {
      await prisma.incomingGoodsRecord.delete({ where: { id: incomingId } }).catch(() => undefined)
    }
    if (orderId) {
      await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: orderId } }).catch(() => undefined)
      await prisma.orderLine.deleteMany({ where: { salesOrderId: orderId } }).catch(() => undefined)
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } }).catch(() => undefined)
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    if (productId) {
      await prisma.orderLine.updateMany({ where: { productId }, data: { productId: null } }).catch(() => undefined)
      await prisma.product.delete({ where: { id: productId } }).catch(() => undefined)
    }
    if (supplierId) {
      await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } }).catch(() => undefined)
      await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('sipariş oluşturulunca ürün kaynağı snapshotlanır (Depo Katı kaynak olmaz)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Snapshot Müşteri',
        status: 'Bekleniyor',
        paidAmount: 0,
        lines: [
          { productId, title: 'Snapshot Test Dekor', quantity: 1, unitPrice: 45000, sortOrder: 0 },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    orderId = (res.json() as { id: string }).id

    const line = await prisma.orderLine.findFirstOrThrow({ where: { salesOrderId: orderId } })
    expect(line.soldSalesSourceType).toBe('IN_STORE_DISPLAY')
    expect(line.soldDisplayFloor).toBe('GROUND_FLOOR')
    expect(line.soldExternalSupplyType).toBeNull()
    expect(Number(line.soldUnitCost)).toBe(28000)
  })

  it('ürün sonradan değişse bile sipariş kalemi snapshot’ı değişmez', async () => {
    const patch = await app.inject({
      method: 'PATCH',
      url: `/v1/products/${productId}`,
      payload: { displayFloor: 'FIRST_FLOOR' },
    })
    expect(patch.statusCode).toBe(200)

    const line = await prisma.orderLine.findFirstOrThrow({ where: { salesOrderId: orderId } })
    expect(line.soldDisplayFloor).toBe('GROUND_FLOOR') // hâlâ satış anındaki kat
  })

  it('rapor: yeni sipariş Giriş Kat kırılımında görünür, Depo Katı satırı yok', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/sales-source-analytics' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { rows: { label: string; revenue: string }[] }
    expect(body.rows.some((r) => r.label === 'Depo Katı')).toBe(false)
    const giris = body.rows.find((r) => r.label === 'Giriş Kat')
    expect(giris).toBeTruthy()
    expect(Number.parseFloat(giris!.revenue)).toBeGreaterThanOrEqual(45000)
  })

  it('warehouse-entries Depo Katı fiziksel lokasyonunu göstermeye devam eder', async () => {
    // Deterministik kanıt: Depo Katı'nda duran bir STOCK gelen ürün kaydı oluştur.
    const rec = await prisma.incomingGoodsRecord.create({
      data: {
        supplierId,
        receivedAt: new Date('2026-05-20'),
        productId,
        productTitle: 'Snapshot Live Dekor',
        qty: '2',
        unitPurchasePrice: '28000',
        lineTotal: '56000',
        purpose: INCOMING_GOODS_PURPOSE.STOCK,
      },
    })
    incomingId = rec.id

    const res = await app.inject({ method: 'GET', url: '/v1/reports/warehouse-entries' })
    expect(res.statusCode).toBe(200)
    const entries = res.json() as { id: string; physicalLocationLabel: string }[]
    // Depo Katı satış kaynağı raporuna girmez ama fiziksel lokasyon takibinde görünür.
    const mine = entries.find((e) => e.id === incomingId)
    expect(mine).toBeTruthy()
    expect(mine!.physicalLocationLabel).toBe('Depo Katı')
  })
})
