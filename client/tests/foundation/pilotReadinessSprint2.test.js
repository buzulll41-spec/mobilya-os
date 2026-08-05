import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { UI_STANDARDS, TOAST_EVENT } from '../../src/constants/uiStandards.js'
import { pushToast, toastError, toastSuccess } from '../../src/lib/toastBus.js'
import { buildGlobalSearchResults, globalSearchKindLabel } from '../../src/utils/globalSearchExperience.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import PilotModeIndicator from '../../src/components/chrome/PilotModeIndicator.jsx'
import ApiConnectionStatus from '../../src/components/chrome/ApiConnectionStatus.jsx'
import UserProfileCard from '../../src/components/chrome/UserProfileCard.jsx'
import PageRefreshBar from '../../src/components/PageRefreshBar.jsx'
import MosEmptyState from '../../src/components/standards/MosEmptyState.jsx'
import MosSkeletonStandard from '../../src/components/standards/MosSkeletonStandard.jsx'
import DeveloperPerformancePanel from '../../src/components/dev/DeveloperPerformancePanel.jsx'

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

describe('FAZ 111 Sprint 2 Pilot Readiness', () => {
  describe('Pilot Mode indicator', () => {
    it('PilotModeIndicator export edilir', () => {
      expect(typeof PilotModeIndicator).toBe('function')
    })

    it('AppChrome pilot göstergesi entegrasyonu', () => {
      const chrome = readFileSync(resolve('src/components/AppChrome.jsx'), 'utf8')
      expect(chrome).toContain('PilotModeIndicator')
    })
  })

  describe('API Connection Status', () => {
    it('ApiConnectionStatus export edilir', () => {
      expect(typeof ApiConnectionStatus).toBe('function')
    })

    it('AppChrome API status entegrasyonu', () => {
      const chrome = readFileSync(resolve('src/components/AppChrome.jsx'), 'utf8')
      expect(chrome).toContain('ApiConnectionStatus')
    })
  })

  describe('User profile card', () => {
    it('UserProfileCard export edilir', () => {
      expect(typeof UserProfileCard).toBe('function')
    })

    it('profesyonel kullanıcı kartı chrome entegrasyonu', () => {
      const css = readFileSync(resolve('src/styles/pilot-readiness-sprint2.css'), 'utf8')
      expect(css).toContain('.mos-user-card')
      const chrome = readFileSync(resolve('src/components/AppChrome.jsx'), 'utf8')
      expect(chrome).toContain('UserProfileCard')
    })
  })

  describe('Global Search', () => {
    it('çok kelimeli sipariş araması yapar', () => {
      const orders = initialOrders.filter((o) => o.status !== 'İptal')
      const results = buildGlobalSearchResults({ orders, query: 'S-24089' })
      expect(results.length).toBeGreaterThan(0)
    })

    it('sayfa anahtar kelimesi ile navigasyon sonucu üretir', () => {
      const orders = initialOrders.filter((o) => o.status !== 'İptal')
      const results = buildGlobalSearchResults({ orders, query: 'tahsilat' })
      expect(results.some((r) => r.kind === 'page' && r.targetPage === 'collection')).toBe(true)
      expect(globalSearchKindLabel('page')).toBe('Sayfa')
    })

    it('GlobalSearchInput commit callback destekler', () => {
      const input = readFileSync(resolve('src/components/GlobalSearchInput.jsx'), 'utf8')
      expect(input).toContain('onCommitSearch')
    })
  })

  describe('Skeleton Loader standard', () => {
    it('UI standart skeleton sabitleri', () => {
      expect(UI_STANDARDS.skeleton.tableDefaultRows).toBe(5)
    })

    it('MosSkeletonStandard export edilir', () => {
      expect(typeof MosSkeletonStandard).toBe('function')
    })
  })

  describe('Toast Notification standard', () => {
    it('toast event sabiti tanımlı', () => {
      expect(TOAST_EVENT).toBe('mobilya:toast')
    })

    it('toastBus push fonksiyonları', () => {
      expect(typeof pushToast).toBe('function')
      expect(typeof toastSuccess).toBe('function')
      expect(typeof toastError).toBe('function')
    })

    it('ToastProvider main entegrasyonu', () => {
      const main = readFileSync(resolve('src/main.jsx'), 'utf8')
      expect(main).toContain('ToastProvider')
    })
  })

  describe('Empty State standard', () => {
    it('MosEmptyState preset destekler', () => {
      expect(typeof MosEmptyState).toBe('function')
      const css = readFileSync(resolve('src/styles/mos-pro-experience.css'), 'utf8')
      expect(css).toContain('.mos-pro-empty')
    })
  })

  describe('Page Refresh', () => {
    it('PageRefreshBar export edilir', () => {
      expect(typeof PageRefreshBar).toBe('function')
    })

    it('ana sayfalarda refresh bar', () => {
      for (const file of [
        'src/pages/RoleHomePage.jsx',
        'src/pages/EnterpriseCeoDashboardPage.jsx',
        'src/pages/OrdersPage.jsx',
        'src/pages/CollectionPage.jsx',
        'src/pages/ShipmentOperationsPage.jsx',
        'src/pages/SupplyIncomingPage.jsx',
      ]) {
        expect(readFileSync(resolve(file), 'utf8')).toContain('PageRefreshBar')
      }
    })
  })

  describe('Developer Performance Panel', () => {
    it('DeveloperPerformancePanel export edilir', () => {
      expect(typeof DeveloperPerformancePanel).toBe('function')
    })

    it('App.jsx performance panel entegrasyonu', () => {
      const app = readFileSync(resolve('src/App.jsx'), 'utf8')
      expect(app).toContain('DeveloperPerformancePanel')
    })
  })
})
