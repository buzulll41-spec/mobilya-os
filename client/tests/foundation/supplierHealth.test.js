import { describe, expect, it } from 'vitest'
import {
  SUPPLIER_HEALTH_STATUS,
  computeSupplierHealth,
} from '../../src/mappers/supply/supplierHealth.js'
import {
  buildSupplierLinkage,
  filterOpenProductsForSupplier,
} from '../../src/mappers/supply/supplierOperationsCore.js'

describe('supplierHealth (client)', () => {
  it('kritik ve riskli ayrımı mock ile uyumlu', () => {
    expect(
      computeSupplierHealth({
        isActive: true,
        openBalance: 200_000,
        openProductCount: 0,
        pendingOrderCount: 0,
        missingQtyTotal: 0,
        pendingQtyTotal: 0,
        hasOverdueDelivery: false,
        daysSinceLastMovement: 0,
        daysSinceLastPayment: 0,
      }).status,
    ).toBe(SUPPLIER_HEALTH_STATUS.CRITICAL)

    expect(
      computeSupplierHealth({
        isActive: true,
        openBalance: 1000,
        openProductCount: 1,
        pendingOrderCount: 1,
        missingQtyTotal: 3,
        pendingQtyTotal: 4,
        hasOverdueDelivery: false,
        daysSinceLastMovement: 60,
        daysSinceLastPayment: 60,
      }).status,
    ).toBe(SUPPLIER_HEALTH_STATUS.RISKY)
  })
})

describe('supplierOperationsCore', () => {
  it('açık ürün ve eksik adet hesabı', () => {
    const linkage = buildSupplierLinkage([
      { orderLineId: 'l1', salesOrderId: 'o1' },
    ])
    const pending = [
      {
        orderLineId: 'l1',
        salesOrderId: 'o1',
        orderNumber: 'o1',
        customerName: 'Ali',
        productTitle: 'Köşe',
        qtyOrdered: 6,
        qtyReceived: 2,
        supplierId: null,
        orderDate: '2026-05-01',
        estimatedUnitCost: 15000,
        dueDate: '2026-05-28',
      },
    ]
    const ops = filterOpenProductsForSupplier(pending, linkage, '2026-05-14')
    expect(ops.openProductCount).toBe(1)
    expect(ops.openProducts[0].qtyMissing).toBe('4.00')
    expect(ops.pendingOrders).toHaveLength(1)
  })

  it('tedarikçi ataması gelen ürün kaydı olmadan bekleyen sayılır', () => {
    const linkage = buildSupplierLinkage([])
    const pending = [
      {
        orderLineId: 'l2',
        salesOrderId: 'o2',
        orderNumber: 'S-999',
        customerName: 'Veli',
        productTitle: 'Berjer',
        qtyOrdered: 2,
        qtyReceived: 0,
        supplierId: 'sup-abc',
        orderDate: '2026-06-01',
        estimatedUnitCost: 8500,
        dueDate: '2026-06-20',
      },
    ]
    const ops = filterOpenProductsForSupplier(pending, linkage, '2026-05-14', 'sup-abc')
    expect(ops.openProductCount).toBe(1)
    expect(ops.openProducts[0].estimatedUnitCost).toBe('8500.00')
    expect(Number.parseFloat(ops.openProducts[0].qtyMissing)).toBe(2)
  })
})
