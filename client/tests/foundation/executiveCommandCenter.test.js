import { describe, expect, it } from 'vitest'
import { MAIN_NAV, PAGE_TITLE } from '../../src/constants/navigation.js'
import { canAccessPage } from '../../src/constants/roleAccess.js'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import { resolveDefaultHomePage } from '../../src/constants/roleDefaults.js'
import {
  buildExecutiveCommandCenterView,
  lastNDayIsos,
} from '../../src/mappers/executive/executiveCommandCenterModel.js'
import ExecutiveCommandCenterPage from '../../src/pages/ExecutiveCommandCenterPage.jsx'
import { getOrders } from '../../src/services/mockApi.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DEMO_TODAY } from '../../src/data/constants.js'

describe('executiveCommandCenterModel', () => {
  it('bugün durumu KPI ve görev listesi üretir', async () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const listItemDtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

    const view = buildExecutiveCommandCenterView({
      orders,
      listItemDtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })

    expect(view.todayStatus).toHaveLength(10)
    expect(view.todayStatus.some((k) => k.id === 'revenue')).toBe(true)
    expect(view.todayTasks.length).toBeGreaterThan(0)
    expect(view.riskPanel).toHaveLength(5)
    expect(Object.keys(view.operationTrends)).toEqual(
      expect.arrayContaining(['orders', 'collection', 'shipment', 'supply', 'ssh']),
    )
  })

  it('30 günlük trend dizisi üretir', () => {
    const days = lastNDayIsos(DEMO_TODAY, 30)
    expect(days).toHaveLength(30)
    expect(days.at(-1)).toBe(DEMO_TODAY)
  })
})

describe('executive command center navigation', () => {
  it('menü ve sayfa başlığı tanımlı', () => {
    const item = MAIN_NAV.find((n) => n.id === 'executive-command-center')
    expect(item?.label).toBe('CEO Komuta Merkezi')
    expect(item?.indent).toBe(true)
    expect(PAGE_TITLE['executive-command-center']).toBe('CEO Komuta Merkezi')
  })

  it('admin ve manager erişebilir; admin varsayılan ana sayfa', () => {
    expect(canAccessPage(USER_ROLE.ADMIN, 'executive-command-center')).toBe(true)
    expect(canAccessPage(USER_ROLE.MANAGER, 'executive-command-center')).toBe(true)
    expect(resolveDefaultHomePage(USER_ROLE.ADMIN)).toBe('enterprise-ceo-dashboard')
    expect(resolveDefaultHomePage(USER_ROLE.MANAGER)).toBe('enterprise-ceo-dashboard')
  })
})

describe('executive command center UI', () => {
  it('sayfa bileşeni yüklenir', () => {
    expect(typeof ExecutiveCommandCenterPage).toBe('function')
  })
})
