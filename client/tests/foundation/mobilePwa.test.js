import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MOBILE_API_UNAVAILABLE_MESSAGE,
  MOBILE_BREAKPOINTS,
  MOBILE_MIN_TOUCH_PX,
  MOBILE_PWA_EDITION,
  PWA_MANIFEST_PATH,
  PWA_SERVICE_WORKER_PATH,
} from '../../src/contracts/v1/mobilePwa.js'
import { MOBILE_TAB_ITEMS } from '../../src/constants/mobileNavigation.js'
import { MOBILE_TEST_FLOW_STEPS } from '../../src/constants/mobileTestFlowSteps.js'
import {
  buildMobileTestFlowState,
  resetMobileTestFlowForTests,
} from '../../src/services/mobile/mobileTestFlow.js'
import { formatApiErrorMessage } from '../../src/utils/apiErrorMessage.js'
import { ApiClientError } from '../../src/lib/apiClient.js'
import MobileTabBar from '../../src/components/mobile/MobileTabBar.jsx'
import PwaInstallPrompt from '../../src/components/mobile/PwaInstallPrompt.jsx'
import MobileTestFlowPanel from '../../src/components/mobile/MobileTestFlowPanel.jsx'
import {
  isMobileViewport,
  isTabletViewport,
  resolveViewportTier,
} from '../../src/hooks/useViewportTier.js'

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
  resetMobileTestFlowForTests()
})

describe('MOBILYA OS Mobile & Tablet PWA (FAZ 111)', () => {
  describe('Responsive', () => {
    it('breakpoint sözleşmesi telefon, tablet, laptop ve desktop kapsar', () => {
      expect(MOBILE_BREAKPOINTS.PHONE_MAX).toBe(767)
      expect(MOBILE_BREAKPOINTS.TABLET_MIN).toBe(768)
      expect(MOBILE_BREAKPOINTS.TABLET_MAX).toBe(1024)
      expect(MOBILE_BREAKPOINTS.LAPTOP_MIN).toBe(1280)
      expect(MOBILE_BREAKPOINTS.DESKTOP_MIN).toBe(1440)
    })

    it('mobile-pwa.css responsive katmanları tanımlı', () => {
      const css = readFileSync(resolve('src/styles/mobile-pwa.css'), 'utf8')
      expect(css).toContain('@media (max-width: 767px)')
      expect(css).toContain('@media (min-width: 768px) and (max-width: 1024px)')
      expect(css).toContain('@media (min-width: 1280px)')
      expect(css).toContain('.mos-mobile-tabbar')
      expect(css).toContain('.mos-mobile-pwa')
    })

    it('index.html viewport ve theme-color meta içerir', () => {
      const html = readFileSync(resolve('index.html'), 'utf8')
      expect(html).toContain('viewport-fit=cover')
      expect(html).toContain('theme-color')
      expect(html).toContain('manifest.webmanifest')
    })
  })

  describe('PWA', () => {
    it('manifest ve service worker dosyaları mevcut', () => {
      const manifest = readFileSync(resolve('public/manifest.webmanifest'), 'utf8')
      expect(manifest).toContain('"display": "standalone"')
      expect(manifest).toContain('MOBILYA OS')
      expect(PWA_MANIFEST_PATH).toBe('/manifest.webmanifest')
      expect(PWA_SERVICE_WORKER_PATH).toBe('/sw.js')

      const sw = readFileSync(resolve('public/sw.js'), 'utf8')
      expect(sw).toContain('install')
      expect(sw).toContain('fetch')
    })

    it('PWA ikonları ve splash ekranı tanımlı', () => {
      const manifest = readFileSync(resolve('public/manifest.webmanifest'), 'utf8')
      expect(manifest).toContain('pwa-icon-192.svg')
      expect(manifest).toContain('pwa-icon-512.svg')

      const html = readFileSync(resolve('index.html'), 'utf8')
      expect(html).toContain('mos-splash')
      expect(html).toContain('apple-touch-icon')
    })

    it('registerServiceWorker modülü export eder', () => {
      const mod = readFileSync(resolve('src/pwa/registerServiceWorker.js'), 'utf8')
      expect(mod).toContain('registerServiceWorker')
      expect(mod).toContain('dismissSplashScreen')
    })

    it('PwaInstallPrompt bileşeni export edilir', () => {
      expect(typeof PwaInstallPrompt).toBe('function')
    })
  })

  describe('Mobile Navigation', () => {
    it('5 ana mobil menü öğesi tanımlı (FAZ 112)', () => {
      expect(MOBILE_TAB_ITEMS).toHaveLength(5)
      expect(MOBILE_TAB_ITEMS.map((i) => i.id)).toEqual([
        'dashboard',
        'orders',
        'shipment-ops',
        'collection',
        '__menu__',
      ])
    })

    it('MobileTabBar bileşeni export edilir', () => {
      expect(typeof MobileTabBar).toBe('function')
    })

    it('AppLayout mobil tab bar + FAB entegrasyonu', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain('MobileTabBar')
      expect(layout).toContain('MobileFab')
      expect(layout).toContain('mos-mobile-pwa')
    })
  })

  describe('Tablet Layout', () => {
    it('tablet viewport iki kolon CSS kuralları', () => {
      const css = readFileSync(resolve('src/styles/mobile-pwa.css'), 'utf8')
      expect(css).toContain('mos-viewport-tablet')
      expect(css).toContain('grid-template-columns: minmax(0, 42%)')
      expect(css).toContain('.coll-ops-center__main')
    })

    it('tablet viewport tier çözümleyici', () => {
      expect(typeof isTabletViewport).toBe('function')
      expect(typeof resolveViewportTier).toBe('function')
    })
  })

  describe('Touch Buttons', () => {
    it('minimum dokunma alanı 44px', () => {
      expect(MOBILE_MIN_TOUCH_PX).toBe(44)
      const css = readFileSync(resolve('src/styles/mobile-pwa.css'), 'utf8')
      expect(css).toContain('min-height: 44px')
      expect(css).toContain('min-width: 44px')
    })
  })

  describe('Mobile Order Flow', () => {
    it('demo test akışı 9 adım içerir', () => {
      expect(MOBILE_TEST_FLOW_STEPS).toHaveLength(9)
      expect(MOBILE_TEST_FLOW_STEPS[0].label).toBe('Sipariş oluştur')
      expect(MOBILE_TEST_FLOW_STEPS.find((s) => s.id === 'collection')?.page).toBe('collection')
    })

    it('mobile test flow state ilerleme hesaplar', () => {
      const initial = buildMobileTestFlowState()
      expect(initial.nextStep?.id).toBe('create-order')
      expect(initial.progressPct).toBe(0)
    })

    it('MobileTestFlowPanel bileşeni export edilir', () => {
      expect(typeof MobileTestFlowPanel).toBe('function')
    })
  })

  describe('Mobile CEO', () => {
    it('CEO dashboard sidebar/menüden erişilebilir', () => {
      expect(MOBILE_TAB_ITEMS.some((i) => i.id === '__menu__')).toBe(true)
    })

    it('test akışında CEO adımı', () => {
      const ceo = MOBILE_TEST_FLOW_STEPS.find((s) => s.id === 'ceo')
      expect(ceo?.page).toBe('enterprise-ceo-dashboard')
      expect(ceo?.label).toBe('CEO ekranına bak')
    })
  })

  describe('Mobile AI Workforce', () => {
    it('AI Workforce sidebar menüsünden erişilebilir', () => {
      expect(MOBILE_TAB_ITEMS.some((i) => i.action === 'menu')).toBe(true)
    })

    it('test akışında AI Workforce adımı', () => {
      const ai = MOBILE_TEST_FLOW_STEPS.find((s) => s.id === 'ai-workforce')
      expect(ai?.page).toBe('digital-workforce')
      expect(ai?.label).toBe('AI Workforce kontrol et')
    })
  })

  describe('Mobile error handling', () => {
    it('API yoksa anlaşılır mesaj döner', () => {
      const err = new ApiClientError({
        kind: 'network',
        message: 'Failed to fetch',
        method: 'GET',
        url: 'https://api.example.com/v1/orders',
        cause: new TypeError('Failed to fetch'),
      })
      expect(formatApiErrorMessage(err)).toBe(MOBILE_API_UNAVAILABLE_MESSAGE)
    })
  })

  describe('Edition metadata', () => {
    it('FAZ 111 edition sözleşmesi', () => {
      expect(MOBILE_PWA_EDITION.PHASE).toBe('FAZ 111')
      expect(MOBILE_PWA_EDITION.VERSION).toContain('mobile')
    })

    it('viewport yardımcıları export edilir', () => {
      expect(typeof isMobileViewport).toBe('function')
    })
  })
})
