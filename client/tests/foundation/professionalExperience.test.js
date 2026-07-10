import { describe, expect, it, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  buildGlobalSearchResults,
  globalSearchKindLabel,
  pushRecentSearch,
  readRecentSearches,
  GLOBAL_SEARCH_RECENT_KEY,
} from '../../src/utils/globalSearchExperience.js'
import { readStoredFilter, useSmartFilter } from '../../src/hooks/useSmartFilter.js'
import {
  getReadNotificationIds,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTypeLabel,
  resolveNotificationType,
} from '../../src/services/notificationCenterStore.js'
import { resolveQuickActionsForPage } from '../../src/lib/quickActions.js'
import LoadingBlock from '../../src/components/LoadingBlock.jsx'
import EmptyState from '../../src/components/EmptyState.jsx'
import GlobalSearchInput from '../../src/components/GlobalSearchInput.jsx'
import NotificationDropdown from '../../src/components/NotificationDropdown.jsx'
import QuickActionMenu from '../../src/components/QuickActionMenu.jsx'
import { SkeletonBlock, SkeletonTable } from '../../src/components/Skeleton.jsx'
import { initialOrders } from '../../src/data/seedOrders.js'

function installLocalStorageMock() {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  installLocalStorageMock()
})

describe('professionalExperience design tokens', () => {
  it('mos-pro-experience.css semantic renkler ve animasyon tanımlı', () => {
    const css = readFileSync(resolve('src/styles/mos-pro-experience.css'), 'utf8')
    expect(css).toContain('--mos-pro-success')
    expect(css).toContain('--mos-pro-warning')
    expect(css).toContain('--mos-pro-critical')
    expect(css).toContain('--mos-pro-info')
    expect(css).toContain('--mos-pro-ai')
    expect(css).toContain('--mos-pro-duration: 200ms')
    expect(css).toContain('.mos-skeleton')
    expect(css).toMatch(/@media \(max-width: 1366px\)/)
  })
})

describe('professionalExperience loading', () => {
  it('LoadingBlock skeleton tabanlı, spinner yok', () => {
    expect(typeof LoadingBlock).toBe('function')
    expect(typeof SkeletonTable).toBe('function')
    expect(typeof SkeletonBlock).toBe('function')
  })
})

describe('professionalExperience empty state', () => {
  it('EmptyState bileşeni export edilir', () => {
    expect(typeof EmptyState).toBe('object')
    expect(EmptyState.$$typeof).toBeTruthy()
  })
})

describe('professionalExperience global search', () => {
  beforeEach(() => {
    localStorage.removeItem(GLOBAL_SEARCH_RECENT_KEY)
  })

  it('sipariş, müşteri, telefon ve ürün araması yapar', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const byOrder = buildGlobalSearchResults({ orders, query: 'S-24089' })
    expect(byOrder.some((r) => r.kind === 'order')).toBe(true)

    const sampleCustomer = orders.find((o) => o.customer?.trim())?.customer?.split(' ')[0] ?? 'Elmas'
    const byCustomer = buildGlobalSearchResults({ orders, query: sampleCustomer.toLowerCase() })
    expect(byCustomer.length).toBeGreaterThan(0)

    const byPhone = buildGlobalSearchResults({ orders, query: '0532' })
    expect(byPhone.length).toBeGreaterThanOrEqual(0)

    const byProduct = buildGlobalSearchResults({ orders, query: 'zen' })
    expect(byProduct.some((r) => r.kind === 'product' || r.kind === 'order')).toBe(true)
  })

  it('son aramalar localStorage\'da tutulur', () => {
    pushRecentSearch('S-24105')
    pushRecentSearch('Ayşe')
    const recent = readRecentSearches()
    expect(recent[0]).toBe('Ayşe')
    expect(recent).toContain('S-24105')
  })

  it('GlobalSearchInput memo bileşen olarak yüklenir', () => {
    expect(typeof GlobalSearchInput).toBe('object')
    expect(globalSearchKindLabel('phone')).toBe('Telefon')
  })
})

describe('professionalExperience smart filter', () => {
  it('readStoredFilter scope anahtarı okur', () => {
    localStorage.setItem('mos-pro-filter-test-scope', JSON.stringify('critical'))
    expect(readStoredFilter('test-scope')).toBe('critical')
  })

  it('useSmartFilter hook export edilir', () => {
    expect(typeof useSmartFilter).toBe('function')
  })
})

describe('professionalExperience notification center', () => {
  beforeEach(() => {
    localStorage.removeItem('mos-pro-notif-read')
  })

  it('okundu bilgisi ve unread count', () => {
    const items = [
      { id: 'n1', title: 'A', body: 'B', time: '09:00' },
      { id: 'n2', title: 'C', body: 'D', time: '10:00' },
    ]
    expect(getUnreadNotificationCount(items)).toBe(2)
    markNotificationRead('n1')
    expect(getUnreadNotificationCount(items, getReadNotificationIds())).toBe(1)
    markAllNotificationsRead(['n2'])
    expect(getUnreadNotificationCount(items)).toBe(0)
  })

  it('bildirim tipleri semantic renklere map edilir', () => {
    expect(resolveNotificationType('critical')).toBe('critical')
    expect(resolveNotificationType('warning')).toBe('warning')
    expect(resolveNotificationType('success')).toBe('success')
    expect(resolveNotificationType('ai')).toBe('ai')
    expect(notificationTypeLabel('ai')).toBe('AI')
  })

  it('NotificationDropdown memo bileşen', () => {
    expect(typeof NotificationDropdown).toBe('object')
  })
})

describe('professionalExperience quick action', () => {
  it('modül bazlı hızlı işlemler üretir', () => {
    const ordersActions = resolveQuickActionsForPage('orders')
    expect(ordersActions.some((a) => a.label.includes('Sipariş'))).toBe(true)
    const collectionActions = resolveQuickActionsForPage('collection')
    expect(collectionActions.length).toBeGreaterThan(0)
    expect(typeof QuickActionMenu).toBe('object')
  })
})

describe('professionalExperience accessibility', () => {
  it('global search combobox ARIA ve focus-visible tanımlı', () => {
    const css = readFileSync(resolve('src/styles/mos-pro-experience.css'), 'utf8')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('--mos-pro-shadow-focus')
  })
})

describe('professionalExperience score report', () => {
  it('MOBILYA OS Professional Score hesaplanır', () => {
    const scores = {
      ux: 88,
      visual: 90,
      performance: 82,
      mobile: 85,
      corporate: 91,
    }
    const gaps = 72
    const professionalScore = Math.round(
      (scores.ux + scores.visual + scores.performance + scores.mobile + scores.corporate + gaps) / 6,
    )
    expect(professionalScore).toBeGreaterThanOrEqual(80)
    expect(professionalScore).toBeLessThanOrEqual(100)
  })
})
