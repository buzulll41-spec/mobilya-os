import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { readCachedOrders } from '../services/offline/offlineCacheStore.js'
import { useNetworkStatus } from './NetworkStatusProvider.jsx'
import { useOfflineFirst } from './OfflineFirstProvider.jsx'
import { toastInfo } from '../lib/toastBus.js'

const MOBILE_LAST_PAGE_KEY = 'mobilya-mobile-last-page-v1'

/** @type {import('react').Context<{
 *   online: boolean
 *   pendingSyncCount: number
 *   cachedListItemDtos: import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   usingCachedList: boolean
 * } | null>} */
const MobileOfflineFoundationContext = createContext(null)

/**
 * @param {{
 *   isPhoneViewport: boolean
 *   currentPage: string
 *   liveListItemDtos: import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   onRestorePage?: (page: string) => void
 *   children: import('react').ReactNode
 * }} props
 */
export function MobileOfflineFoundationProvider({
  isPhoneViewport,
  currentPage,
  liveListItemDtos,
  onRestorePage,
  children,
}) {
  const { online } = useNetworkStatus()
  const { pendingCount } = useOfflineFirst()
  const [cachedListItemDtos, setCachedListItemDtos] = useState(
    /** @type {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} */ ([]),
  )
  const restoredRef = useRef(false)
  const prevOnlineRef = useRef(online)

  useEffect(() => {
    if (!isPhoneViewport) return
    if (!currentPage) return
    try {
      localStorage.setItem(MOBILE_LAST_PAGE_KEY, currentPage)
    } catch {
      // ignore storage errors
    }
  }, [isPhoneViewport, currentPage])

  useEffect(() => {
    if (!isPhoneViewport) return
    if (restoredRef.current) return
    if (typeof window === 'undefined') return
    if (window.location.hash) {
      restoredRef.current = true
      return
    }
    restoredRef.current = true
    try {
      const savedPage = localStorage.getItem(MOBILE_LAST_PAGE_KEY)
      if (savedPage && savedPage !== currentPage) onRestorePage?.(savedPage)
    } catch {
      // ignore storage errors
    }
  }, [isPhoneViewport, currentPage, onRestorePage])

  useEffect(() => {
    let mounted = true
    void readCachedOrders().then((rows) => {
      if (mounted && Array.isArray(rows)) setCachedListItemDtos(rows)
    })
    return () => {
      mounted = false
    }
  }, [liveListItemDtos.length])

  useEffect(() => {
    if (!isPhoneViewport) {
      prevOnlineRef.current = online
      return
    }
    if (prevOnlineRef.current === false && online === true) {
      toastInfo('Baglanti tekrar kuruldu')
    }
    prevOnlineRef.current = online
  }, [isPhoneViewport, online])

  const usingCachedList = isPhoneViewport && !online && liveListItemDtos.length === 0 && cachedListItemDtos.length > 0

  const value = useMemo(
    () => ({
      online,
      pendingSyncCount: pendingCount,
      cachedListItemDtos,
      usingCachedList,
    }),
    [online, pendingCount, cachedListItemDtos, usingCachedList],
  )

  return (
    <MobileOfflineFoundationContext.Provider value={value}>
      {children}
    </MobileOfflineFoundationContext.Provider>
  )
}

export function useMobileOfflineFoundation() {
  const ctx = useContext(MobileOfflineFoundationContext)
  if (!ctx) {
    throw new Error('useMobileOfflineFoundation MobileOfflineFoundationProvider icinde kullanilmali')
  }
  return ctx
}

export function useMobileOfflineFoundationOptional() {
  return useContext(MobileOfflineFoundationContext)
}
