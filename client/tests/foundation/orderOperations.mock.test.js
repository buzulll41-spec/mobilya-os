import { beforeEach, describe, expect, it } from 'vitest'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { resetMockOrdersStore, postOrderPayment, patchOrderTermin, getDomainEvents } from '../../src/services/mockApi.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'

describe('mock order operations', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  it('postOrderPayment — tahsilat ve payment.posted event', async () => {
    const dto = await postOrderPayment('S-24089', { amount: 10_000, method: PAYMENT_METHOD.CASH })
    expect(Number.parseFloat(dto.amountPaid.amount)).toBeGreaterThan(60_000)
    const events = await getDomainEvents()
    expect(events.some((e) => e.aggregateId === 'S-24089' && e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED)).toBe(
      true,
    )
  })

  it('patchOrderTermin — termin ve committed_ship_by_changed event', async () => {
    const dto = await patchOrderTermin('S-24089', {
      committedShipBy: '2026-08-15',
      reason: 'Fabrika gecikmesi',
    })
    expect(dto.latestCommittedShipBy).toBe('2026-08-15')
    const events = await getDomainEvents()
    expect(
      events.some(
        (e) =>
          e.aggregateId === 'S-24089' &&
          e.type === DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED,
      ),
    ).toBe(true)
  })
})
