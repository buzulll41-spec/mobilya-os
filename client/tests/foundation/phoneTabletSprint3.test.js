import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  PHONE_TABLET_TEST_VIEWPORTS,
  RESPONSIVE_AUDIT_PAGES,
} from '../../src/constants/mobileViewportTest.js'
import {
  MOBILE_BOTTOM_ACTION_PAGES,
  resolveMobileBottomActions,
} from '../../src/constants/mobileBottomActions.js'
import { auditPwaReadiness, isPwaAuditPassing } from '../../src/lib/pwaReadinessAudit.js'
import { MOBILE_MIN_TOUCH_PX } from '../../src/contracts/v1/mobilePwa.js'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import MobileBottomActionBar from '../../src/components/mobile/MobileBottomActionBar.jsx'
import { resolveViewportTier } from '../../src/hooks/useViewportTier.js'

describe('FAZ 111 Sprint 3 — Phone & Tablet Edition', () => {
  describe('Responsive layout audit', () => {
    it('test viewport boyutları phone, tablet, desktop', () => {
      expect(PHONE_TABLET_TEST_VIEWPORTS.phone).toEqual({
        width: 390,
        height: 844,
        label: 'iPhone 12/13/14',
      })
      expect(PHONE_TABLET_TEST_VIEWPORTS.tablet).toEqual({
        width: 768,
        height: 1024,
        label: 'iPad portrait',
      })
      expect(PHONE_TABLET_TEST_VIEWPORTS.desktop).toEqual({
        width: 1440,
        height: 900,
        label: 'Desktop',
      })
    })

    it('öncelikli ekranlar audit listesinde', () => {
      expect(RESPONSIVE_AUDIT_PAGES).toEqual([
        'enterprise-ceo-dashboard',
        'dashboard',
        'orders',
        'shipment-ops',
        'collection',
        'supply-incoming',
        'product-master-center',
      ])
    })

    it('phone-tablet-sprint3.css responsive katmanları', () => {
      const css = readFileSync(resolve('src/styles/phone-tablet-sprint3.css'), 'utf8')
      expect(css).toContain('@media (max-width: 767px)')
      expect(css).toContain('@media (min-width: 768px) and (max-width: 1024px)')
      expect(css).toContain('@media (min-width: 1440px)')
      expect(css).toContain('.mos-mobile-action-bar')
      expect(css).toContain('.mos-viewport-phone')
    })

    it('mobile-edition-faz112.css import edilir', () => {
      const app = readFileSync(resolve('src/App.jsx'), 'utf8')
      expect(app).toContain("import './styles/mobile-edition-faz112.css'")
    })
  })

  describe('Mobile sidebar & bottom navigation', () => {
    it('AppLayout hamburger + tab bar + FAB', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain('MobileTabBar')
      expect(layout).toContain('MobileFab')
      expect(layout).toContain('setSidebarOpen(true)')
      expect(layout).toContain('mos-viewport-tablet')
    })

    it('tablet sidebar daraltılmış mod', () => {
      const layout = readFileSync(resolve('src/layout/AppLayout.jsx'), 'utf8')
      expect(layout).toContain("viewportTier === 'tablet'")
      const css = readFileSync(resolve('src/styles/phone-tablet-sprint3.css'), 'utf8')
      expect(css).toContain('width: 76px')
    })
  })

  describe('Mobile bottom action bar', () => {
    it('MobileBottomActionBar export edilir', () => {
      expect(typeof MobileBottomActionBar).toBe('function')
    })

    it('öncelikli sayfalar alt aksiyon bar listesinde', () => {
      for (const page of RESPONSIVE_AUDIT_PAGES) {
        expect(MOBILE_BOTTOM_ACTION_PAGES.has(page)).toBe(true)
      }
    })

    it('dashboard için en az bir hızlı aksiyon döner', () => {
      const actions = resolveMobileBottomActions('dashboard', USER_ROLE.MANAGER)
      expect(actions.length).toBeGreaterThan(0)
      expect(actions.length).toBeLessThanOrEqual(3)
    })

    it('bilinmeyen sayfa için aksiyon dönmez', () => {
      expect(resolveMobileBottomActions('settings', USER_ROLE.MANAGER)).toEqual([])
    })
  })

  describe('Touch targets', () => {
    it('minimum 44px dokunma alanı sprint3 CSS', () => {
      expect(MOBILE_MIN_TOUCH_PX).toBe(44)
      const css = readFileSync(resolve('src/styles/phone-tablet-sprint3.css'), 'utf8')
      expect(css).toContain('min-height: 44px')
      expect(css).toContain('min-width: 44px')
    })
  })

  describe('Mobile header overflow', () => {
    it('telefonda chrome pill gizleme kuralları', () => {
      const css = readFileSync(resolve('src/styles/phone-tablet-sprint3.css'), 'utf8')
      expect(css).toContain('.mos-build-status')
      expect(css).toContain('.mos-pilot-indicator')
      expect(css).toContain('.mos-api-status')
      expect(css).toContain('display: none !important')
    })
  })

  describe('PWA readiness', () => {
    it('PWA audit tüm kontrolleri geçer', () => {
      const indexHtml = readFileSync(resolve('index.html'), 'utf8')
      const manifestText = readFileSync(resolve('public/manifest.webmanifest'), 'utf8')
      const swText = readFileSync(resolve('public/sw.js'), 'utf8')
      const report = auditPwaReadiness({ indexHtml, manifestText, swText })
      expect(isPwaAuditPassing(report)).toBe(true)
      expect(report.checks.every((c) => c.pass)).toBe(true)
    })
  })

  describe('Viewport tier resolver', () => {
    it('export edilir', () => {
      expect(typeof resolveViewportTier).toBe('function')
    })
  })
})
