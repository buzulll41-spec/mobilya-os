import { describe, expect, it } from 'vitest'
import { buildShipmentDeliveryProductsViewModel } from '../../src/mappers/shipment-ops/shipmentPlanningCenterModel.js'

describe('Sevk planlama teslim ürünleri', () => {
  it('sipariş satır snapshotından ürün adı ve adet listeler', () => {
    const vm = buildShipmentDeliveryProductsViewModel(
      [
        {
          id: 'OL-1',
          title: 'Roma Koltuk Takımı',
          productTitleSnapshot: 'ROMA KOLTUK TAKIMI',
          qtyOrdered: '1',
        },
        {
          id: 'OL-2',
          title: 'Orta Sehpa',
          productTitleSnapshot: 'ORTA SEHPA',
          qtyOrdered: '1',
        },
        {
          id: 'OL-3',
          title: 'Tv Ünitesi',
          productTitleSnapshot: 'TV ÜNİTESİ',
          qtyOrdered: '1',
        },
      ],
      null,
    )

    expect(vm.lines).toHaveLength(3)
    expect(vm.lines[0].displayLabel).toBe('ROMA KOLTUK TAKIMI (1)')
    expect(vm.lines[1].displayLabel).toBe('ORTA SEHPA (1)')
    expect(vm.lines[2].displayLabel).toBe('TV ÜNİTESİ (1)')
    expect(vm.totalQuantity).toBe(3)
  })

  it('satır yoksa lineSummaryTitle özetinden üretir', () => {
    const vm = buildShipmentDeliveryProductsViewModel(null, 'LINEA × 2 · NOVA × 1')
    expect(vm.lines).toHaveLength(2)
    expect(vm.lines[0].displayLabel).toBe('LINEA (2)')
    expect(vm.totalQuantity).toBe(3)
  })
})
