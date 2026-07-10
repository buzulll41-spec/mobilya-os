import { describe, expect, it } from 'vitest'
import {
  buildSupplyIncomingEntryUrl,
  parseSupplyIncomingDeepLink,
} from '../../src/lib/supplyIncomingNavigation.js'

describe('supplyIncomingNavigation', () => {
  it('builds deep link with filters and opens incoming modal', () => {
    expect(
      buildSupplyIncomingEntryUrl({
        q: 'Aykut Elmas',
        orderId: 'S-2026-0142',
        orderLineId: 'line-1',
      }),
    ).toBe('#/supply-incoming?incoming=1&q=Aykut+Elmas&orderId=S-2026-0142&lineId=line-1')
  })

  it('parses deep link from hash', () => {
    expect(
      parseSupplyIncomingDeepLink(
        '#/supply-incoming?incoming=1&q=Aykut&orderId=S-99&lineId=line-x',
      ),
    ).toEqual({
      openIncoming: true,
      q: 'Aykut',
      orderId: 'S-99',
      lineId: 'line-x',
    })
  })
})
