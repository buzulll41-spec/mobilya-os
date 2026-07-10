import { beforeEach, describe, expect, it } from 'vitest'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { PRODUCT_STOCK_TYPE } from '../../src/constants/productCatalog.js'
import { mapWizardProductsToLines } from '../../src/features/orders/newOrderWizardModel.js'
import { computeShipmentPlanLinesFromSeeds } from '../../src/mappers/shipment/computeShipmentPlanLines.js'
import { validateShipmentPlanSelection } from '../../src/mappers/shipment/computeShipmentPlanLines.js'
import { confirmOrderLineSupplySent, createOrder, getShipmentPlanLines, resetMockOrdersStore } from '../../src/services/mockApi.js'
import { getOrderLinesForSalesOrder } from '../../src/services/mockOrderLineStore.js'
import {
  mockCreateIncomingGoods,
  mockListOrderLineReceiving,
} from '../../src/services/mockIncomingGoodsApi.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { getOpenBalanceForSupplier } from '../../src/services/mockSupplierLedgerStore.js'
import { mockCreateProduct } from '../../src/services/mockProductsApi.js'
import { mockCreateSupplier } from '../../src/services/mockSuppliersApi.js'
import { fetchSalesContractLineRows } from '../../src/services/salesContractLines.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'

describe('product lifecycle mock (ürün kartı → sevk)', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    resetMockIncomingGoodsStore()
    authenticateTestAdmin()
  })

  it('productId sipariş satırında kalır; gelen ürün qtyReceived ve cariyi günceller; sevk sadece geleni sayar', async () => {
    const supplier = await mockCreateSupplier({ companyName: 'LC Tedarik', address: 'Ankara' })
    const product = await mockCreateProduct({
      productCode: `LC-${Date.now()}`,
      productName: 'LC Koltuk Takımı',
      category: 'Oturma grubu',
      defaultSalePrice: 42_000,
      minSalePrice: 38_000,
      purchasePrice: 22_000,
      defaultSupplierId: supplier.id,
      deliveryDays: 14,
      isActive: true,
      stockType: PRODUCT_STOCK_TYPE.ORDER,
    })

    const lines = mapWizardProductsToLines({
      customer: 'Test Müşteri',
      phone: '',
      phone2: '',
      nationalId: '',
      taxNumber: '',
      taxOffice: '',
      city: '',
      district: '',
      neighborhood: '',
      address: '',
      customerNote: '',
      salesPerson: '',
      kapora: '',
      paymentMethod: 'TRANSFER',
      dueDate: '',
      status: 'Üretimde',
      products: [
        {
          id: 'l1',
          name: product.productName,
          group: product.category,
          qty: '2',
          unitPrice: '42000',
          note: '',
          productId: product.id,
          fromCatalog: true,
          defaultSupplierId: supplier.id,
        },
        {
          id: 'l2',
          name: 'Elle Yazılan Ürün',
          group: 'Diğer',
          qty: '1',
          unitPrice: '5000',
          note: '',
        },
      ],
    })

    const order = await createOrder({
      customerName: 'Test Müşteri',
      productTitle: '2 kalem',
      totalAmount: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
      paidAmount: 0,
      status: 'Üretimde',
      lines,
    })

    const seeds = getOrderLinesForSalesOrder(order.id)
    expect(seeds).toHaveLength(2)
    expect(seeds[0].productId).toBe(product.id)
    expect(seeds[0].qtyReceived).toBe('0')
    expect(seeds[1].productId).toBeUndefined()

    const receivingBefore = await mockListOrderLineReceiving(order.id)
    const catalogLine = receivingBefore.lines.find((l) => l.orderLineId === seeds[0].id)
    expect(catalogLine?.productId).toBe(product.id)
    expect(catalogLine?.defaultSupplierId).toBe(supplier.id)
    expect(catalogLine?.suggestedPurchasePrice).toBe('22000.00')

    const balanceBefore = getOpenBalanceForSupplier(supplier.id)

    await confirmOrderLineSupplySent(order.id, { lineIds: [seeds[0].id], channel: 'WHATSAPP' })

    await mockCreateIncomingGoods({
      supplierId: supplier.id,
      receivedAt: '2026-05-21',
      productTitle: product.productName,
      productId: product.id,
      qty: 1,
      unitPurchasePrice: 22_000,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: seeds[0].id,
    })

    const afterReceive = getOrderLinesForSalesOrder(order.id)
    expect(afterReceive[0].qtyReceived).toBe('1.00')
    expect(getOpenBalanceForSupplier(supplier.id)).toBeGreaterThan(balanceBefore)

    const receivingAfter = await mockListOrderLineReceiving(order.id)
    const partial = receivingAfter.lines.find((l) => l.orderLineId === seeds[0].id)
    expect(partial?.readinessStatus).toBe('partial')
    expect(partial?.qtyReceived).toBe('1.00')

    const plan = await getShipmentPlanLines(order.id)
    const lineA = plan.find((p) => p.orderLineId === seeds[0].id)
    const lineB = plan.find((p) => p.orderLineId === seeds[1].id)
    expect(Number.parseFloat(lineA?.qtyShippable ?? '0')).toBe(1)
    expect(Number.parseFloat(lineB?.qtyShippable ?? '0')).toBe(0)
    expect(lineB?.qtyShippable).toBe('0.00')

    const overShip = validateShipmentPlanSelection(plan, [{ orderLineId: seeds[0].id, qty: 2 }])
    expect(overShip.ok).toBe(false)

    const unreceivedPlan = computeShipmentPlanLinesFromSeeds(
      [{ ...seeds[1], title: seeds[1].title ?? 'Elle Yazılan Ürün' }],
      [],
    )
    const unreceivedPick = validateShipmentPlanSelection(unreceivedPlan, [
      { orderLineId: seeds[1].id, qty: 1 },
    ])
    expect(unreceivedPick.ok).toBe(false)

    const catalogSeed = afterReceive.find((s) => s.productId === product.id)
    const manualSeed = afterReceive.find((s) => !s.productId)
    const manualPlan = computeShipmentPlanLinesFromSeeds(afterReceive, [], 'Ürün')
    const planCatalog = manualPlan.find((p) => p.orderLineId === catalogSeed?.id)
    const planManual = manualPlan.find((p) => p.orderLineId === manualSeed?.id)
    expect(planCatalog?.selectable).toBe(true)
    expect(planManual?.qtyShippable).toBe('0.00')

    const contractRows = await fetchSalesContractLineRows(order.id, order.amount)
    expect(contractRows.some((r) => r.title === product.productName)).toBe(true)
    expect(contractRows.some((r) => r.title === 'Elle Yazılan Ürün')).toBe(true)
    expect(contractRows.find((r) => r.title === product.productName)?.unitPrice).toBe(42_000)
  })
})
