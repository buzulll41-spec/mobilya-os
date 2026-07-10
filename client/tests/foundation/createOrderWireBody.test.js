import { describe, expect, it } from 'vitest'
import { toCreateOrderWireBody } from '../../src/services/createOrderWireBody.js'

describe('toCreateOrderWireBody', () => {
  it('yalnızca backend schema alanlarını gönderir', () => {
    const wire = toCreateOrderWireBody({
      customerName: 'Test Müşteri',
      productTitle: 'Dolap',
      totalAmount: 13_000,
      paidAmount: 2000,
      status: 'Bekleniyor',
      phone: '0532',
      phone2: '0212',
      nationalId: '12345678901',
      taxNumber: '123',
      taxOffice: 'Kadıköy',
      notes: 'Adres: İzmir',
      salesPerson: 'Ali',
      dueDate: '2026-06-01',
      cost: 5000,
      lines: [
        {
          title: 'Dolap',
          quantity: 2,
          unitPrice: 5000,
          productGroup: 'Yatak odası',
          sortOrder: 0,
          lineNote: 'Antrasit',
        },
      ],
    })

    expect(wire).toEqual({
      customerName: 'Test Müşteri',
      productTitle: 'Dolap',
      totalAmount: 13_000,
      paidAmount: 2000,
      status: 'Bekleniyor',
      lines: [
        {
          title: 'Dolap',
          quantity: 2,
          unitPrice: 5000,
          productGroup: 'Yatak odası',
          sortOrder: 0,
        },
      ],
    })
    expect(wire).not.toHaveProperty('phone2')
    expect(wire.lines[0]).not.toHaveProperty('lineNote')
  })
})
