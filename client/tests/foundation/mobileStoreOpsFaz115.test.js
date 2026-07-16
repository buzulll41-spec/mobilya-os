import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOBILE_STORE_OPS } from '../../src/contracts/v1/mobileStoreOpsFaz115.js'
import {
  MOBILE_STORE_OPS_TEST_CHECKLIST,
  isMobileStoreOpsPage,
} from '../../src/constants/mobileStoreOpsChecklist.js'
import { MOBILE_EDITION_TEST_VIEWPORTS } from '../../src/constants/mobileViewportTest.js'
import {
  buildMobileOrderCardVm,
  buildMobileStoreHomeCards,
  isMobileDeliveredShipmentRow,
  MOBILE_COLLECTION_PRIORITY_CHIPS,
  MOBILE_SHIPMENT_PRIORITY_CHIPS,
  MOBILE_STORE_QUICK_ACTIONS,
  normalizeSearchDigits,
  toMobileFriendlyErrorMessage,
} from '../../src/mappers/mobile/mobileStoreOpsModel.js'
import { buildGlobalSearchResults } from '../../src/utils/globalSearchExperience.js'
import { filterOrdersBySearch } from '../../src/utils/orderSearch.js'
import MobileStoreHome from '../../src/components/mobile/MobileStoreHome.jsx'
import MobileQuickActions from '../../src/components/mobile/MobileQuickActions.jsx'
import MobileOrderCard from '../../src/components/mobile/MobileOrderCard.jsx'
import MobileStoreEmptyState from '../../src/components/mobile/MobileStoreEmptyState.jsx'
import MobileStoreErrorState from '../../src/components/mobile/MobileStoreErrorState.jsx'
import { initialOrders } from '../../src/data/seedOrders.js'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'

beforeEach(() => {
  resetMockOrdersStore()
})

describe('FAZ 115 — Mobile Store Operation', () => {
  describe('Edition metadata', () => {
    it('FAZ 115 sözleşmesi', () => {
      expect(MOBILE_STORE_OPS.PHASE).toBe('FAZ 115')
      expect(MOBILE_STORE_OPS.MAX_TAPS).toBe(3)
    })

    it('test checklist 4 cihaz profili', () => {
      expect(MOBILE_STORE_OPS_TEST_CHECKLIST).toHaveLength(4)
      expect(MOBILE_STORE_OPS_TEST_CHECKLIST[0].viewport).toEqual(MOBILE_EDITION_TEST_VIEWPORTS.phone)
      expect(MOBILE_STORE_OPS_TEST_CHECKLIST[1].viewport).toEqual(MOBILE_EDITION_TEST_VIEWPORTS.phoneLarge)
      expect(MOBILE_STORE_OPS_TEST_CHECKLIST[2].viewport).toEqual(MOBILE_EDITION_TEST_VIEWPORTS.tablet)
      expect(MOBILE_STORE_OPS_TEST_CHECKLIST[3].viewport).toEqual(MOBILE_EDITION_TEST_VIEWPORTS.tabletLarge)
    })

    it('mağaza operasyon sayfaları', () => {
      expect(isMobileStoreOpsPage('orders')).toBe(true)
      expect(isMobileStoreOpsPage('digital-workforce')).toBe(false)
    })
  })

  describe('Mobile home + quick actions', () => {
    it('4 ana kart üretir', () => {
      const rows = initialOrders
      const cards = buildMobileStoreHomeCards({
        orders: rows,
        listItemDtos: [],
        collectionRows: rows,
      })
      expect(cards).toHaveLength(4)
      expect(cards.map((c) => c.id)).toEqual([
        'today-orders',
        'pending-collection',
        'today-shipments',
        'critical-alerts',
      ])
    })

    it('4 hızlı aksiyon tanımlı', () => {
      expect(MOBILE_STORE_QUICK_ACTIONS).toHaveLength(4)
      expect(MOBILE_STORE_QUICK_ACTIONS.map((a) => a.label)).toEqual([
        'Yeni Sipariş',
        'Tahsilat Gir',
        'Sevk Planla',
        'Müşteri Ara',
      ])
    })

    it('bileşenler export edilir', () => {
      expect(['function', 'object']).toContain(typeof MobileStoreHome)
      expect(['function', 'object']).toContain(typeof MobileQuickActions)
      expect(['function', 'object']).toContain(typeof MobileOrderCard)
      expect(['function', 'object']).toContain(typeof MobileStoreEmptyState)
      expect(['function', 'object']).toContain(typeof MobileStoreErrorState)
    })
  })

  describe('Order card VM', () => {
    it('müşteri, telefon, durum, termin, bakiye, sevk alanları', () => {
      const row = initialOrders[0]
      const card = buildMobileOrderCardVm(row, undefined, '2026-03-15')
      expect(card.customer).toBeTruthy()
      expect(card).toHaveProperty('phone')
      expect(card.statusLabel).toBeTruthy()
      expect(card.terminLabel).toBeTruthy()
      expect(card.balanceLabel).toBeTruthy()
      expect(card.shipmentLabel).toBeTruthy()
    })
  })

  describe('Collection + shipment mobile chips', () => {
    it('tahsilat öncelik chip sırası', () => {
      expect(MOBILE_COLLECTION_PRIORITY_CHIPS.map((c) => c.label)).toEqual([
        'Sipariş ara',
        'Kapora gir',
        'Tahsilat gir',
        'Bakiye gör',
      ])
    })

    it('sevk öncelik chip sırası', () => {
      expect(MOBILE_SHIPMENT_PRIORITY_CHIPS.map((c) => c.label)).toEqual([
        'Bugünkü sevk',
        'Yarınki sevk',
        'Geciken sevk',
        'Teslim edildi',
      ])
    })

    it('teslim edildi satır filtresi', () => {
      expect(isMobileDeliveredShipmentRow({ statusLabel: 'Teslim Edildi' })).toBe(true)
      expect(isMobileDeliveredShipmentRow({ statusLabel: 'Planlı' })).toBe(false)
    })
  })

  describe('Mobile search', () => {
    it('telefon rakamları normalize edilir', () => {
      expect(normalizeSearchDigits('0532 111 22 33')).toBe('05321112233')
    })

    it('global arama telefon ile eşleşir', () => {
      const rows = initialOrders
      const withPhone = rows.find((r) => r.phone)
      if (!withPhone?.phone) return
      const digits = normalizeSearchDigits(withPhone.phone).slice(0, 4)
      const results = buildGlobalSearchResults({ orders: rows, query: digits })
      expect(results.some((r) => r.kind === 'phone' || r.kind === 'order')).toBe(true)
    })

    it('liste araması telefon ile eşleşir', () => {
      const rows = initialOrders
      const withPhone = rows.find((r) => r.phone)
      if (!withPhone?.phone) return
      const digits = normalizeSearchDigits(withPhone.phone).slice(0, 4)
      const filtered = filterOrdersBySearch(rows, digits)
      expect(filtered.length).toBeGreaterThan(0)
    })
  })

  describe('Empty + error states', () => {
    it('anlaşılır hata mesajı', () => {
      expect(toMobileFriendlyErrorMessage('Network request failed')).toMatch(/bağlant/i)
      expect(toMobileFriendlyErrorMessage('Bu işlem için yetkiniz yok')).toMatch(/yetkiniz/)
    })
  })

  describe('CSS + layout wiring', () => {
    it('FAZ 115 stylesheet import edilir', () => {
      const appSrc = readFileSync(resolve('src/App.jsx'), 'utf8')
      expect(appSrc).toContain('mobile-store-ops-faz115.css')
    })

    it('desktop-only sınıfları korunur', () => {
      const css = readFileSync(resolve('src/styles/mobile-store-ops-faz115.css'), 'utf8')
      expect(css).toContain('.mos-viewport-desktop .mos-store-ops-mobile-only')
      expect(css).toContain('.mos-mobile-store-home__grid')
    })

    it('RoleHomePage mobil kartları kullanır', () => {
      const src = readFileSync(resolve('src/pages/RoleHomePage.jsx'), 'utf8')
      expect(src).toContain('MobileStoreHome')
      expect(src).toContain('mos-role-home__desktop-only')
    })
  })
})
