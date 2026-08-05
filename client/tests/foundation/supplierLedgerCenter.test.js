import { describe, expect, it } from 'vitest'
import {
  supplierLedgerEntryTypeDisplayCode,
  supplierLedgerEntryTypeLabel,
} from '../../src/contracts/v1/supplierLedgerEntryTypes.js'
import {
  buildCustomerRiskSummary,
  buildSupplierLedgerCenterSummary,
  buildSupplierLedgerReports,
  parseRiskAmount,
  riskAmountTone,
} from '../../src/features/supply/supplierLedgerCenterUi.js'
import {
  mockGetSupplierLedgerCenter,
  mockGetSupplierOperations,
} from '../../src/services/mockSupplierOperationsApi.js'
import { getLedgerForSupplier } from '../../src/services/mockSupplierLedgerStore.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../../src/contracts/v1/supplierLedgerEntryTypes.js'
import { ABC_ID } from '../../src/services/mockSupplierRiskDemo.js'
import { parseQty } from '../../src/mappers/receiving/productReadiness.js'

describe('supplier ledger center', () => {
  it('entry type labels match cari merkezi spec', () => {
    expect(supplierLedgerEntryTypeDisplayCode(SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT)).toBe('PURCHASE')
    expect(supplierLedgerEntryTypeDisplayCode(SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT)).toBe('PAYMENT')
    expect(supplierLedgerEntryTypeLabel(SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER)).toBe(
      'Tedarikçiye direkt ödeme',
    )
  })

  it('risk renk bantları FAZ 16C spec', () => {
    expect(riskAmountTone(50_000)).toBe('success')
    expect(riskAmountTone(100_000)).toBe('success')
    expect(riskAmountTone(150_000)).toBe('warning')
    expect(riskAmountTone(300_000)).toBe('warning')
    expect(riskAmountTone(350_000)).toBe('critical')
  })

  it('üst KPI kartları zorunlu 4 alan', async () => {
    const center = await mockGetSupplierLedgerCenter({ sort: 'risk_desc' })
    const summary = buildSupplierLedgerCenterSummary(center.kpis)
    expect(summary).toHaveLength(4)
    expect(summary.map((s) => s.id)).toEqual([
      'total-debt',
      'pending-order-debt',
      'total-risk',
      'upcoming-30',
    ])
  })

  it('mock center returns Mayer risk scenario', async () => {
    const center = await mockGetSupplierLedgerCenter({ sort: 'risk_desc' })

    const mayer = center.suppliers.find((s) => s.companyName.includes('Mayer'))
    expect(mayer).toBeTruthy()

    expect(Number.parseFloat(mayer.totalDebt)).toBeCloseTo(370000, 0)
    expect(Number.parseFloat(mayer.pendingOrderDebt)).toBeCloseTo(112000, 0)
    expect(mayer.pendingProductCount).toBe(4)
    expect(Number.parseFloat(mayer.totalRisk)).toBeCloseTo(482000, 0)

    const mailOrder = getLedgerForSupplier(mayer.id).find(
      (e) => e.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
    )
    if (mailOrder) {
      expect(mailOrder.description).toContain('Mail Order')
    }

    const reports = buildSupplierLedgerReports(center.reports)
    expect(reports.topRisk.length).toBeLessThanOrEqual(10)
    const risks = center.reports.topDebtSuppliers.map((r) => Number.parseFloat(r.amount))
    for (let i = 1; i < risks.length; i += 1) {
      expect(risks[i - 1]).toBeGreaterThanOrEqual(risks[i])
    }
  })

  it('ABC Mobilya bekleyen siparişler ve toplam risk', async () => {
    const center = await mockGetSupplierLedgerCenter({ sort: 'name', activeOnly: false })
    const abc = center.suppliers.find((s) => s.id === ABC_ID)
    expect(abc).toBeTruthy()

    expect(Number.parseFloat(abc.totalDebt)).toBeCloseTo(406900, 0)
    expect(Number.parseFloat(abc.pendingOrderDebt)).toBeCloseTo(176000, 0)
    expect(Number.parseFloat(abc.totalRisk)).toBeCloseTo(582900, 0)
    expect(Number.parseFloat(abc.totalRisk)).toBeCloseTo(
      Number.parseFloat(abc.totalDebt) + Number.parseFloat(abc.pendingOrderDebt),
      0,
    )

    const ops = await mockGetSupplierOperations(ABC_ID)
    expect(ops.openProducts.length).toBeGreaterThanOrEqual(3)

    const africa = ops.openProducts.find((p) => p.customerName === 'AFRİKA')
    expect(africa).toBeTruthy()
    expect(africa.productTitle).toContain('ARTE DUVAR')
    expect(africa.orderNumber).toBe('S-1782076612541')

    /** @type {Map<string, number>} */
    const lineAmounts = new Map()
    for (const p of ops.openProducts) {
      lineAmounts.set(p.orderLineId, parseQty(p.estimatedUnitCost) * parseQty(p.qtyMissing))
    }
    const customerSummary = buildCustomerRiskSummary(ops.openProducts, lineAmounts)
    expect(customerSummary.some((c) => c.customerName === 'AFRİKA')).toBe(true)
    expect(customerSummary.reduce((s, c) => s + c.amount, 0)).toBeCloseTo(176000, 0)

    expect(ops.pendingOrderCount).toBeGreaterThanOrEqual(3)
    expect(ops.openProductCount).toBeGreaterThanOrEqual(3)
  })

  it('tedarikçi ataması gelen ürün kaydı olmadan bekleyen risk sayılır', async () => {
    const { setOrderLinesForSalesOrder } = await import('../../src/services/mockOrderLineStore.js')
    const { upsertMockRiskOrder } = await import('../../src/services/mockApi.js')
    const { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } = await import('../../src/constants/supplyOrderStatus.js')

    upsertMockRiskOrder({
      id: 'S-RISK-NO-IGR',
      customer: 'Test Müşteri',
      product: 'Test Ürün',
      amount: 17000,
      status: 'Üretimde',
      orderDate: '2026-06-10',
      dueDate: '2026-06-30',
      paid: false,
      paidAmount: 0,
    })
    setOrderLinesForSalesOrder('S-RISK-NO-IGR', [
      {
        id: 'ol-risk-no-igr',
        salesOrderId: 'S-RISK-NO-IGR',
        qtyOrdered: '2',
        qtyReceived: '0',
        title: 'Test Ürün Koltuk',
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
        shipmentReady: false,
        supplierId: ABC_ID,
        supplierNameSnapshot: 'ABC Mobilya',
        unitPrice: 8500,
      },
    ])

    const center = await mockGetSupplierLedgerCenter({ sort: 'name', activeOnly: false })
    const abc = center.suppliers.find((s) => s.id === ABC_ID)
    expect(abc).toBeTruthy()
    expect(abc.pendingProductCount).toBeGreaterThanOrEqual(1)
    expect(Number.parseFloat(abc.pendingOrderDebt)).toBeGreaterThan(0)
  })
})
