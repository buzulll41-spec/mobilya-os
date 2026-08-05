import { describe, expect, it } from 'vitest'
import { projectOperationalTasksFromReadModels } from '../../src/mappers/tasks/projectOperationalTasks.js'
import { computeDashboardKpis } from '../../src/data/dashboardHelpers.js'
import { buildStoreOperationChecklist } from '../../src/mappers/operations/buildStoreOperationChecklist.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'

describe('projectOperationalTasks', () => {
  const todayIso = '2026-05-14'

  const baseDto = {
    id: 'S-TASK-1',
    orderNumber: 'S-TASK-1',
    customerDisplayName: 'Test Müşteri',
    placedAt: '2026-05-14T10:00:00.000Z',
    totalAmount: { amount: '18000.00', currency: 'TRY' },
    amountPaid: { amount: '5000.00', currency: 'TRY' },
    amountDue: { amount: '13000.00', currency: 'TRY' },
    remainingAmount: { amount: '13000.00', currency: 'TRY' },
    displayStatus: 'Üretimde',
    currentRiskSeverity: 'NONE',
    openMissingItemsCount: 0,
    shipmentSummaryOpenCount: 0,
    inTransitShipmentCount: 0,
    partiallyShipped: false,
    hasOverdueBalance: false,
  }

  it('tahsilat ve sözleşme görevleri üretir', () => {
    const tasks = projectOperationalTasksFromReadModels({
      dtos: [baseDto],
      events: [],
      todayIso,
    })
    expect(tasks.some((t) => t.title === 'Tahsilat bekleniyor')).toBe(true)
    expect(tasks.some((t) => t.title === 'Sözleşme yazdırılmadı')).toBe(true)
    expect(tasks[0].customerName).toBe('Test Müşteri')
    expect(tasks[0].suggestedAction).toBeTruthy()
  })

  it('açık SSH görevi critical', () => {
    const tasks = projectOperationalTasksFromReadModels({
      dtos: [{ ...baseDto, openMissingItemsCount: 2 }],
      events: [],
      todayIso,
    })
    const ssh = tasks.find((t) => t.title === 'Açık SSH var')
    expect(ssh?.severity).toBe('critical')
  })

  it('sözleşme yazdırıldıysa görev üretmez', () => {
    const tasks = projectOperationalTasksFromReadModels({
      dtos: [baseDto],
      events: [
        {
          id: 'E1',
          type: DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED,
          aggregateId: 'S-TASK-1',
          aggregateType: 'SalesOrder',
          occurredAt: '2026-05-14T11:00:00.000Z',
          correlationId: 'c1',
          payloadSchemaVersion: '1',
          payload: {},
        },
      ],
      todayIso,
    })
    expect(tasks.some((t) => t.title === 'Sözleşme yazdırılmadı')).toBe(false)
  })
})

describe('computeDashboardKpis — gerçek satış', () => {
  it('bugünkü sipariş toplamını DTO placedAt üzerinden hesaplar', () => {
    const kpis = computeDashboardKpis(
      [],
      [
        {
          id: 'S-1',
          placedAt: '2026-05-14T10:00:00.000Z',
          totalAmount: { amount: '50000.00', currency: 'TRY' },
          amountDue: { amount: '0.00', currency: 'TRY' },
          remainingAmount: { amount: '0.00', currency: 'TRY' },
          displayStatus: 'Bekleniyor',
          currentRiskSeverity: 'NONE',
        },
      ],
      '2026-05-14',
    )
    expect(kpis.todayOrderCount).toBe(1)
    expect(kpis.todaySalesTotal).toBe(50_000)
  })
})

describe('buildStoreOperationChecklist', () => {
  it('mağaza checklist adımları', () => {
    const items = buildStoreOperationChecklist(
      {
        id: 'S-1',
        customer: 'Ali',
        product: 'Masa',
        amount: 10_000,
        paidAmount: 2000,
        status: 'Üretimde',
        orderDate: '2026-05-14',
      },
      undefined,
      [],
    )
    expect(items).toHaveLength(8)
    expect(items.find((i) => i.id === 'deposit')?.done).toBe(true)
    expect(items.find((i) => i.id === 'contract')?.done).toBe(false)
  })
})
