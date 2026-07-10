import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { projectOperationalTasksFromReadModels } from '../../src/mappers/tasks/projectOperationalTasks.js'
import { applyTaskStateOverlay, filterActiveOperationalTasks } from '../../src/mappers/tasks/applyTaskStateOverlay.js'
import { mapDomainEventsToAuditFeed, extractEventActor } from '../../src/mappers/audit/mapDomainEventsToAuditFeed.js'
import { checkOperationProjectionHealth } from '../../src/mappers/operations/checkOperationProjectionHealth.js'
import { clearAllTaskOverlayStates, loadTaskStateMap, setTaskOverlayState } from '../../src/services/taskStateStore.js'
import { buildOperationActorPayload } from '../../src/lib/operationActor.js'

describe('operation memory & audit', () => {
  beforeEach(() => {
    clearAllTaskOverlayStates()
  })

  it('task overlay — dismissed görev listeden düşer', () => {
    /** @type {import('../../src/contracts/v1/task.js').TaskDto[]} */
    const tasks = [
      {
        id: 'T1',
        salesOrderId: 'S-1',
        title: 'Test',
        status: 'OPEN',
        priority: 'MEDIUM',
        dedupeKey: 'proj-test-S-1',
        source: 'auto',
        createdAt: '2026-05-21T12:00:00.000Z',
        updatedAt: '2026-05-21T12:00:00.000Z',
      },
    ]
    setTaskOverlayState('proj-test-S-1', 'dismissed')
    const active = filterActiveOperationalTasks(tasks, loadTaskStateMap())
    expect(active).toHaveLength(0)
  })

  it('audit feed — actor ve policy override açıklaması', () => {
    const events = [
      {
        id: 'E1',
        type: DOMAIN_EVENT_TYPE.POLICY_OVERRIDE,
        aggregateType: 'SalesOrder',
        aggregateId: 'S-9',
        occurredAt: '2026-05-21T14:00:00.000Z',
        correlationId: 'c1',
        payloadSchemaVersion: '1',
        payload: buildOperationActorPayload('policy.override', {
          code: 'allowReceivingRisk',
          reason: 'Ürün gelmeden sevk',
          context: 'shipment.create',
        }),
      },
    ]
    expect(extractEventActor(events[0])).toBeTruthy()
    const feed = mapDomainEventsToAuditFeed(events, 'S-9')
    expect(feed[0].title).toMatch(/override|Politika/i)
    expect(feed[0].description).toContain('Ürün gelmeden sevk')
  })

  it('projection health — duplicate task uyarısı', () => {
    const health = checkOperationProjectionHealth({
      dtos: [{ id: 'S-1', customerDisplayName: 'A', displayStatus: 'Bekleniyor', totalAmount: { amount: '100', currency: 'TRY' }, placedAt: '2026-05-21' }],
      events: [],
      tasks: [
        { dedupeKey: 'k1', id: '1', salesOrderId: 'S-1', title: 'a', status: 'OPEN', priority: 'LOW', source: 'auto', createdAt: '', updatedAt: '' },
        { dedupeKey: 'k1', id: '2', salesOrderId: 'S-1', title: 'b', status: 'OPEN', priority: 'LOW', source: 'auto', createdAt: '', updatedAt: '' },
      ],
      todayIso: '2026-05-21',
      projectTasks: projectOperationalTasksFromReadModels,
    })
    expect(health.issues.some((i) => i.code === 'duplicate_tasks')).toBe(true)
  })

  it('postDomainEvent mock — contract_printed payload actor içerir', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { postDomainEvent } = await import('../../src/services/ordersClient.js')
    const ev = await postDomainEvent({
      type: DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED,
      salesOrderId: 'S-MOCK-PRINT',
      metadata: { source: 'contract_preview' },
    })
    expect(ev.type).toBe('sales.contract_printed')
    expect(ev.payload.operationActor).toBeDefined()
    expect(ev.payload.operationActor.actorName).toBeTruthy()
  })

  it('event replay projection — contract event sonrası görev değişimi', () => {
    const dto = {
      id: 'S-2',
      customerDisplayName: 'Müşteri',
      displayStatus: 'Bekleniyor',
      placedAt: '2026-05-21T12:00:00.000Z',
      totalAmount: { amount: '50000', currency: 'TRY' },
      remainingAmount: { amount: '40000', currency: 'TRY' },
      amountPaid: { amount: '10000', currency: 'TRY' },
      openMissingItemsCount: 0,
    }
    const without = projectOperationalTasksFromReadModels({
      dtos: [dto],
      events: [],
      todayIso: '2026-05-21',
    })
    const withContract = projectOperationalTasksFromReadModels({
      dtos: [dto],
      events: [
        {
          id: 'ev-c',
          type: DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED,
          aggregateType: 'SalesOrder',
          aggregateId: 'S-2',
          occurredAt: '2026-05-21T12:05:00.000Z',
          correlationId: 'c',
          payloadSchemaVersion: '1',
          payload: {},
        },
      ],
      todayIso: '2026-05-21',
    })
    const contractTaskBefore = without.some((t) => t.dedupeKey?.includes('contract-not-printed'))
    const contractTaskAfter = withContract.some((t) => t.dedupeKey?.includes('contract-not-printed'))
    expect(contractTaskBefore).toBe(true)
    expect(contractTaskAfter).toBe(false)
  })

  it('snoozed overlay — süre dolana kadar gizlenir', () => {
    const tasks = [
      {
        id: 'T2',
        salesOrderId: 'S-3',
        title: 'Snooze',
        status: 'OPEN',
        priority: 'LOW',
        dedupeKey: 'proj-snooze-S-3',
        source: 'auto',
        createdAt: '2026-05-21T12:00:00.000Z',
        updatedAt: '2026-05-21T12:00:00.000Z',
      },
    ]
    const until = new Date(Date.now() + 86_400_000).toISOString()
    setTaskOverlayState('proj-snooze-S-3', 'snoozed', { snoozedUntil: until })
    const active = filterActiveOperationalTasks(tasks, loadTaskStateMap())
    expect(active).toHaveLength(0)
  })
})
