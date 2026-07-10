import { describe, expect, it } from 'vitest'
import {
  ACTIVE_STATUSES,
  MAX_P1_RATIO,
  buildManagerPriorityMap,
  scoreManagerPriorityTier,
} from '../../src/mappers/operationCase/operationCaseWarRoomModel.js'

/** @param {Partial<import('../../src/contracts/v1/operationCase.js').OperationCaseDto> & { id: string }} p */
function caseDto(p) {
  return {
    caseNumber: `CASE-${p.id}`,
    priority: 'P1',
    status: 'OPEN',
    customerName: 'Müşteri',
    orderIds: [],
    createdAt: '2026-05-14T08:00:00.000Z',
    updatedAt: '2026-05-14T08:00:00.000Z',
    ...p,
  }
}

const emptyCtx = {
  orderById: new Map(),
  dtoById: new Map(),
  sshOrderIds: new Set(),
  shipmentLockOrderIds: new Set(),
  todayIso: '2026-05-14',
}

describe('operationCaseWarRoomModel priority remap', () => {
  it('maps data-quality-only cases to P3 (follow-up)', () => {
    const c = caseDto({ id: 'dq-1', orderIds: ['O1'] })
    const actions = [
      {
        id: 'dq-zero-cost:line-1',
        priority: 'P1',
        category: 'DATA_QUALITY',
        recommendedAction: 'Maliyet düzelt',
      },
    ]
    const { tier } = scoreManagerPriorityTier(c, actions, emptyCtx)
    expect(tier).toBe('P3')
  })

  it('maps termin-overdue cases to P1 tier', () => {
    const c = caseDto({ id: 'term-1', orderIds: ['O1'] })
    const ctx = {
      ...emptyCtx,
      orderById: new Map([
        [
          'O1',
          {
            id: 'O1',
            status: 'Üretimde',
            dueDate: '2026-05-10',
            totalAmount: 50000,
            paidAmount: 10000,
          },
        ],
      ]),
    }
    const { tier } = scoreManagerPriorityTier(c, [], ctx)
    expect(tier).toBe('P1')
  })

  it('caps P1 count to at most 20% of active cases', () => {
    const cases = Array.from({ length: 45 }, (_, i) =>
      caseDto({ id: `c-${i}`, orderIds: [`O${i}`] }),
    )
    const actionIndex = new Map(
      cases.map((c) => [
        c.id,
        [
          {
            id: `dq:${c.id}`,
            priority: 'P1',
            category: 'DATA_QUALITY',
            recommendedAction: 'Düzelt',
          },
        ],
      ]),
    )
    const priorityMap = buildManagerPriorityMap(cases, actionIndex, emptyCtx)
    const activeP1 = cases.filter(
      (c) => ACTIVE_STATUSES.has(c.status) && priorityMap.get(c.id) === 'P1',
    ).length
    const activeCount = cases.filter((c) => ACTIVE_STATUSES.has(c.status)).length
    expect(activeP1).toBeLessThanOrEqual(Math.ceil(activeCount * MAX_P1_RATIO))
    expect(activeP1 / activeCount).toBeLessThanOrEqual(MAX_P1_RATIO + 0.01)
  })
})
