import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNetworkStatus } from './NetworkStatusProvider.jsx'
import { OFFLINE_BANNER_MODE } from '../contracts/v1/offlineFirstErp.js'
import { openOfflineDb } from '../services/offline/offlineIdb.js'
import { cacheOrdersSnapshot } from '../services/offline/offlineCacheStore.js'
import {
  drainOfflineSyncQueue,
  getOfflineFirstSnapshot,
  isOfflineSyncDraining,
} from '../services/offline/offlineFirstFacade.js'

/**
 * @typedef {Object} OfflineFirstContextValue
 * @property {import('../contracts/v1/offlineFirstErp.js').OfflineBannerMode} bannerMode
 * @property {number} pendingCount
 * @property {number} conflictCount
 * @property {boolean} syncing
 * @property {() => Promise<void>} refreshSnapshot
 * @property {() => Promise<void>} forceSync
 * @property {(orders: import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]) => Promise<void>} cacheOrders
 */

/** @type {import('react').Context<OfflineFirstContextValue | null>} */
const OfflineFirstContext = createContext(null)

/** @param {{ children: import('react').ReactNode }} props */
export function OfflineFirstProvider({ children }) {
  const { online, wasOffline, clearWasOffline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState(0)
  const [conflictCount, setConflictCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshSnapshot = useCallback(async () => {
    const snap = await getOfflineFirstSnapshot()
    setPendingCount(snap.pending)
    setConflictCount(snap.conflicts)
    setSyncing(snap.syncing || isOfflineSyncDraining())
  }, [])

  const forceSync = useCallback(async () => {
    if (!online) return
    setSyncing(true)
    try {
      await drainOfflineSyncQueue()
    } finally {
      setSyncing(false)
      await refreshSnapshot()
    }
  }, [online, refreshSnapshot])

  const cacheOrders = useCallback(async (orders) => {
    await cacheOrdersSnapshot(orders)
    await refreshSnapshot()
  }, [refreshSnapshot])

  useEffect(() => {
    void openOfflineDb().then(() => refreshSnapshot())
  }, [refreshSnapshot])

  useEffect(() => {
    if (!online) return undefined
    if (!wasOffline) return undefined
    setSyncing(true)
    void drainOfflineSyncQueue()
      .then(() => clearWasOffline())
      .finally(() => {
        setSyncing(false)
        void refreshSnapshot()
      })
    return undefined
  }, [online, wasOffline, clearWasOffline, refreshSnapshot])

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshSnapshot()
    }, 5000)
    return () => window.clearInterval(id)
  }, [refreshSnapshot])

  const bannerMode = useMemo(() => {
    if (syncing) return OFFLINE_BANNER_MODE.SYNCING
    if (!online) return OFFLINE_BANNER_MODE.OFFLINE
    return OFFLINE_BANNER_MODE.ONLINE
  }, [online, syncing])

  const value = useMemo(
    () => ({
      bannerMode,
      pendingCount,
      conflictCount,
      syncing,
      refreshSnapshot,
      forceSync,
      cacheOrders,
    }),
    [bannerMode, pendingCount, conflictCount, syncing, refreshSnapshot, forceSync, cacheOrders],
  )

  return <OfflineFirstContext.Provider value={value}>{children}</OfflineFirstContext.Provider>
}

export function useOfflineFirst() {
  const ctx = useContext(OfflineFirstContext)
  if (!ctx) {
    throw new Error('useOfflineFirst: OfflineFirstProvider eksik (main.jsx).')
  }
  return ctx
}

/** Optional hook for components outside provider tree edge cases. */
export function useOfflineFirstOptional() {
  return useContext(OfflineFirstContext)
}
