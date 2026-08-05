import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import {
  buildOperationMapBoard,
  buildOperationMapHubCounts,
  COLLECTION_FLOW_COLUMNS,
  ORDER_FLOW_COLUMNS,
  resolveCollectionFlowColumn,
  resolveOrderFlowColumn,
  resolveShipmentFlowColumn,
  resolveSupplyFlowColumn,
  SHIPMENT_FLOW_COLUMNS,
  SUPPLY_FLOW_COLUMNS,
} from '../../src/mappers/operation-map/operationMapModel.js'

function seedDtos() {
  return initialOrders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
}

describe('operation map model (FAZ 19A)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  const dtos = seedDtos()

  it('hub sayıları aktif siparişlerden türetilir', () => {
    const counts = buildOperationMapHubCounts(orders, dtos)
    expect(counts.order).toBe(orders.length)
    expect(typeof counts.shipment).toBe('number')
    expect(typeof counts.collection).toBe('number')
    expect(typeof counts.supply).toBe('number')
  })

  it('sipariş akışı — kart alanları dolu ve kolonlara dağılır', () => {
    const board = buildOperationMapBoard(orders, dtos, 'order', DEMO_TODAY)
    expect(board.columns).toEqual(ORDER_FLOW_COLUMNS)

    const allCards = Object.values(board.grouped).flat()
    expect(allCards.length).toBeGreaterThan(0)

    for (const card of allCards) {
      expect(card.customer).toBeTruthy()
      expect(card.orderNo).toBeTruthy()
      expect(card.totalLabel).toMatch(/₺/)
      expect(card.remainingLabel).toMatch(/₺/)
      expect(card.supplyStatusLabel).toBeTruthy()
      expect(card.shipmentStatusLabel).toBeTruthy()
      expect(card.riskLabel).toBeTruthy()
      expect(board.grouped[card.columnId]).toContainEqual(
        expect.objectContaining({ orderId: card.orderId }),
      )
    }
  })

  it('sevk, tahsilat ve tedarik panoları kolon tanımlarıyla oluşur', () => {
    const shipment = buildOperationMapBoard(orders, dtos, 'shipment', DEMO_TODAY)
    const collection = buildOperationMapBoard(orders, dtos, 'collection', DEMO_TODAY)
    const supply = buildOperationMapBoard(orders, dtos, 'supply', DEMO_TODAY)

    expect(shipment.columns).toEqual(SHIPMENT_FLOW_COLUMNS)
    expect(collection.columns).toEqual(COLLECTION_FLOW_COLUMNS)
    expect(supply.columns).toEqual(SUPPLY_FLOW_COLUMNS)

    const totalCards =
      Object.values(shipment.grouped).flat().length +
      Object.values(collection.grouped).flat().length +
      Object.values(supply.grouped).flat().length
    expect(totalCards).toBeGreaterThan(0)
  })

  it('kolon eşlemesi — teslim + bakiye kalan tahsilat', () => {
    /** @type {import('../../src/data/seedOrders.js').Order} */
    const order = {
      id: 'S-OPMAP-REM',
      customer: 'Kalan Bakiye Müşteri',
      product: 'Koltuk',
      status: 'Teslim Edildi',
      amount: 50_000,
      paidAmount: 20_000,
      orderDate: DEMO_TODAY,
    }
    const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
    expect(resolveOrderFlowColumn(order, dto)).toBe('remaining_collection')
    expect(resolveCollectionFlowColumn(order, dto)).toBe('remaining_balance')
  })

  it('kolon eşlemesi — ödeme yok / kapora ayrımı', () => {
    /** @type {import('../../src/data/seedOrders.js').Order} */
    const unpaid = {
      id: 'S-OPMAP-NOPAY',
      customer: 'Ödemesiz',
      product: 'Masa',
      status: 'Üretimde',
      amount: 30_000,
      paidAmount: 0,
      orderDate: DEMO_TODAY,
    }
    /** @type {import('../../src/data/seedOrders.js').Order} */
    const withDeposit = {
      id: 'S-OPMAP-DEP',
      customer: 'Kaporalı',
      product: 'Sehpa',
      status: 'Üretimde',
      amount: 40_000,
      paidAmount: 10_000,
      orderDate: DEMO_TODAY,
    }
    const unpaidDto = projectLegacyOrderToListItemDto(unpaid, DEMO_TODAY)
    const depositDto = projectLegacyOrderToListItemDto(withDeposit, DEMO_TODAY)
    expect(resolveCollectionFlowColumn(unpaid, unpaidDto)).toBe('no_payment')
    expect(resolveCollectionFlowColumn(withDeposit, depositDto)).toBe('deposit_received')
  })

  it('kolon eşlemesi — iptal siparişler panolara dahil edilmez', () => {
    /** @type {import('../../src/data/seedOrders.js').Order} */
    const cancelled = {
      id: 'S-OPMAP-CANCEL',
      customer: 'İptal',
      product: 'X',
      status: 'İptal',
      amount: 1_000,
      orderDate: DEMO_TODAY,
    }
    const board = buildOperationMapBoard([...orders, cancelled], dtos, 'order', DEMO_TODAY)
    const ids = Object.values(board.grouped)
      .flat()
      .map((c) => c.orderId)
    expect(ids).not.toContain(cancelled.id)
  })

  it('kolon eşlemesi — tedarik kapalı teslim edilmiş siparişler', () => {
    const delivered = orders.filter((o) => o.status === 'Teslim Edildi')
    for (const o of delivered) {
      const dto = dtos.find((d) => d.id === o.id)
      expect(resolveSupplyFlowColumn(o, dto)).toBe('closed')
    }
  })

  it('kolon eşlemesi — sevk planlanacak varsayılan', () => {
    const fresh = orders.find(
      (o) =>
        o.status !== 'Teslim Edildi' &&
        !['Sevke Hazır', 'Planlandı', 'Hazır'].includes(o.status ?? ''),
    )
    if (fresh) {
      const dto = dtos.find((d) => d.id === fresh.id)
      const col = resolveShipmentFlowColumn(fresh, dto)
      expect(SHIPMENT_FLOW_COLUMNS.some((c) => c.id === col)).toBe(true)
    }
  })
})
