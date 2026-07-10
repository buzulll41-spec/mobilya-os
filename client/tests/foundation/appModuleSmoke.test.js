import { describe, expect, it } from 'vitest'
import OperationStatusFlow from '../../src/features/orders/command/OperationStatusFlow.jsx'
import { ORDER_PANEL_SECTIONS } from '../../src/mappers/order/orderOperationPanelModel.js'

describe('app module smoke', () => {
  it('OperationStatusFlow default export yüklenir', () => {
    expect(typeof OperationStatusFlow).toBe('function')
  })

  it('sipariş panel sekmeleri tanımlı', () => {
    expect(ORDER_PANEL_SECTIONS.length).toBeGreaterThan(0)
  })
})
