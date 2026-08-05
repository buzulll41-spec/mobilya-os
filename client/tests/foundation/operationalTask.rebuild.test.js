import { describe, it, expect, beforeEach } from 'vitest'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'
import { rebuildOperationalTasksFromDtos } from '../../src/services/operationalTaskSync.js'
import { getAllTasksSnapshot } from '../../src/services/mockTaskStore.js'

const todayIso = '2026-05-14'

/** @returns {import('../../src/contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} */
function isolatedBalanceDto() {
  return {
    id: 'ZZ-TASK-ISO-1',
    orderNumber: 'ZZ-TASK-ISO-1',
    customerId: 'C-ZZ',
    customerDisplayName: 'Iso',
    customerPhone: null,
    channel: 'STORE',
    currency: 'TRY',
    placedAt: '2026-05-01T10:00:00.000Z',
    lifecycleStatus: 'IN_FULFILLMENT',
    version: 1,
    totalAmount: { amount: '10000.00', currency: 'TRY' },
    amountPaid: { amount: '0.00', currency: 'TRY' },
    amountDue: { amount: '5000.00', currency: 'TRY' },
    fulfillmentProgress: 0.2,
    currentRiskSeverity: 'NONE',
    earliestCommittedShipBy: '2026-05-20',
    latestCommittedShipBy: '2026-05-20',
    lineSummaryTitle: 'X',
    displayStatus: 'Üretimde',
    plannedShipmentDate: null,
    hasOverdueBalance: true,
    partiallyShipped: false,
    shipmentSummaryOpenCount: 0,
  }
}

function taskFingerprint() {
  const tasks = getAllTasksSnapshot().filter((t) => t.salesOrderId === 'ZZ-TASK-ISO-1')
  return [...tasks]
    .map((t) => `${t.dedupeKey}|${t.status}|${t.title}|${t.createdAt}|${t.updatedAt}`)
    .sort()
    .join('\n')
}

function dedupeKeysForOrder() {
  return getAllTasksSnapshot()
    .filter((t) => t.salesOrderId === 'ZZ-TASK-ISO-1')
    .map((t) => t.dedupeKey)
}

describe('operational task rebuild', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  it('aynı DTO listesi ile iki rebuild → aynı görev parmak izi', () => {
    const list = [isolatedBalanceDto()]
    rebuildOperationalTasksFromDtos(list, todayIso)
    const fp1 = taskFingerprint()
    rebuildOperationalTasksFromDtos(list, todayIso)
    const fp2 = taskFingerprint()
    expect(fp2).toBe(fp1)
  })

  it('tek snapshot içinde dedupeKey tekrarı olmamalı', () => {
    rebuildOperationalTasksFromDtos([isolatedBalanceDto()], todayIso)
    const keys = dedupeKeysForOrder()
    expect(new Set(keys).size).toBe(keys.length)
  })
})
