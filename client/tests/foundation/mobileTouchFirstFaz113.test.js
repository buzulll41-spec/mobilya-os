import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  MOBILE_BOTTOM_SHEET_CLASS,
  MOBILE_LONG_PRESS_ACTIONS,
  MOBILE_LONG_PRESS_MS,
  MOBILE_SWIPE_BACK_THRESHOLD_PX,
} from '../../src/constants/mobileTouchFirst.js'
import { MOBILE_EDITION_TEST_VIEWPORTS } from '../../src/constants/mobileViewportTest.js'
import { MOBILE_LARGE_TOUCH_PX, TOUCH_FIRST_ERP } from '../../src/contracts/v1/mobilePwa.js'
import MosBottomSheet from '../../src/components/mobile/MosBottomSheet.jsx'
import MobileDateField from '../../src/components/mobile/MobileDateField.jsx'
import MobileLongPressEnhancer from '../../src/components/mobile/MobileLongPressEnhancer.jsx'
import MobileSwipeBackEnhancer from '../../src/components/mobile/MobileSwipeBackEnhancer.jsx'
import MosMobileSaveBar from '../../src/components/mobile/MosMobileSaveBar.jsx'

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

describe('FAZ 113 — Touch First ERP', () => {
  describe('Edition metadata', () => {
    it('FAZ 113 edition sözleşmesi', () => {
      expect(TOUCH_FIRST_ERP.PHASE).toBe('FAZ 113')
      expect(TOUCH_FIRST_ERP.NAME).toBe('Touch First ERP')
    })

    it('large form mode 48px', () => {
      expect(MOBILE_LARGE_TOUCH_PX).toBe(48)
    })
  })

  describe('Bottom sheet standardı', () => {
    it('MosBottomSheet export edilir', () => {
      expect(typeof MosBottomSheet).toBe('function')
    })

    it('bottom sheet CSS ve overlay dönüşümü', () => {
      const css = readFileSync(resolve('src/styles/touch-first-erp-faz113.css'), 'utf8')
      expect(css).toContain('.mos-bottom-sheet-panel')
      expect(css).toContain('.oop-panel')
      expect(css).toContain('.cc-v2-panel')
      expect(MOBILE_BOTTOM_SHEET_CLASS).toBe('mos-bottom-sheet')
    })
  })

  describe('Long press action menu', () => {
    it('MobileLongPressEnhancer export edilir', () => {
      expect(typeof MobileLongPressEnhancer).toBe('function')
    })

    it('long press aksiyonları', () => {
      expect(MOBILE_LONG_PRESS_MS).toBe(450)
      expect(MOBILE_LONG_PRESS_ACTIONS.map((a) => a.label)).toEqual([
        'Detay',
        'Düzenle',
        'Hızlı işlem',
      ])
    })

    it('AppLayout long press entegrasyonu', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain('MobileLongPressEnhancer')
    })
  })

  describe('Swipe back', () => {
    it('MobileSwipeBackEnhancer export edilir', () => {
      expect(typeof MobileSwipeBackEnhancer).toBe('function')
    })

    it('swipe back eşik değeri', () => {
      expect(MOBILE_SWIPE_BACK_THRESHOLD_PX).toBe(72)
    })

    it('AppLayout swipe back entegrasyonu', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain('MobileSwipeBackEnhancer')
    })
  })

  describe('Native date picker UX', () => {
    it('MobileDateField export edilir', () => {
      expect(typeof MobileDateField).toBe('function')
    })

    it('kritik formlarda MobileDateField kullanımı', () => {
      const wizard = readFileSync(resolve('src/features/orders/WizardPaymentStep.jsx'), 'utf8')
      const shipment = readFileSync(resolve('src/features/shipment-ops/ShipmentPlanningCenterModal.jsx'), 'utf8')
      const termin = readFileSync(resolve('src/features/orders/OrderDrawerOperations.jsx'), 'utf8')
      expect(wizard).toContain('MobileDateField')
      expect(shipment).toContain('MobileDateField')
      expect(termin).toContain('MobileDateField')
    })
  })

  describe('Large form mode & sticky save bar', () => {
    it('MosMobileSaveBar export edilir', () => {
      expect(typeof MosMobileSaveBar).toBe('function')
    })

    it('sticky save bar CSS', () => {
      const css = readFileSync(resolve('src/styles/touch-first-erp-faz113.css'), 'utf8')
      expect(css).toContain('.mos-mobile-save-bar')
      expect(css).toContain('min-height: 48px')
    })

    it('CollectionCenterPanel sticky footer', () => {
      const panel = readFileSync(resolve('src/features/collection/CollectionCenterPanel.jsx'), 'utf8')
      expect(panel).toContain('cc-v2-foot mos-mobile-save-bar')
    })
  })

  describe('Touch feedback & safe area', () => {
    it('touch feedback CSS', () => {
      const css = readFileSync(resolve('src/styles/touch-first-erp-faz113.css'), 'utf8')
      expect(css).toContain(':active')
      expect(css).toContain('scale(0.97)')
    })

    it('safe-area CSS', () => {
      const css = readFileSync(resolve('src/styles/touch-first-erp-faz113.css'), 'utf8')
      expect(css).toContain('safe-area-inset-top')
      expect(css).toContain('safe-area-inset-bottom')
    })
  })

  describe('Tablet touch grid', () => {
    it('tablet grid CSS', () => {
      const css = readFileSync(resolve('src/styles/touch-first-erp-faz113.css'), 'utf8')
      expect(css).toContain('.mos-viewport-tablet')
      expect(css).toContain('grid-template-columns: repeat(2')
    })
  })

  describe('Test viewports & desktop koruma', () => {
    it('390x844, 430x932, 768x1024, 1024x1366, 1440+', () => {
      expect(MOBILE_EDITION_TEST_VIEWPORTS.phone.width).toBe(390)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.phoneLarge.width).toBe(430)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.tablet.width).toBe(768)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.tabletLarge.width).toBe(1024)
      expect(MOBILE_EDITION_TEST_VIEWPORTS.desktop.width).toBe(1440)
    })

    it('App.jsx faz113 CSS import', () => {
      const app = readFileSync(resolve('src/App.jsx'), 'utf8')
      expect(app).toContain("import './styles/touch-first-erp-faz113.css'")
    })

    it('desktop long press gizleme', () => {
      const css = readFileSync(resolve('src/styles/touch-first-erp-faz113.css'), 'utf8')
      expect(css).toContain('@media (min-width: 1440px)')
      expect(css).toContain('.mos-viewport-desktop')
    })
  })
})
