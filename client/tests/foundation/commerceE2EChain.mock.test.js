import { beforeEach, describe, expect, it } from 'vitest'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { buildSalesContractModel } from '../../src/mappers/sales-contract/buildSalesContractModel.js'
import { normalizeCreateOrderRequest } from '../../src/domain/order/normalizeCreateOrder.js'
import { buildSalesContractPdfFilename } from '../../src/lib/exportSalesContractPdf.js'
import {
  confirmOrderLineSupplySent,
  createOrder,
  getOrderLines,
  getOrders,
  getShipmentPlanLines,
  postOrderPayment,
  postOrderShipment,
  resetMockOrdersStore,
} from '../../src/services/mockApi.js'
import {
  mockCreateIncomingGoods,
  mockListOrderLineReceiving,
} from '../../src/services/mockIncomingGoodsApi.js'
import {
  mockCreateSupplier,
  mockListSuppliers,
} from '../../src/services/mockSuppliersApi.js'
import { fetchSalesContractLineRows } from '../../src/services/salesContractLines.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'
import {
  DISCOUNTED_PARTIAL_SCENARIO,
  MAIL_ORDER_SCENARIO,
  parseMoney,
} from './_helpers/commerceScenario.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'

describe('commerce E2E chain (mock)', () => {
  beforeEach(() => {
    authenticateTestAdmin()
    resetMockOrdersStore()
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
    resetMockIncomingGoodsStore()
  })

  it('iskontolu sipariş + konfigürasyon — finans ve satır snapshot', async () => {
    const normalized = normalizeCreateOrderRequest(DISCOUNTED_PARTIAL_SCENARIO)
    expect(normalized.subtotalAmount).toBe(20_000)
    expect(normalized.discountAmount).toBe(2000)
    expect(normalized.totalAmount).toBe(18_000)
    expect(normalized.remainingAmount).toBe(13_000)
    expect(normalized.lines[0].lineTotal).toBe(20_000)

    const order = await runWithMockApiTimers(() => createOrder(DISCOUNTED_PARTIAL_SCENARIO))
    const list = await getOrders()
    const dto = list.find((d) => d.id === order.id)
    expect(dto).toBeTruthy()
    expect(parseMoney(dto.subtotalAmount)).toBe(20_000)
    expect(parseMoney(dto.discountAmount)).toBe(2000)
    expect(parseMoney(dto.totalAmount)).toBe(18_000)
    expect(parseMoney(dto.remainingAmount)).toBe(13_000)

    const lines = await getOrderLines(order.id)
    expect(lines[0].unitPrice).toBe(20_000)
    expect(lines[0].lineTotal).toBe(20_000)
    expect(lines[0].configuration?.bodyFabric).toBe('Meşe')
  })

  it('sözleşme — ara toplam, iskonto, kalan ve konfigürasyon satırı', async () => {
    const order = await runWithMockApiTimers(() => createOrder(DISCOUNTED_PARTIAL_SCENARIO))
    const contractLines = await fetchSalesContractLineRows(order.id, order.totalAmount ?? order.amount)
    const model = buildSalesContractModel(order, undefined, contractLines)
    expect(model.finance.subtotal).toBe(20_000)
    expect(model.finance.totalDiscount).toBe(2000)
    expect(model.finance.grandTotal).toBe(18_000)
    expect(model.finance.remaining).toBe(13_000)
    expect(contractLines[0].configurationLines?.length).toBeGreaterThan(0)
    expect(buildSalesContractPdfFilename(order.id)).toContain(order.id)
  })

  it('gelen ürün + sevk politikası + ikinci ödeme', async () => {
    const sup = await mockCreateSupplier({ companyName: 'E2E Tedarik' })
    const order = await runWithMockApiTimers(() => createOrder(DISCOUNTED_PARTIAL_SCENARIO))
    const lineRows = await getOrderLines(order.id)
    const lineId = lineRows[0].id

    await expect(
      postOrderShipment(order.id, {
        plannedDate: '2026-05-20',
        lines: [{ orderLineId: lineId, qty: 1 }],
      }),
    ).rejects.toThrow(/fiziksel/)

    await confirmOrderLineSupplySent(order.id, { lineIds: [lineId], channel: 'WHATSAPP' })

    await mockCreateIncomingGoods({
      supplierId: sup.id,
      receivedAt: order.orderDate,
      productTitle: 'Yemek masası',
      qty: 1,
      unitPurchasePrice: 12_000,
      purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
      orderLineId: lineId,
    })

    const receiving = await mockListOrderLineReceiving(order.id)
    expect(receiving.lines[0].qtyReceived).toBe('1.00')

    const plan = await getShipmentPlanLines(order.id)
    const planLine = plan.find((p) => p.orderLineId === lineId)
    expect(planLine).toBeTruthy()
    expect(Number.parseFloat(planLine.qtyShippable)).toBeGreaterThan(0)

    const { shipment } = await postOrderShipment(order.id, {
      plannedDate: '2026-05-20',
      lines: [{ orderLineId: lineId, qty: 1 }],
    })
    expect(shipment.status).toBe('PLANNED')

    await postOrderPayment(order.id, { amount: 3000, method: PAYMENT_METHOD.TRANSFER })
    const afterPay = (await getOrders()).find((d) => d.id === order.id)
    expect(parseMoney(afterPay.remainingAmount)).toBe(10_000)

    const suppliers = await mockListSuppliers({ q: 'E2E' })
    expect(Number.parseFloat(suppliers[0].openBalance)).toBeGreaterThan(0)
  })

  it('mail order — tedarikçi cari ve tam tahsilat', async () => {
    const sup = await mockCreateSupplier({ companyName: 'MO Tedarik' })
    const body = {
      ...MAIL_ORDER_SCENARIO,
      mailOrderSupplierId: sup.id,
    }
    const order = await runWithMockApiTimers(() => createOrder(body))
    const dto = (await getOrders()).find((d) => d.id === order.id)
    expect(parseMoney(dto.remainingAmount)).toBe(0)
    expect(parseMoney(dto.amountPaid)).toBe(8000)

    const suppliers = await mockListSuppliers({ q: 'MO' })
    expect(Number.parseFloat(suppliers[0].openBalance)).toBeGreaterThan(0)
  })
})
