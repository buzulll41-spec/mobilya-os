import { describe, expect, it } from 'vitest'
import {
  buildSupplyMailContent,
  buildSupplyOrderLineDetail,
  buildSupplyWhatsAppMessage,
  formatSupplyLineBlock,
} from '../../src/mappers/supply/supplyOrderMessages.js'
import { buildShipmentLabel } from '../../src/features/orders/ordersOpsCenterUi.js'
import { ORDER_SHIPMENT_DISPLAY } from '../../src/lib/orderShipmentDisplayStatus.js'
import {
  canPostOrderPayment,
  canViewOrderPayments,
} from '../../src/constants/orderDrawerPermissions.js'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import { SHIPMENT_DELIVERY_TYPE } from '../../src/constants/shipmentDeliveryTypes.js'
import { buildInitialPlanFromAgendaItem } from '../../src/mappers/shipment-ops/shipmentOpsAgendaViewModel.js'

describe('supply order messages', () => {
  it('ürün detaylarını mesajda gösterir', () => {
    const line = buildSupplyOrderLineDetail(
      {
        id: 'l1',
        salesOrderId: 'S-1',
        title: 'ARTE DUVAR ÜNİTESİ',
        productId: null,
        productGroup: 'tv_unit',
        qtyOrdered: '1',
        qtyReceived: '0',
        configuration: {
          bodyColor: 'Antrasit',
          doorColor: 'Meşe',
          dimensions: '220x45',
          note: 'TV boşluğu solda',
        },
      },
      'Montaj cumartesi',
    )

    const block = formatSupplyLineBlock(line)
    expect(block).toContain('ARTE DUVAR ÜNİTESİ')
    expect(block).toContain('Antrasit')
    expect(block).toContain('220x45')
    expect(block).toContain('Montaj cumartesi')

    const mail = buildSupplyMailContent('ALMANYA', [line])
    expect(mail.body).toContain('Renk: Antrasit')
    expect(mail.body).toContain('220x45')

    const wa = buildSupplyWhatsAppMessage('ALMANYA', [line])
    expect(wa).toContain('ARTE DUVAR ÜNİTESİ')
  })

  it('kumaşlı ürün alanlarını doldurur', () => {
    const line = buildSupplyOrderLineDetail(
      {
        id: 'l2',
        salesOrderId: 'S-1',
        title: 'MAYER KÖŞE TAKIMI',
        productId: null,
        productGroup: 'fabric',
        qtyOrdered: '1',
        qtyReceived: '0',
        configuration: {
          fabricBrand: 'Boss',
          bodyFabric: 'Boss 1204',
          legColor: 'Siyah',
          cornerDirection: 'Sağ köşe',
          note: 'Kırlent dahil',
        },
      },
      '',
    )

    const mail = buildSupplyMailContent('ALMANYA', [line])
    expect(mail.body).toContain('Boss')
    expect(mail.body).toContain('Boss 1204')
    expect(mail.body).toContain('Siyah')
    expect(mail.body).toContain('Sağ köşe')
    expect(mail.body).toContain('Kırlent dahil')
  })
})

describe('buildShipmentLabel', () => {
  it('displayStatus ile Sevk kolonunu senkronlar', () => {
    /** @type {import('../../src/contracts/v1/orderListRowVm.js').OrderListRowVM} */
    const row = {
      id: 'S-1',
      orderNumber: 'S-1',
      customer: 'Test',
      product: 'Ürün',
      status: ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED,
      amount: 1000,
      orderDate: '2026-05-01',
    }
    const dto = { displayStatus: ORDER_SHIPMENT_DISPLAY.SHIPMENT_PLANNED }
    expect(buildShipmentLabel(row, dto)).toBe('Planlandı')

    expect(
      buildShipmentLabel(row, { displayStatus: ORDER_SHIPMENT_DISPLAY.DISPATCHED }),
    ).toBe('Yolda')
    expect(
      buildShipmentLabel(row, {
        displayStatus: ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM,
      }),
    ).toBe('Onay Bekliyor')
    expect(
      buildShipmentLabel(row, { displayStatus: ORDER_SHIPMENT_DISPLAY.DELIVERED }),
    ).toBe('Teslim')
  })
})

describe('order payment drawer RBAC', () => {
  it('Sales ve Operation tahsilat girebilir; Service giremez', () => {
    expect(canViewOrderPayments(USER_ROLE.SALES)).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.SALES)).toBe(true)
    expect(canViewOrderPayments(USER_ROLE.OPERATION)).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.OPERATION)).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.ADMIN)).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.FINANCE)).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.SERVICE)).toBe(false)
  })
})

describe('SSH shipment plan', () => {
  it('eksik parça sevki deliveryType taşır', () => {
    const plan = buildInitialPlanFromAgendaItem(
      {
        id: 'o1-2026-05-14',
        orderId: 'o1',
        shipmentId: 'o1',
        customer: 'Müşteri',
        product: 'Ürün',
        statusLabel: 'Planlandı',
        statusTone: 'neutral',
        amount: 1000,
        remaining: 500,
        riskLabel: 'Normal',
        dateIso: '2026-05-14',
        orderNumber: 'ALMANYA',
        timeLabel: '10:00',
        region: 'Kadıköy',
        vehicleLabel: 'Araç',
        crewLabel: 'Ekip',
      },
      {
        orderId: 'o1',
        plannedDate: '2026-05-14',
        plannedTime: '10:00',
        region: 'Kadıköy',
        vehicle: 'Araç 1',
        crew1: 'Ali',
        crew2: '',
        note: 'KIRILEN EKSİK ÇIKTI',
        deliveryType: SHIPMENT_DELIVERY_TYPE.MISSING_PART_DELIVERY,
        missingItemId: 'mi-1',
        missingItemTitle: 'KIRILEN EKSİK ÇIKTI',
        updatedAt: new Date().toISOString(),
      },
      undefined,
    )

    expect(plan.deliveryType).toBe(SHIPMENT_DELIVERY_TYPE.MISSING_PART_DELIVERY)
    expect(plan.missingItemId).toBe('mi-1')
    expect(plan.missingItemTitle).toBe('KIRILEN EKSİK ÇIKTI')
  })
})
