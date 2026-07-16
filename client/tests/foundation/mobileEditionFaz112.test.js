import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MOBILE_EDITION_TEST_VIEWPORTS,
  RESPONSIVE_AUDIT_PAGES,
} from '../../src/constants/mobileViewportTest.js'
import { MOBILE_TAB_ITEMS } from '../../src/constants/mobileNavigation.js'
import {
  MOBILE_FAB_BY_PAGE,
  MOBILE_FAB_EVENT,
  resolveMobileFabAction,
} from '../../src/constants/mobileFabActions.js'
import {
  MOBILE_EDITION_UX,
  MOBILE_LARGE_TOUCH_PX,
  MOBILE_MIN_TOUCH_PX,
} from '../../src/contracts/v1/mobilePwa.js'
import MobileFab from '../../src/components/mobile/MobileFab.jsx'
import MobilePullToRefresh from '../../src/components/mobile/MobilePullToRefresh.jsx'
import MobileSwipeEnhancer from '../../src/components/mobile/MobileSwipeEnhancer.jsx'
import MobileTabBar from '../../src/components/mobile/MobileTabBar.jsx'
import OfflineBanner from '../../src/components/OfflineBanner.jsx'
import PwaInstallPrompt from '../../src/components/mobile/PwaInstallPrompt.jsx'
import LoadingBlock from '../../src/components/LoadingBlock.jsx'
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh.js'

function installDom() {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map()
    globalThis.localStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    }
  }
}

beforeEach(() => {
  installDom()
})

describe('FAZ 112 — Mobile Edition UX', () => {
  describe('Edition metadata', () => {
    it('FAZ 112 edition sözleşmesi', () => {
      expect(MOBILE_EDITION_UX.PHASE).toBe('FAZ 112')
      expect(MOBILE_EDITION_UX.NAME).toBe('Mobile Edition UX')
    })

    it('büyük dokunma modu 48px', () => {
      expect(MOBILE_LARGE_TOUCH_PX).toBe(48)
      expect(MOBILE_MIN_TOUCH_PX).toBe(44)
    })
  })

  describe('Bottom navigation (Field Pilot: 4 sekme)', () => {
    it('telefon alt menü 4 sekme', () => {
      expect(MOBILE_TAB_ITEMS).toHaveLength(4)
      expect(MOBILE_TAB_ITEMS.map((i) => i.icon)).toEqual(['🏠', '🧾', '🚚', '💳'])
      expect(MOBILE_TAB_ITEMS.map((i) => i.id)).toEqual([
        'dashboard',
        'orders',
        'shipment-ops',
        'collection',
      ])
    })

    it('MobileTabBar menü sekmesi desteği', () => {
      const src = readFileSync(resolve('src/components/mobile/MobileTabBar.jsx'), 'utf8')
      expect(src).toContain('onOpenMenu')
      expect(src).toContain('action === \'menu\'')
    })

    it('MobileTabBar export edilir', () => {
      expect(typeof MobileTabBar).toBe('function')
    })
  })

  describe('Floating Action Button', () => {
    it('sayfa bazlı FAB eşlemesi', () => {
      expect(resolveMobileFabAction('orders')?.label).toBe('Yeni Sipariş')
      expect(resolveMobileFabAction('collection')?.label).toBe('Yeni Tahsilat')
      expect(resolveMobileFabAction('shipment-ops')?.label).toBe('Yeni Sevk')
      expect(Object.keys(MOBILE_FAB_BY_PAGE)).toContain('dashboard')
    })

    it('MobileFab export edilir', () => {
      expect(typeof MobileFab).toBe('function')
    })

    it('AppLayout FAB entegrasyonu', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain('MobileFab')
      expect(layout).not.toContain('MobileBottomActionBar')
    })

    it('FAB event sabiti', () => {
      expect(MOBILE_FAB_EVENT).toBe('mos:mobile-fab-intent')
    })
  })

  describe('Pull to refresh', () => {
    it('usePullToRefresh export edilir', () => {
      expect(typeof usePullToRefresh).toBe('function')
    })

    it('MobilePullToRefresh export edilir', () => {
      expect(typeof MobilePullToRefresh).toBe('function')
    })

    it('AppLayout pull refresh entegrasyonu', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain('MobilePullToRefresh')
      expect(layout).toContain('onPullRefresh')
    })
  })

  describe('Offline banner', () => {
    it('OfflineBanner export edilir', () => {
      expect(typeof OfflineBanner).toBe('function')
    })

    it('kırmızı OFFLINE çubuğu CSS', () => {
      const css = readFileSync(resolve('src/styles/offline-first-faz114.css'), 'utf8')
      expect(css).toContain('.mos-offline-banner--faz114')
      expect(css).toContain('.mos-offline-banner--offline')
      expect(css).toContain('.mos-offline-banner--online')
      expect(css).toContain('.mos-offline-banner--syncing')
    })
  })

  describe('Skeleton loading', () => {
    it('LoadingBlock MosSkeletonStandard kullanır', () => {
      const src = readFileSync(resolve('src/components/LoadingBlock.jsx'), 'utf8')
      expect(src).toContain('MosSkeletonStandard')
      expect(src).not.toContain('Spinner')
    })
  })

  describe('Large touch mode', () => {
    it('48px phone touch CSS', () => {
      const css = readFileSync(resolve('src/styles/mobile-edition-faz112.css'), 'utf8')
      expect(css).toContain('min-height: 48px')
      expect(css).toContain('min-width: 48px')
    })
  })

  describe('Swipe actions', () => {
    it('MobileSwipeEnhancer export edilir', () => {
      expect(typeof MobileSwipeEnhancer).toBe('function')
    })

    it('swipe CSS kuralları', () => {
      const css = readFileSync(resolve('src/styles/mobile-edition-faz112.css'), 'utf8')
      expect(css).toContain('mos-mobile-swipe--left')
      expect(css).toContain('mos-mobile-swipe--right')
      expect(css).toContain('Düzenle')
      expect(css).toContain('Detay')
    })
  })

  describe('Tablet split view & landscape', () => {
    it('tablet split view CSS', () => {
      const css = readFileSync(resolve('src/styles/mobile-edition-faz112.css'), 'utf8')
      expect(css).toContain('grid-template-columns: minmax(0, 42%) minmax(0, 58%)')
      expect(css).toContain('orientation: landscape')
    })
  })

  describe('PWA install UX', () => {
    it('PwaInstallPrompt ilk giriş metni', () => {
      const src = readFileSync(resolve('src/components/mobile/PwaInstallPrompt.jsx'), 'utf8')
      expect(src).toContain('Uygulamayı Ana Ekrana Ekle')
      expect(src).toContain('pwa-first-visit')
    })

    it('PwaInstallPrompt export edilir', () => {
      expect(typeof PwaInstallPrompt).toBe('function')
    })
  })

  describe('Test viewports', () => {
    it('390x844, 430x932, 768x1024, 1024x1366, 1440+', () => {
      expect(MOBILE_EDITION_TEST_VIEWPORTS.phone).toEqual({
        width: 390,
        height: 844,
        label: 'iPhone 12/13/14',
      })
      expect(MOBILE_EDITION_TEST_VIEWPORTS.phoneLarge.width).toBe(430)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.phoneLarge.height).toBe(932)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.tablet.width).toBe(768)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.tabletLarge.width).toBe(1024)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.tabletLarge.height).toBe(1366)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.desktop.width).toBe(1440)
    })

    it('audit sayfaları korunur', () => {
      expect(RESPONSIVE_AUDIT_PAGES.length).toBeGreaterThanOrEqual(7)
    })
  })

  describe('Desktop koruma', () => {
    it('desktop FAB ve tab bar gizleme', () => {
      const css = readFileSync(resolve('src/styles/mobile-edition-faz112.css'), 'utf8')
      expect(css).toContain('@media (min-width: 1440px)')
      expect(css).toContain('.mos-viewport-desktop')
    })

    it('App.jsx faz112 CSS import', () => {
      const app = readFileSync(resolve('src/App.jsx'), 'utf8')
      expect(app).toContain("import './styles/mobile-edition-faz112.css'")
    })
  })
})
