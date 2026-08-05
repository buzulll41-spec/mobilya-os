import { describe, expect, it } from 'vitest'
import { SHIPMENT_OPERATION_STATUS, nextShipmentOperationStatus } from '../../src/contracts/v1/shipmentStatuses.js'
import {
  getShipmentFlowPresentation,
  shipmentAdvanceButtonLabel,
  shipmentQueueCardStatusLabel,
} from '../../src/mappers/shipment/shipmentOperationUx.js'
import { shipmentStatusLabel } from '../../src/mappers/shipment/shipmentStatusLabel.js'
import { groupShipmentQueue } from '../../src/utils/shipmentQueueGroups.js'

describe('shipment operation UX', () => {
  it('status labels — teknik enum gizli, Türkçe operasyon dili', () => {
    expect(shipmentStatusLabel('PLANNED')).toBe('Sevk planlandı')
    expect(shipmentStatusLabel('LOADED')).toBe('Araç yüklendi')
    expect(shipmentStatusLabel('DISPATCHED')).toBe('Yola çıktı')
    expect(shipmentStatusLabel('DELIVERED')).toBe('Teslim edildi')
    expect(shipmentStatusLabel('INSTALLATION_DONE')).toBe('Montaj tamamlandı')
    expect(shipmentStatusLabel('ISSUE')).toBe('Sorun var')
  })

  it('backend progression — sıra değişmedi', () => {
    expect(nextShipmentOperationStatus('PLANNED')).toBe(SHIPMENT_OPERATION_STATUS.LOADED)
    expect(nextShipmentOperationStatus('LOADED')).toBe(SHIPMENT_OPERATION_STATUS.DISPATCHED)
    expect(nextShipmentOperationStatus('DISPATCHED')).toBe(SHIPMENT_OPERATION_STATUS.DELIVERED)
    expect(nextShipmentOperationStatus('DELIVERED')).toBe(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)
    expect(nextShipmentOperationStatus('INSTALLATION_DONE')).toBeNull()
  })

  it('flow — PLANNED ana buton Yola Çıktı', () => {
    const flow = getShipmentFlowPresentation('PLANNED')
    expect(flow.currentLabel).toBe('Sevk planlandı')
    expect(flow.nextStepLabel).toBe('Yola çıktı')
    expect(flow.primaryAction).toMatchObject({
      status: SHIPMENT_OPERATION_STATUS.DISPATCHED,
      label: 'Yola Çıktı',
    })
    expect(flow.primaryAction?.advanceChain?.length).toBe(2)
    expect(flow.deliveredChoices).toEqual([])
  })

  it('flow — DISPATCHED ana buton Teslim Et', () => {
    const flow = getShipmentFlowPresentation('DISPATCHED')
    expect(flow.nextStepLabel).toBe('Teslim edildi')
    expect(flow.primaryAction).toMatchObject({
      status: SHIPMENT_OPERATION_STATUS.DELIVERED,
      label: 'Teslim Et',
      requiresDeliveryConfirm: true,
    })
    expect(flow.primaryAction?.advanceChain?.length).toBe(1)
  })

  it('flow — LOADED ana buton Yola Çıktı', () => {
    expect(getShipmentFlowPresentation('LOADED').primaryAction?.label).toBe('Yola Çıktı')
  })

  it('flow — DELIVERED’da ana aksiyon montaj', () => {
    const flow = getShipmentFlowPresentation('DELIVERED')
    expect(flow.primaryAction?.status).toBe(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)
    expect(flow.deliveredChoices.map((c) => c.label)).toEqual(['Sorun bildir'])
  })

  it('flow — terminal durumda aksiyon yok', () => {
    const done = getShipmentFlowPresentation('INSTALLATION_DONE')
    expect(done.isTerminal).toBe(true)
    expect(done.primaryAction).toBeNull()

    const issue = getShipmentFlowPresentation('ISSUE')
    expect(issue.isTerminal).toBe(true)
    expect(issue.primaryAction).toBeNull()
  })

  it('advance button labels — sade akış', () => {
    expect(shipmentAdvanceButtonLabel(SHIPMENT_OPERATION_STATUS.DISPATCHED)).toBe('Yola Çıktı')
    expect(shipmentAdvanceButtonLabel(SHIPMENT_OPERATION_STATUS.DELIVERED)).toBe('Teslim Et')
    expect(shipmentAdvanceButtonLabel(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)).toBe(
      'Montaj tamamlandı',
    )
  })

  it('queue card — pre delivery sade etiket', () => {
    expect(shipmentQueueCardStatusLabel('DISPATCHED')).toBe('Sevk planlandı')
    expect(
      shipmentQueueCardStatusLabel('DELIVERED', { installationPending: true }),
    ).toBe('Montaj bekleniyor')
    expect(shipmentQueueCardStatusLabel(null)).toBe('Sevk planlandı')
  })

  it('queue grouping — 3 operasyon grubu', () => {
    const groups = groupShipmentQueue([
      { id: 'A', queueBucket: 'planned', shipmentDate: '2026-05-10' },
      { id: 'B', queueBucket: 'in_transit', shipmentDate: '2026-05-11' },
      { id: 'C', queueBucket: 'delivered', shipmentDate: '2026-05-12' },
    ])
    expect(groups.planned.map((r) => r.id)).toEqual(['A'])
    expect(groups.inTransit.map((r) => r.id)).toEqual(['B'])
    expect(groups.delivered.map((r) => r.id)).toEqual(['C'])
  })

  it('queue grouping — bozuk girdi crash etmez', () => {
    expect(groupShipmentQueue(null)).toEqual({
      planned: [],
      inTransit: [],
      delivered: [],
    })
  })
})
