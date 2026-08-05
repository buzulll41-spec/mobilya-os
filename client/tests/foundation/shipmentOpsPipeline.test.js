import { describe, expect, it } from 'vitest'
import {
  groupShipmentOpsPipeline,
  resolveShipmentPipelineColumn,
  SHIPMENT_OPS_PIPELINE_COLUMNS,
} from '../../src/mappers/shipment/shipmentOpsPipeline.js'
import { buildShipmentOpsKpis } from '../../src/mappers/shipment/shipmentOpsViewModel.js'
import { normalizePageId } from '../../src/constants/navigation.js'

/** @returns {import('../../src/contracts/v1/shipmentRowVm.js').ShipmentRowVM} */
function row(overrides) {
  return {
    id: 'S-1',
    customer: 'Test',
    product: 'Ürün',
    status: 'Hazır',
    amount: 1000,
    orderDate: '2026-05-14',
    ...overrides,
  }
}

describe('shipment ops pipeline', () => {
  it('6 kolon tanımlı', () => {
    expect(SHIPMENT_OPS_PIPELINE_COLUMNS).toHaveLength(6)
    expect(SHIPMENT_OPS_PIPELINE_COLUMNS.map((c) => c.label)).toEqual([
      'Planlandı',
      'Hazırlanıyor',
      'Yolda',
      'Teslim',
      'Montaj',
      'Sorunlu',
    ])
  })

  it('DISPATCHED yolda kolonuna düşer', () => {
    expect(
      resolveShipmentPipelineColumn(row({ shipmentStatus: 'DISPATCHED', shipmentId: 'SH-1' })),
    ).toBe('in_transit')
  })

  it('DELIVERED + installationPending montaj kolonuna düşer', () => {
    expect(
      resolveShipmentPipelineColumn(
        row({
          shipmentStatus: 'DELIVERED',
          installationPending: true,
          shipmentId: 'SH-2',
        }),
      ),
    ).toBe('installation')
  })

  it('hasShipmentIssue sorunlu kolonuna düşer', () => {
    expect(
      resolveShipmentPipelineColumn(row({ hasShipmentIssue: true, shipmentStatus: 'PLANNED' })),
    ).toBe('issue')
  })

  it('INSTALLATION_DONE listede gösterilmez', () => {
    expect(
      resolveShipmentPipelineColumn(row({ shipmentStatus: 'INSTALLATION_DONE', shipmentId: 'SH-3' })),
    ).toBeNull()
  })

  it('groupShipmentOpsPipeline kartları kolonlara ayırır', () => {
    const groups = groupShipmentOpsPipeline([
      row({ shipmentStatus: 'PLANNED', shipmentId: 'A' }),
      row({ shipmentStatus: 'DISPATCHED', shipmentId: 'B', id: 'S-2' }),
    ])
    expect(groups.planned).toHaveLength(1)
    expect(groups.in_transit).toHaveLength(1)
  })

  it('KPI bugün planlanan sayar', () => {
    const kpis = buildShipmentOpsKpis(
      [
        row({
          shipmentStatus: 'PLANNED',
          plannedShipDate: '2026-05-14',
          shipmentId: 'X',
        }),
      ],
      '2026-05-14',
    )
    expect(kpis.find((k) => k.id === 'today')?.value).toBe('1')
  })
})

describe('navigation normalizePageId', () => {
  it('eski sevk rotalarını birleştirir', () => {
    expect(normalizePageId('shipment')).toBe('shipment-ops')
    expect(normalizePageId('shipment-calendar')).toBe('shipment-ops')
    expect(normalizePageId('shipment-ops')).toBe('shipment-ops')
  })
})
