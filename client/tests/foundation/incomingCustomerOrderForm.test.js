import { describe, expect, it } from 'vitest'
import { INCOMING_GOODS_PURPOSE } from '../../src/contracts/v1/incomingGoodsPurpose.js'
import {
  isSupplierEditableForIncomingPurpose,
  isSupplierLockedForIncomingForm,
  pendingQtyFromLine,
  resolveIncomingFormSupplier,
  resolveSupplierIdForPendingLine,
  resolveSupplierNameForPendingLine,
  SUPPLIER_LOCKED_HINT,
} from '../../src/features/supply/incomingCustomerOrderForm.js'

describe('incomingCustomerOrderForm', () => {
  const suppliers = [
    { id: 'sup-1', companyName: 'Mobilya A.Ş.', isActive: true },
    { id: 'sup-2', companyName: 'Diğer', isActive: true },
  ]

  const pendingLine = {
    orderLineId: 'l1',
    salesOrderId: 'S-1',
    orderNumber: 'S-1',
    customerName: 'Aykut Elmas',
    productTitle: 'Masa',
    qtyOrdered: '2',
    qtyReceived: '0',
    qtyPending: '2.00',
    supplierId: 'sup-1',
    supplierName: 'Mobilya A.Ş.',
  }

  it('satır seçilince tedarikçi otomatik dolar', () => {
    expect(resolveSupplierIdForPendingLine(pendingLine, suppliers)).toBe('sup-1')
    expect(resolveSupplierNameForPendingLine(pendingLine, suppliers)).toBe('Mobilya A.Ş.')
  })

  it('müşteri siparişi seçiliyken tedarikçi kilitlenir', () => {
    expect(
      isSupplierLockedForIncomingForm(INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER, pendingLine),
    ).toBe(true)
    expect(isSupplierEditableForIncomingPurpose(INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER)).toBe(false)
    expect(isSupplierEditableForIncomingPurpose(INCOMING_GOODS_PURPOSE.STOCK)).toBe(true)
    expect(isSupplierEditableForIncomingPurpose(INCOMING_GOODS_PURPOSE.DISPLAY)).toBe(true)
    expect(SUPPLIER_LOCKED_HINT).toContain('otomatik')
  })

  it('kilitli formda manuel tedarikçi yok sayılır', () => {
    expect(
      resolveIncomingFormSupplier(pendingLine, INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER, suppliers, 'sup-2'),
    ).toBe('sup-1')
  })

  it('stok amacında manuel tedarikçi kullanılır', () => {
    expect(
      resolveIncomingFormSupplier(null, INCOMING_GOODS_PURPOSE.STOCK, suppliers, 'sup-2'),
    ).toBe('sup-2')
  })

  it('kalan miktarı qtyPending alanından okur', () => {
    expect(
      pendingQtyFromLine({
        orderLineId: 'l1',
        salesOrderId: 'S-1',
        orderNumber: 'S-1',
        customerName: 'Aykut Elmas',
        productTitle: 'Masa',
        qtyOrdered: '2',
        qtyReceived: '1',
        qtyPending: '1.00',
      }),
    ).toBe(1)
  })
})
