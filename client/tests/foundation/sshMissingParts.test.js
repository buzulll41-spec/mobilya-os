import { describe, expect, it } from 'vitest'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { buildRiskDrawerModel } from '../../src/mappers/risk/riskDrawerUi.js'
import { buildNextAction } from '../../src/mappers/order/orderCommandCenterModel.js'
import {
  buildSshMissingPartCard,
  buildSshMissingPartsQueue,
  sshMissingItemStatusLabelTr,
} from '../../src/mappers/ssh/sshMissingPartsModel.js'
import { buildOperationalAlarms } from '../../src/utils/operationalAlarms.js'

const order = {
  id: 'S-24105',
  customer: 'Ayşe Yılmaz',
  product: 'Gardırop',
  status: 'Üretimde',
  amount: 80_000,
  paid: false,
  paidAmount: 20_000,
  orderDate: '2026-05-01',
  dueDate: '2026-06-01',
}

const missingItem = {
  id: 'OMI-1',
  orderId: 'S-24105',
  lineId: null,
  title: 'Gardırop arka panel',
  quantity: '1.00',
  reason: 'Fabrika eksik',
  status: MISSING_ITEM_STATUS.OPEN,
  supplierNote: 'Tedarikçi 5 iş günü',
  createdAt: '2026-05-10T10:00:00.000Z',
  resolvedAt: null,
}

describe('SSH eksik parça ayrımı', () => {
  it('SSH durum etiketleri Türkçe operasyon dili kullanır', () => {
    expect(sshMissingItemStatusLabelTr(MISSING_ITEM_STATUS.OPEN)).toBe('Bekleniyor')
    expect(sshMissingItemStatusLabelTr(MISSING_ITEM_STATUS.ARRIVED)).toBe('Parça geldi')
    expect(sshMissingItemStatusLabelTr(MISSING_ITEM_STATUS.READY_FOR_SHIPMENT)).toBe('Sevke hazır')
    expect(sshMissingItemStatusLabelTr(MISSING_ITEM_STATUS.RESOLVED)).toBe('Tamamlandı')
  })

  it('kart modeli sevk kilidi ve tahmini geliş içerir', () => {
    const card = buildSshMissingPartCard(missingItem, order, { orderNumber: 'S-2025-0162' }, '2026-05-14')
    expect(card.locksShipment).toBe(true)
    expect(card.partTitle).toBe('Gardırop arka panel')
    expect(card.riskLabel).toContain('kilit')
  })

  it('kuyruk mock kayıtlarından üretilir', () => {
    const cards = buildSshMissingPartsQueue({
      orders: [order],
      listItemDtos: [{ id: 'S-24105', openMissingItemsCount: 1, orderNumber: 'S-2025-0162' }],
      missingItems: [missingItem],
      todayIso: '2026-05-14',
    })
    expect(cards).toHaveLength(1)
    expect(cards[0].customer).toBe('Ayşe Yılmaz')
  })

  it('sonraki aksiyon: eksik varken SSH, yokken sevk planı', () => {
    const risk = buildRiskDrawerModel(undefined, order, '2026-05-14')
    const withMissing = buildNextAction(
      order,
      { openMissingItemsCount: 2, shipmentSummaryOpenCount: 0, inTransitShipmentCount: 0 },
      10_000,
      risk,
    )
    expect(withMissing.action).toBe('tab')
    expect(withMissing.tabTarget).toBe('ssh')
    expect(withMissing.ctaLabel).toMatch(/SSH/i)

    const noMissing = buildNextAction(
      { ...order, shipmentDate: undefined },
      { openMissingItemsCount: 0, shipmentSummaryOpenCount: 0, inTransitShipmentCount: 0 },
      10_000,
      risk,
    )
    expect(noMissing.title).toMatch(/Sevk planı/i)
    expect(noMissing.action).toBe('shipment')
  })

  it('risk merkezi eksik parçayı SSH alarmı olarak listeler', () => {
    const alarms = buildOperationalAlarms(
      [order],
      [{ id: 'S-24105', openMissingItemsCount: 2 }],
      '2026-05-14',
    )
    const sshAlarm = alarms.find((a) => a.category === 'ssh')
    expect(sshAlarm?.title).toBe('Eksik Parça')
    expect(sshAlarm?.detail).toMatch(/SSH takibi/)
  })
})
