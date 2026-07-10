import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  OFFLINE_FIRST_ERP,
  OFFLINE_IDB_NAME,
  OFFLINE_IDB_STORES,
  OFFLINE_SYNC_LOG_MAX,
  OFFLINE_SYNC_STATUS,
  OFFLINE_TEST_SCENARIOS,
} from '../../src/contracts/v1/offlineFirstErp.js'
import {
  MOBILE_LONG_PRESS_MS,
  MOBILE_SWIPE_BACK_THRESHOLD_PX,
} from '../../src/constants/mobileTouchFirst.js'
import { detectOfflineConflict } from '../../src/services/offline/offlineConflictResolver.js'
import { isOfflineMode } from '../../src/services/offline/offlineMutationGate.js'
import { resetOfflineDbForTests } from '../../src/services/offline/offlineIdb.js'
import OfflineBanner from '../../src/components/OfflineBanner.jsx'
import PendingActionsPanel from '../../src/components/offline/PendingActionsPanel.jsx'
import ConflictCenterPanel from '../../src/components/offline/ConflictCenterPanel.jsx'
import DeveloperOfflinePanel from '../../src/components/dev/DeveloperOfflinePanel.jsx'
import MosBottomSheet from '../../src/components/mobile/MosBottomSheet.jsx'

beforeEach(() => {
  resetOfflineDbForTests()
})

describe('FAZ 114 — Offline First ERP', () => {
  describe('Edition & contracts', () => {
    it('FAZ 114 edition sözleşmesi', () => {
      expect(OFFLINE_FIRST_ERP.PHASE).toBe('FAZ 114')
      expect(OFFLINE_FIRST_ERP.NAME).toBe('Offline First ERP')
    })

    it('IndexedDB adı ve store listesi', () => {
      expect(OFFLINE_IDB_NAME).toBe('mobilya-os-offline-v1')
      expect(OFFLINE_IDB_STORES.SYNC_QUEUE).toBe('sync_queue')
      expect(OFFLINE_IDB_STORES.ORDERS).toBe('orders_cache')
      expect(OFFLINE_IDB_STORES.CUSTOMER_SEARCH).toBe('customer_search_cache')
      expect(OFFLINE_IDB_STORES.PRODUCT_SEARCH).toBe('product_search_cache')
    })

    it('sync durumları', () => {
      expect(OFFLINE_SYNC_STATUS.WAITING).toBe('SYNC_WAITING')
      expect(OFFLINE_SYNC_STATUS.SYNCING).toBe('SYNCING')
      expect(OFFLINE_SYNC_STATUS.OK).toBe('SYNC_OK')
      expect(OFFLINE_SYNC_STATUS.ERROR).toBe('SYNC_ERROR')
    })

    it('sync log limiti 100', () => {
      expect(OFFLINE_SYNC_LOG_MAX).toBe(100)
    })
  })

  describe('Offline storage layer', () => {
    it('offlineIdb modülü export eder', () => {
      const mod = readFileSync(resolve('src/services/offline/offlineIdb.js'), 'utf8')
      expect(mod).toContain('openOfflineDb')
      expect(mod).toContain('indexedDB')
    })

    it('cache store sipariş/tahsilat/sevk', () => {
      const mod = readFileSync(resolve('src/services/offline/offlineCacheStore.js'), 'utf8')
      expect(mod).toContain('cacheOrdersSnapshot')
      expect(mod).toContain('cacheCollectionsSnapshot')
      expect(mod).toContain('cacheShipmentsSnapshot')
      expect(mod).toContain('cacheCustomerSearch')
      expect(mod).toContain('cacheProductSearch')
      expect(mod).toContain('getOfflineCacheStatus')
    })
  })

  describe('Sync queue & engine', () => {
    it('sync queue store', () => {
      const mod = readFileSync(resolve('src/services/offline/offlineSyncQueueStore.js'), 'utf8')
      expect(mod).toContain('enqueueSyncItem')
      expect(mod).toContain('listPendingSyncItems')
      expect(mod).toContain('appendSyncLog')
    })

    it('sync engine drain & retry', () => {
      const mod = readFileSync(resolve('src/services/offline/offlineSyncEngine.js'), 'utf8')
      expect(mod).toContain('drainOfflineSyncQueue')
      expect(mod).toContain('OFFLINE_SYNC_RETRY_MAX')
    })

    it('mutation gate offline mod', () => {
      expect(typeof isOfflineMode).toBe('function')
    })
  })

  describe('Conflict resolver', () => {
    it('version çakışması algılar', () => {
      expect(detectOfflineConflict({ version: 2 }, { version: 3 })).toBe(true)
      expect(detectOfflineConflict({ version: 2 }, { version: 2 })).toBe(false)
    })

    it('ConflictCenterPanel export edilir', () => {
      expect(typeof ConflictCenterPanel).toBe('function')
    })
  })

  describe('UI components', () => {
    it('OfflineBanner faz114 modları', () => {
      const src = readFileSync(resolve('src/components/OfflineBanner.jsx'), 'utf8')
      expect(src).toContain('OFFLINE')
      expect(src).toContain('ONLINE')
      expect(src).toContain('SYNCING')
      expect(typeof OfflineBanner).toBe('function')
    })

    it('PendingActionsPanel export edilir', () => {
      expect(typeof PendingActionsPanel).toBe('function')
    })

    it('DeveloperOfflinePanel kontrolleri', () => {
      const src = readFileSync(resolve('src/components/dev/DeveloperOfflinePanel.jsx'), 'utf8')
      expect(src).toContain('Force Sync')
      expect(src).toContain('Clear Cache')
      expect(src).toContain('Retry')
      expect(typeof DeveloperOfflinePanel).toBe('function')
    })

    it('bottom sheet standardı korunur', () => {
      expect(typeof MosBottomSheet).toBe('function')
    })
  })

  describe('Provider wiring', () => {
    it('main.jsx OfflineFirstProvider', () => {
      const main = readFileSync(resolve('src/main.jsx'), 'utf8')
      expect(main).toContain('OfflineFirstProvider')
    })

    it('App.jsx offline panelleri', () => {
      const app = readFileSync(resolve('src/App.jsx'), 'utf8')
      expect(app).toContain('PendingActionsPanel')
      expect(app).toContain('ConflictCenterPanel')
      expect(app).toContain('DeveloperOfflinePanel')
      expect(app).toContain("import './styles/offline-first-faz114.css'")
    })

    it('OrdersProvider offline cache entegrasyonu', () => {
      const provider = readFileSync(resolve('src/state/OrdersProvider.jsx'), 'utf8')
      expect(provider).toContain('cacheOrders')
      expect(provider).toContain('runWithOfflineQueue')
      expect(provider).toContain('readCachedOrders')
    })
  })

  describe('Test scenarios', () => {
    it('offline test senaryoları tanımlı', () => {
      expect(OFFLINE_TEST_SCENARIOS).toEqual([
        'offline',
        'online',
        'network-drop',
        'slow-3g',
        'reconnect',
      ])
    })

    it('touch-first sabitleri korunur', () => {
      expect(MOBILE_LONG_PRESS_MS).toBe(450)
      expect(MOBILE_SWIPE_BACK_THRESHOLD_PX).toBe(72)
    })
  })

  describe('Desktop koruma', () => {
    it('offline CSS desktop scoped', () => {
      const css = readFileSync(resolve('src/styles/offline-first-faz114.css'), 'utf8')
      expect(css).toContain('@media (min-width: 1440px)')
    })
  })
})
