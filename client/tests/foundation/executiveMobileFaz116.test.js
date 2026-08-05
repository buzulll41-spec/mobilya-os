import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { initialOrders } from '../../src/data/seedOrders.js'
import { resetMockOrdersStore } from '../../src/services/mockApi.js'
import { EXECUTIVE_MOBILE } from '../../src/contracts/v1/executiveMobileFaz116.js'
import {
  EXECUTIVE_MOBILE_TEST_CHECKLIST,
  isExecutiveMobilePage,
} from '../../src/constants/executiveMobileChecklist.js'
import { MOBILE_EDITION_TEST_VIEWPORTS } from '../../src/constants/mobileViewportTest.js'
import {
  buildExecutiveMobileView,
  computeExecutiveTrend,
  executiveTrendArrow,
} from '../../src/mappers/mobile/executiveMobileModel.js'
import ExecutiveMobileDashboard from '../../src/components/mobile/executive/ExecutiveMobileDashboard.jsx'
import ExecutiveMobileKpiCard from '../../src/components/mobile/executive/ExecutiveMobileKpiCard.jsx'

beforeEach(() => {
  resetMockOrdersStore()
})

describe('FAZ 116 — Executive Mobile Edition', () => {
  describe('Edition metadata', () => {
    it('FAZ 116 sözleşmesi', () => {
      expect(EXECUTIVE_MOBILE.PHASE).toBe('FAZ 116')
      expect(EXECUTIVE_MOBILE.TARGET_SECONDS).toBe(30)
    })

    it('test checklist phone/tablet portrait/landscape', () => {
      expect(EXECUTIVE_MOBILE_TEST_CHECKLIST).toHaveLength(4)
      expect(EXECUTIVE_MOBILE_TEST_CHECKLIST[0].viewport).toEqual(MOBILE_EDITION_TEST_VIEWPORTS.phone)
      expect(EXECUTIVE_MOBILE_TEST_CHECKLIST[3].orientation).toBe('landscape')
    })

    it('executive mobile sayfa', () => {
      expect(isExecutiveMobilePage('enterprise-ceo-dashboard')).toBe(true)
      expect(isExecutiveMobilePage('orders')).toBe(false)
    })
  })

  describe('Executive mobile model', () => {
    it('6 KPI kartı üretir', () => {
      const view = buildExecutiveMobileView({
        orders: initialOrders,
        listItemDtos: [],
        todayIso: '2026-03-15',
      })
      expect(view.kpis).toHaveLength(6)
      expect(view.kpis.map((k) => k.label)).toEqual([
        'Bugünkü Ciro',
        'Tahsilat',
        'Sevk',
        'Bekleyen Sipariş',
        'Kritik Risk',
        'AI Önerisi',
      ])
    })

    it('trend okları', () => {
      expect(computeExecutiveTrend([1, 2, 3])).toBe('up')
      expect(computeExecutiveTrend([3, 2, 1])).toBe('down')
      expect(executiveTrendArrow('up')).toBe('↑')
      expect(executiveTrendArrow('down')).toBe('↓')
    })

    it('copilot tek cümle', () => {
      const view = buildExecutiveMobileView({
        orders: initialOrders,
        listItemDtos: [],
        todayIso: '2026-03-15',
        ecc: {
          todayActions: [{ id: 'a1', action: 'Tahsilat görüşmelerini hızlandır' }],
        },
      })
      expect(view.copilotLine).toContain('Tahsilat')
    })

    it('timeline dönemleri', () => {
      const view = buildExecutiveMobileView({
        orders: initialOrders,
        listItemDtos: [],
        domainEvents: [],
        todayIso: '2026-03-15',
      })
      expect(view.timeline).toHaveProperty('today')
      expect(view.timeline).toHaveProperty('yesterday')
      expect(view.timeline).toHaveProperty('week')
    })
  })

  describe('UI components', () => {
    it('bileşenler export edilir', () => {
      expect(typeof ExecutiveMobileDashboard).toBe('function')
      expect(typeof ExecutiveMobileKpiCard).toBe('function')
    })
  })

  describe('CSS + wiring', () => {
    it('FAZ 116 stylesheet CEO sayfasında', () => {
      const pageSrc = readFileSync(resolve('src/pages/EnterpriseCeoDashboardPage.jsx'), 'utf8')
      expect(pageSrc).toContain('executive-mobile-faz116.css')
      expect(pageSrc).toContain('ExecutiveMobileDashboard')
      expect(pageSrc).toContain('ecd__desktop-only')
    })

    it('desktop gizleme kuralları', () => {
      const css = readFileSync(resolve('src/styles/executive-mobile-faz116.css'), 'utf8')
      expect(css).toContain('.mos-viewport-desktop .exec-mobile-dashboard')
      expect(css).toContain('.mos-viewport-tablet .exec-mobile-dashboard__kpis')
    })
  })
})
