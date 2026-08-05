import { describe, expect, it } from 'vitest'
import { SHIPMENT_OPERATION_STATUS } from '../../src/contracts/v1/shipmentStatuses.js'
import {
  buildShipmentAdvanceChain,
  buildSimplifiedShipmentStepperSteps,
  isPreDeliveryShipmentStatus,
  orderNeedsInstallation,
  simplifiedShipmentStatusLabel,
  shipmentTimelineTransitionDetail,
} from '../../src/mappers/shipment/shipmentSimplifiedFlow.js'
import { getShipmentFlowPresentation } from '../../src/mappers/shipment/shipmentOperationUx.js'

describe('shipment simplified flow', () => {
  it('PLANNED ana CTA → DISPATCHED (adım adım ilerleme)', () => {
    const flow = getShipmentFlowPresentation('PLANNED')
    expect(flow.primaryAction?.label).toBe('Yola Çıktı')
    expect(flow.primaryAction?.advanceChain).toEqual([
      SHIPMENT_OPERATION_STATUS.LOADED,
      SHIPMENT_OPERATION_STATUS.DISPATCHED,
    ])
  })

  it('LOADED/DISPATCHED kayıtları crash vermez — stepper 3 kutu', () => {
    const steps = buildSimplifiedShipmentStepperSteps('DISPATCHED', {
      PLANNED: '2026-05-01T10:00:00.000Z',
      LOADED: '2026-05-01T11:00:00.000Z',
      DISPATCHED: '2026-05-01T12:00:00.000Z',
    })
    expect(steps).toHaveLength(3)
    expect(steps[0].label).toBe('Sevk planlandı')
    expect(steps[0].state).toBe('active')
    expect(steps[0].subHint).toBe('Yolda / hazırlık süreci')
  })

  it('DELIVERED → Montaj tamamlandı', () => {
    const flow = getShipmentFlowPresentation('DELIVERED')
    expect(flow.primaryAction?.status).toBe(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)
    expect(flow.primaryAction?.label).toBe('Montaj tamamlandı')
  })

  it('INSTALLATION_DONE işlem kapalı', () => {
    const flow = getShipmentFlowPresentation('INSTALLATION_DONE')
    expect(flow.isTerminal).toBe(true)
    expect(flow.primaryAction).toBeNull()
  })

  it('montaj gerekmeyen — teslim sonrası terminal', () => {
    const flow = getShipmentFlowPresentation('DELIVERED', {
      listItemDto: { operationalState: { installationState: 'NOT_REQUIRED' } },
    })
    expect(flow.isTerminal).toBe(true)
    expect(flow.primaryAction).toBeNull()
    const steps = buildSimplifiedShipmentStepperSteps('DELIVERED', {}, {
      needsInstallation: false,
    })
    expect(steps).toHaveLength(2)
  })

  it('buildShipmentAdvanceChain LOADED → DELIVERED', () => {
    expect(buildShipmentAdvanceChain('LOADED', SHIPMENT_OPERATION_STATUS.DELIVERED)).toEqual([
      SHIPMENT_OPERATION_STATUS.DISPATCHED,
      SHIPMENT_OPERATION_STATUS.DELIVERED,
    ])
  })

  it('timeline ara adımlar pasif özet', () => {
    expect(
      shipmentTimelineTransitionDetail(
        SHIPMENT_OPERATION_STATUS.LOADED,
        SHIPMENT_OPERATION_STATUS.DISPATCHED,
      ),
    ).toBe('Yolda / hazırlık süreci')
  })

  it('simplified label — pre delivery tek etiket', () => {
    expect(simplifiedShipmentStatusLabel('DISPATCHED')).toBe('Sevk planlandı')
    expect(isPreDeliveryShipmentStatus('PLANNED')).toBe(true)
    expect(orderNeedsInstallation({ operationalState: { installationState: 'NOT_REQUIRED' } })).toBe(
      false,
    )
  })
})
