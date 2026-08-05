import { describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { buildCustomerCommandCenterModel } from '../../src/mappers/order/orderCustomerDrawerModel.js'

describe('buildCustomerCommandCenterModel', () => {
  it('prioritizes overdue balance and resolves command-center summary data', () => {
    const orders = [
      {
        id: 'o-1',
        customer: 'Ayşe Yılmaz',
        orderNumber: 'EV-101',
        amount: 120000,
        paidAmount: 30000,
        status: 'Bekleniyor',
        dueDate: '2026-07-10',
        shipmentDate: '2026-07-11',
        phone: '0532 111 22 33',
        notes: 'Adres: Atatürk Mah. No: 12',
      },
      {
        id: 'o-2',
        customer: 'Ayşe Yılmaz',
        orderNumber: 'EV-102',
        amount: 54000,
        paidAmount: 0,
        status: 'Üretimde',
        dueDate: '2026-07-21',
        shipmentDate: '2026-07-22',
        phone: '0532 111 22 33',
        notes: 'Adres: Barış Mah. No: 7',
      },
    ]

    const dtos = [
      { id: 'o-1', hasOverdueBalance: true, currentRiskSeverity: 'HIGH', remainingAmount: { value: 90000 } },
      { id: 'o-2', hasOverdueBalance: false, currentRiskSeverity: 'LOW', remainingAmount: { value: 54000 } },
    ]

    const domainEvents = [
      { id: 'e-1', aggregateId: 'o-1', type: DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED, occurredAt: '2026-07-01T10:00:00.000Z' },
      { id: 'e-2', aggregateId: 'o-1', type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED, occurredAt: '2026-07-08T10:00:00.000Z' },
      { id: 'e-3', aggregateId: 'o-2', type: DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED, occurredAt: '2026-07-19T10:00:00.000Z' },
    ]

    const model = buildCustomerCommandCenterModel({
      customerName: 'Ayşe Yılmaz',
      orders,
      dtos,
      domainEvents,
      todayIso: '2026-07-20',
    })

    expect(model.stats.activeOrders).toBe(2)
    expect(model.finance.overdue).toBeGreaterThan(0)
    expect(model.aiSignal.label).toContain('Ödemesi gecikti')
    expect(model.lastContact.label).toBe('Arandı')
    expect(model.addresses[0].mapsHref).toContain('google.com/maps')
    expect(model.activeOrders).toHaveLength(2)
  })
})