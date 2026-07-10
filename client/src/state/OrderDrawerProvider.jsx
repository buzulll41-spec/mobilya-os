import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  canNavigateQueueNext,
  canNavigateQueuePrev,
  navigateQueueOrder,
  normalizeQueueContext,
  resolveOpenDrawerTab,
} from '../application/orderDrawerOrchestration.js'
import { useAuth } from './AuthProvider.jsx'

/** @typedef {import('../contracts/orderDrawer.js').OpenOrderDrawerOptions} OpenOrderDrawerOptions */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerTab} OrderDrawerTab */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerSource} OrderDrawerSource */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerQueueContext} OrderDrawerQueueContext */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {Object} OrderDrawerContextValue
 * @property {string | null} drawerOrderId
 * @property {OrderDrawerTab} drawerTab
 * @property {OrderDrawerSource | null} drawerSource
 * @property {OrderDrawerQueueContext | null} queue
 * @property {string | null} highlightOrderId
 * @property {boolean} canGoPrev
 * @property {boolean} canGoNext
 * @property {(orderId: string, options?: OpenOrderDrawerOptions) => void} openOrderDrawer
 * @property {() => void} closeOrderDrawer
 * @property {() => void} goToPrevOrder
 * @property {() => void} goToNextOrder
 * @property {(salesOrderListItemDtos: SalesOrderListItemDto[]) => void} goToNextOrderWithDtos
 */

const OrderDrawerContext = createContext(/** @type {OrderDrawerContextValue | null} */ (null))

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function OrderDrawerProvider({ children }) {
  const { user } = useAuth()
  const [drawerOrderId, setDrawerOrderId] = useState(/** @type {string | null} */ (null))
  const [drawerTab, setDrawerTab] = useState(/** @type {OrderDrawerTab} */ ('overview'))
  const [drawerSource, setDrawerSource] = useState(/** @type {OrderDrawerSource | null} */ (null))
  const [queue, setQueue] = useState(/** @type {OrderDrawerQueueContext | null} */ (null))
  const [preserveTabOnNavigate, setPreserveTabOnNavigate] = useState(true)
  const [highlightOrderId, setHighlightOrderId] = useState(/** @type {string | null} */ (null))
  const [dtoLookup, setDtoLookup] = useState(/** @type {SalesOrderListItemDto[] | null} */ (null))

  const openOrderDrawer = useCallback(
    /**
     * @param {string} orderId
     * @param {OpenOrderDrawerOptions} [options]
     */
    (orderId, options) => {
      const dto = dtoLookup?.find((d) => d.id === orderId)
      const tab = resolveOpenDrawerTab(options, user?.role, dto)
      const normalizedQueue = options?.queue
        ? normalizeQueueContext(orderId, options)
        : null
      setDrawerOrderId(orderId)
      setDrawerTab(tab)
      setDrawerSource(options?.source ?? normalizedQueue?.source ?? null)
      setQueue(normalizedQueue)
      setPreserveTabOnNavigate(options?.preserveTabOnNavigate !== false)
      setHighlightOrderId(orderId)
    },
    [user?.role, dtoLookup],
  )

  const closeOrderDrawer = useCallback(() => {
    if (drawerOrderId) setHighlightOrderId(drawerOrderId)
    setDrawerOrderId(null)
    setQueue(null)
    setDrawerSource(null)
  }, [drawerOrderId])

  const navigateRelative = useCallback(
    /**
     * @param {1 | -1} direction
     * @param {SalesOrderListItemDto[]} [dtos]
     */
    (direction, dtos) => {
      const nav = navigateQueueOrder(queue, direction)
      if (!nav) return
      const dto = (dtos ?? dtoLookup)?.find((d) => d.id === nav.orderId)
      const tab = preserveTabOnNavigate
        ? drawerTab
        : resolveOpenDrawerTab(
            { source: drawerSource ?? undefined },
            user?.role,
            dto,
          )
      setDrawerOrderId(nav.orderId)
      setDrawerTab(tab)
      setQueue(nav.nextQueue)
      setHighlightOrderId(nav.orderId)
    },
    [queue, preserveTabOnNavigate, drawerTab, drawerSource, user?.role, dtoLookup],
  )

  const goToPrevOrder = useCallback(() => navigateRelative(-1), [navigateRelative])
  const goToNextOrder = useCallback(() => navigateRelative(1), [navigateRelative])

  const goToNextOrderWithDtos = useCallback(
    /** @param {SalesOrderListItemDto[]} dtos */ (dtos) => navigateRelative(1, dtos),
    [navigateRelative],
  )

  const value = useMemo(
    () => ({
      drawerOrderId,
      drawerTab,
      drawerSource,
      queue,
      highlightOrderId,
      canGoPrev: canNavigateQueuePrev(queue),
      canGoNext: canNavigateQueueNext(queue),
      openOrderDrawer,
      closeOrderDrawer,
      goToPrevOrder,
      goToNextOrder,
      goToNextOrderWithDtos,
      /** @internal sync DTO list for tab resolution on open */
      _syncListItemDtos: setDtoLookup,
    }),
    [
      drawerOrderId,
      drawerTab,
      drawerSource,
      queue,
      highlightOrderId,
      openOrderDrawer,
      closeOrderDrawer,
      goToPrevOrder,
      goToNextOrder,
      goToNextOrderWithDtos,
    ],
  )

  return <OrderDrawerContext.Provider value={value}>{children}</OrderDrawerContext.Provider>
}

export function useOrderDrawer() {
  const ctx = useContext(OrderDrawerContext)
  if (!ctx) {
    throw new Error('useOrderDrawer must be used within OrderDrawerProvider')
  }
  return ctx
}

/**
 * @param {SalesOrderListItemDto[]} dtos
 */
export function useOrderDrawerDtoSync(dtos) {
  const ctx = useContext(OrderDrawerContext)
  useEffect(() => {
    if (ctx && '_syncListItemDtos' in ctx) {
      ctx._syncListItemDtos(dtos)
    }
  }, [ctx, dtos])
}
