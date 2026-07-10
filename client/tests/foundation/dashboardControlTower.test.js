import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { computeDashboardKpis } from '../../src/data/dashboardHelpers.js'
import {
  computeDashboardControlTower,
  deriveOpenServiceProxies,
} from '../../src/mappers/dashboard/computeDashboardControlTower.js'
import { buildOperationalAlarms } from '../../src/utils/operationalAlarms.js'

describe('dashboard control tower', () => {
  it('5 KPI kartı ve aksiyon listeleri üretir', () => {
    const kpis = computeDashboardKpis(initialOrders, [], DEMO_TODAY)
    expect(kpis.todayShipments).toBeDefined()

    const tower = computeDashboardControlTower({
      orders: initialOrders,
      listItemDtos: [],
      todayIso: DEMO_TODAY,
      kpis,
      operationalAlarms: buildOperationalAlarms(initialOrders, [], DEMO_TODAY),
      domainEvents: [],
      shipmentQueue: initialOrders,
    })

    expect(tower.kpiCards.length).toBeGreaterThanOrEqual(5)
    expect(tower.kpiCards.find((c) => c.id === 'sales')?.value).not.toBe('₺0')
    expect(tower.kpiCards.some((c) => c.id === 'service')).toBe(true)
    expect(tower.todayOverview).toHaveLength(5)
    expect(tower.actionLists).toHaveProperty('pendingShipments')
    expect(tower.actionLists).toHaveProperty('openService')
  })

  it('servis vekili sayımı', () => {
    const proxies = deriveOpenServiceProxies([
      { id: 'A', hasShipmentIssue: true, installationPending: false },
      { id: 'B', hasShipmentIssue: false, installationPending: true },
    ])
    expect(proxies).toHaveLength(2)
  })
})
