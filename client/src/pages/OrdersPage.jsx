import { useEffect, useMemo, useRef, useState } from 'react'
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import MosButton from '../components/MosButton.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import OrdersOpsDetailStrip from '../components/erp-ops/OrdersOpsDetailStrip.jsx'
import OrdersOpsTable from '../components/erp-ops/OrdersOpsTable.jsx'
import MobileStoreChipBar from '../components/mobile/MobileStoreChipBar.jsx'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { IconPlus } from '../components/Icons.jsx'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import {
  AppHeader,
  Badge,
  EmptyState,
  FilterChips,
  FloatingActionButton,
  LoadingSkeleton,
  MobileScreenShell,
  PrimaryListItem,
  SearchBar,
} from '../mobile/design-system/MobileOpsV2Components.jsx'
import { useAuth } from '../state/AuthProvider.jsx'
import { useOrders } from '../state/useOrders.js'
import { toastSuccess } from '../lib/toastBus.js'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { useSmartFilter } from '../hooks/useSmartFilter.js'
import { useCompactPhoneViewport, useViewportTier } from '../hooks/useViewportTier.js'
import { getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import { DEFAULT_ORDER_LIST_SORT, sortOrderListRows } from '../utils/orderListSort.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import { buildMobileOrderCardVm } from '../mappers/mobile/mobileStoreOpsModel.js'
import { formatShortDate } from '../utils/dates.js'
import { parseOrderProductSummary } from '../utils/orderProductSummary.js'
import {
  ORDERS_OPS_FILTERS,
  buildOrdersOpsDetail,
  buildOrdersOpsSummary,
  buildOrdersOpsTableRow,
  countOrdersOpsFilter,
  filterOrdersOpsRows,
} from '../features/orders/ordersOpsCenterUi.js'
import '../styles/mos-erp-ops.css'
import '../styles/orders-mobile-v1.css'
import '../mobile/design-system/MobileOpsV2.css'

/** @typedef {import('../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../features/orders/ordersOpsCenterUi.js').OrdersOpsFilterId} OrdersOpsFilterId */
/** @typedef {'detail' | 'payment' | 'shipment' | 'contract'} OrderCardQuickAction */

const LONG_PRESS_MS = 420

const MOBILE_ORDER_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tümü' },
  { id: 'new', label: 'Yeni' },
  { id: 'production', label: 'Üretim' },
  { id: 'shipment', label: 'Sevkiyat' },
  { id: 'collection', label: 'Tahsilat' },
  { id: 'overdue', label: 'Geciken' },
])

/** @typedef {typeof MOBILE_ORDER_FILTERS[number]['id']} MobileOrderFilterId */

/**
 * @param {import('../mappers/mobile/mobileStoreOpsModel.js').MobileOrderCardVm} card
 * @param {SalesOrderListItemDto | undefined} dto
 */
function resolveCardStatusLabel(card, dto) {
  const remaining = dto?.remainingAmount?.value != null
    ? Number(dto.remainingAmount.value)
    : Number.NaN
  if (card.statusLabel === 'Teslim Edildi') return 'Teslim Edildi'
  if (card.statusLabel === 'İptal') return 'İptal'
  if (dto?.inTransitShipmentCount && dto.inTransitShipmentCount > 0) return 'Sevkte'
  if (remaining > 0.009 && dto?.hasOverdueBalance) return 'Tahsilat Bekliyor'
  if (card.statusLabel === 'Hazır' || card.shipmentLabel === 'Yolda' || card.shipmentLabel === 'Planlı') return 'Sevkte'
  if (card.statusLabel === 'Üretimde' || card.statusLabel === 'Bekleniyor' || card.statusLabel === 'Geldi') return 'Hazırlanıyor'
  if (remaining > 0.009) return 'Tahsilat Bekliyor'
  return card.statusLabel || 'Hazırlanıyor'
}

/** @param {number} value */
function clampProgress(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

/**
 * @param {import('../mappers/mobile/mobileStoreOpsModel.js').MobileOrderCardVm} card
 * @param {SalesOrderListItemDto | undefined} dto
 */
function resolveProgressPercent(card, dto) {
  const ratio = dto?.paymentProgress != null ? Number(dto.paymentProgress) : Number.NaN
  if (Number.isFinite(ratio)) {
    return clampProgress(ratio * 100)
  }
  if (card.statusLabel === 'Teslim Edildi') return 100
  if (card.statusLabel === 'Yolda' || card.shipmentLabel === 'Yolda') return 88
  if (card.statusLabel === 'Hazır' || card.shipmentLabel === 'Planlı') return 72
  if (card.statusLabel === 'Üretimde' || card.statusLabel === 'Geldi') return 48
  if (card.statusLabel === 'Bekleniyor') return 20
  return 32
}

/** @param {string | undefined} phone */
function resolveWhatsAppHref(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  const normalized = digits.startsWith('90') ? digits : digits.startsWith('0') ? `90${digits.slice(1)}` : `90${digits}`
  return `https://wa.me/${normalized}`
}

/** @param {OrderListRowVM | undefined} order */
function resolveMapsHref(order) {
  const query = [order?.customer, order?.orderNumber, order?.product ? parseOrderProductSummary(order.product).firstTitle : '']
    .filter(Boolean)
    .join(' ')
    .trim()
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

/** @param {OrderListRowVM | undefined} order */
function resolvePhoneLabel(order) {
  const phone = order?.phone?.trim() || order?.phone2?.trim() || ''
  return phone || 'Telefon yok'
}

/** @param {string} fullName */
function initialsFrom(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return 'MO'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

/** @param {import('../contracts/v1/user.js').UserRole | undefined | null} role */
function roleLabel(role) {
  if (role === 'MANAGER') return 'Magaza Muduru'
  if (role === 'SALES') return 'Satis Uzmani'
  if (role === 'OPERATION') return 'Operasyon Uzmani'
  if (role === 'SERVICE') return 'Servis Uzmani'
  if (role === 'FINANCE') return 'Finans Uzmani'
  if (role === 'WAREHOUSE') return 'Depo Uzmani'
  if (role === 'ADMIN') return 'Yonetici'
  return 'Operasyon Uzmani'
}

/**
 * @param {import('../mappers/mobile/mobileStoreOpsModel.js').MobileOrderCardVm} card
 * @param {OrderListRowVM | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {MobileOrderFilterId} filter
 * @param {string} todayIso
 */
function matchesMobileFilter(card, order, dto, filter, todayIso) {
  if (filter === 'all') return true
  if (filter === 'new') {
    return Boolean(order?.orderDate) && order.orderDate >= todayIso
  }
  if (filter === 'production') {
    return ['Üretimde', 'Bekleniyor', 'Geldi', 'Kısmi Geldi'].includes(card.statusLabel)
  }
  if (filter === 'shipment') {
    return card.statusLabel === 'Hazır' || card.shipmentLabel === 'Planlı' || card.shipmentLabel === 'Yolda' || (dto?.inTransitShipmentCount ?? 0) > 0
  }
  if (filter === 'collection') {
    return (dto?.hasOverdueBalance ?? false) || card.balanceLabel !== 'Kapandı'
  }
  if (filter === 'overdue') {
    return Boolean(dto?.hasOverdueBalance)
  }
  return true
}

/**
 * @param {{
 *   orderRows: OrderListRowVM[]
 *   listItemDtos?: SalesOrderListItemDto[]
 *   todayIso: string
 *   canCreateOrder?: boolean
 *   onOpenOrderModal: () => void
 *   onOrderSelect: (order: OrderListRowVM, options?: import('../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   highlightOrderId?: string | null
 * }} props
 */
export default function OrdersPage({
  orderRows,
  orders = [],
  listItemDtos = [],
  todayIso,
  canCreateOrder = true,
  onOpenOrderModal,
  onOrderSelect,
  highlightOrderId = null,
  globalSearch = '',
  onGlobalSearchChange,
  onSearchSelect,
  onCommitSearch,
}) {
  const { user } = useAuth()
  const { refreshOrders, isRefreshing, loading, error } = useOrders()
  const viewportTier = useViewportTier()
  const isCompactPhone = useCompactPhoneViewport()
  const isPhone = viewportTier === 'phone'
  const isTouchStore = viewportTier === 'phone' || viewportTier === 'tablet'
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const { value: activeFilter, setValue: setActiveFilter } = useSmartFilter(
    /** @type {OrdersOpsFilterId} */ ('orders-ops-filter'),
    /** @type {OrdersOpsFilterId} */ ('all'),
  )
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))
  const [mobileFilter, setMobileFilter] = useState(/** @type {MobileOrderFilterId} */ ('all'))
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const longPressTimerRef = useRef(/** @type {number | null} */ (null))
  const longPressTriggeredRef = useRef(false)
  const longPressTargetRef = useRef(/** @type {string | null} */ (null))
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()
  const [swipeOpenId, setSwipeOpenId] = useState(/** @type {string | null} */ (null))
  const [swipeOpenSide, setSwipeOpenSide] = useState(/** @type {'left' | 'right' | null} */ (null))
  const [swipeDraggingId, setSwipeDraggingId] = useState(/** @type {string | null} */ (null))
  const [swipeDx, setSwipeDx] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [pulling, setPulling] = useState(false)
  const swipeStartXRef = useRef(0)
  const pullStartYRef = useRef(/** @type {number | null} */ (null))

  const scopedOrderRows = useMemo(
    () => filterItems(orderRows, getOrderPilotKind),
    [orderRows, filterItems],
  )

  const orderById = useMemo(
    () => new Map(scopedOrderRows.map((o) => [o.id, o])),
    [scopedOrderRows],
  )

  const dtoById = useMemo(
    () => new Map(listItemDtos.map((d) => [d.id, d])),
    [listItemDtos],
  )

  const filteredOrders = useMemo(
    () => filterOrdersOpsRows(scopedOrderRows, dtoById, activeFilter, todayIso),
    [scopedOrderRows, dtoById, activeFilter, todayIso],
  )

  const sortedOrders = useMemo(
    () => sortOrderListRows(filteredOrders, DEFAULT_ORDER_LIST_SORT),
    [filteredOrders],
  )

  const tableRows = useMemo(
    () => sortedOrders.map((o) => buildOrdersOpsTableRow(o, dtoById.get(o.id), todayIso)),
    [sortedOrders, dtoById, todayIso],
  )

  const mobileOrderCards = useMemo(
    () =>
      sortedOrders.map((o) => {
        const dto = dtoById.get(o.id)
        const base = buildMobileOrderCardVm(o, dto, todayIso)
        const activeStage = resolveCardStatusLabel(base, dto)
        const nextStep =
          activeStage === 'Tahsilat Bekliyor'
            ? 'Tahsilat al'
            : activeStage === 'Sevkte'
              ? 'Teslim et'
              : activeStage === 'Hazırlanıyor'
                ? 'Uretimi tamamla'
                : 'Musteriyi bilgilendir'
        return {
          ...base,
          activeStage,
          nextStep,
          progressPercent: resolveProgressPercent(base, dto),
          deliveryDateLabel: o.shipmentDate ? formatShortDate(o.shipmentDate) : 'Plan yok',
        }
      }),
    [sortedOrders, dtoById, todayIso],
  )

  const mobileOrderRows = useMemo(
    () =>
      mobileOrderCards.map((card) => {
        const order = orderById.get(card.id)
        const dto = dtoById.get(card.id)
        const summary = parseOrderProductSummary(order?.product)
        const statusLabel = resolveCardStatusLabel(card, dto)
        const statusTone =
          statusLabel === 'Tahsilat Bekliyor'
            ? 'red'
            : statusLabel === 'Sevkte'
              ? 'orange'
              : statusLabel === 'Hazırlanıyor'
                ? 'blue'
                : statusLabel === 'Teslim Edildi'
                  ? 'green'
                  : 'gray'

        return {
          id: card.id,
          order,
          customer: card.customer,
          productGroup: summary.firstTitle,
          orderDate: formatShortDate(order?.orderDate ?? todayIso),
          amountLabel: card.amountLabel ?? '—',
          orderNo: card.orderNo,
          statusLabel,
          statusTone,
          phoneLabel: resolvePhoneLabel(order),
          whatsappHref: resolveWhatsAppHref(order?.phone ?? order?.phone2),
          mapsHref: resolveMapsHref(order),
        }
      }),
    [mobileOrderCards, orderById, dtoById, todayIso],
  )

  const mobileFilterChips = useMemo(
    () => ORDERS_OPS_FILTERS.map((f) => ({ id: f.id, label: f.label })),
    [],
  )

  const mobileCardsFiltered = useMemo(
    () => mobileOrderCards.filter((card) => matchesMobileFilter(card, orderById.get(card.id), dtoById.get(card.id), mobileFilter, todayIso)),
    [mobileOrderCards, orderById, dtoById, mobileFilter, todayIso],
  )

  const mobileVisibleRowIds = useMemo(
    () => new Set(mobileCardsFiltered.map((card) => card.id)),
    [mobileCardsFiltered],
  )

  const userInitials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const userRoleLabel = useMemo(() => roleLabel(user?.role), [user?.role])

  const mobileFilterCounts = useMemo(() => {
    /** @type {Record<MobileOrderFilterId, number>} */
    const counts = {
      all: 0,
      new: 0,
      production: 0,
      shipment: 0,
      collection: 0,
      overdue: 0,
    }
    for (const card of mobileOrderCards) {
      counts.all += 1
      for (const item of MOBILE_ORDER_FILTERS) {
        if (item.id === 'all') continue
        if (matchesMobileFilter(card, orderById.get(card.id), dtoById.get(card.id), item.id, todayIso)) {
          counts[item.id] += 1
        }
      }
    }
    return counts
  }, [mobileOrderCards, orderById, dtoById, todayIso])

  const notificationCount = useMemo(() => mobileFilterCounts.overdue, [mobileFilterCounts])

  const summaryMetrics = useMemo(
    () => buildOrdersOpsSummary(scopedOrderRows, dtoById, todayIso),
    [scopedOrderRows, dtoById, todayIso],
  )

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of ORDERS_OPS_FILTERS) {
      counts[f.id] = countOrdersOpsFilter(scopedOrderRows, dtoById, f.id, todayIso)
    }
    return counts
  }, [scopedOrderRows, dtoById, todayIso])

  const selectedOrder = useMemo(
    () => sortedOrders.find((o) => o.id === selectedRowId) ?? sortedOrders[0] ?? null,
    [sortedOrders, selectedRowId],
  )

  const detailView = useMemo(
    () =>
      selectedOrder ? buildOrdersOpsDetail(selectedOrder, dtoById.get(selectedOrder.id), todayIso) : null,
    [selectedOrder, dtoById, todayIso],
  )

  useEffect(() => {
    if (tableRows.length === 0) {
      setSelectedRowId(null)
      return
    }
    if (!tableRows.some((r) => r.id === selectedRowId)) {
      setSelectedRowId(tableRows[0].id)
    }
  }, [tableRows, selectedRowId])

  useEffect(() => {
    if (highlightOrderId && tableRows.some((r) => r.id === highlightOrderId)) {
      setSelectedRowId(highlightOrderId)
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-order-row-id="${highlightOrderId}"]`)
          ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }
  }, [highlightOrderId, tableRows])

  useEffect(() => {
    if (!selectionMode) {
      setSelectedIds(new Set())
    }
  }, [selectionMode])

  function clearLongPressTimer() {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  /** @param {string} id */
  function toggleSelection(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /** @param {string} id */
  function handleCardPressStart(id) {
    if (!isPhone) return
    clearLongPressTimer()
    longPressTriggeredRef.current = false
    longPressTargetRef.current = id
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      setSelectionMode(true)
      toggleSelection(id)
      clearLongPressTimer()
    }, LONG_PRESS_MS)
  }

  function handleCardPressEnd() {
    clearLongPressTimer()
  }

  /** @param {OrderListRowVM} order */
  function handleSwipeStart(order, event) {
    const touch = event.touches?.[0]
    if (!touch) return
    swipeStartXRef.current = touch.clientX
    setSwipeDraggingId(order.id)
    setSwipeDx(0)
  }

  /** @param {OrderListRowVM} order */
  function handleSwipeMove(order, event) {
    if (swipeDraggingId !== order.id) return
    const touch = event.touches?.[0]
    if (!touch) return
    const rawDx = touch.clientX - swipeStartXRef.current
    if (Math.abs(rawDx) <= 2) {
      setSwipeDx(0)
      return
    }
    setSwipeDx(Math.max(-124, Math.min(124, rawDx)))
  }

  /** @param {OrderListRowVM} order */
  function handleSwipeEnd(order) {
    if (swipeDraggingId !== order.id) return
    const shouldOpen = Math.abs(swipeDx) > 48
    setSwipeOpenId(shouldOpen ? order.id : null)
    setSwipeOpenSide(shouldOpen ? (swipeDx > 0 ? 'left' : 'right') : null)
    setSwipeDraggingId(null)
    setSwipeDx(0)
  }

  function handlePullStart(event) {
    if (!isPhone || window.scrollY > 2) return
    const touch = event.touches?.[0]
    if (!touch) return
    pullStartYRef.current = touch.clientY
    setPulling(true)
  }

  function handlePullMove(event) {
    if (!pulling || pullStartYRef.current == null) return
    if (window.scrollY > 2) return
    const touch = event.touches?.[0]
    if (!touch) return
    const delta = touch.clientY - pullStartYRef.current
    if (delta <= 0) {
      setPullDistance(0)
      return
    }
    setPullDistance(Math.min(88, delta))
  }

  async function handlePullEnd() {
    const shouldRefresh = pullDistance >= 58
    pullStartYRef.current = null
    setPulling(false)
    setPullDistance(0)
    if (!shouldRefresh) return
    await refreshOrders()
    setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
  }

  /** @param {OrderListRowVM} order */
  function handleMobileCardOpen(order) {
    if (selectionMode || longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      toggleSelection(order.id)
      return
    }
    openOrderWithQueue(order)
  }

  /** @param {OrderListRowVM} order */
  function openOrderWithQueue(order) {
    onOrderSelect(order, {
      source: 'orders',
      queue: buildDrawerQueue({
        queueId: `orders:${activeFilter}`,
        filterSnapshot: { filter: activeFilter },
        sort: DEFAULT_ORDER_LIST_SORT,
        rowIds: sortedOrders.map((o) => o.id),
        activeOrderId: order.id,
        source: 'orders',
      }),
    })
  }

  /** @param {string} metricId */
  function handleSummaryClick(metricId) {
    switch (metricId) {
      case 'production':
        setActiveFilter('production')
        break
      case 'shipment-wait':
        setActiveFilter('shipment-wait')
        break
      case 'critical':
        setActiveFilter('critical')
        break
      case 'collection-risk':
        setActiveFilter('all')
        break
      default:
        setActiveFilter('all')
    }
  }

  return (
    <div className={`mos-page mos-erp-ops mos-erp-ops--orders${isCompactPhone ? ' mos-erp-ops--orders-phone' : ''}`}>
      {!isPhone ? (
        <>
          <PageRefreshBar
            title="Sipariş listesini yenile"
            onRefresh={async () => {
              await refreshOrders()
              setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
              toastSuccess('Siparişler yenilendi')
            }}
            refreshing={isRefreshing}
            updatedAt={lastRefresh}
          />
          <header className="mos-erp-ops__head">
            <div className="mos-erp-ops__head-copy">
              <h1 className="mos-erp-ops__title">Siparişler</h1>
              <span className="mos-erp-ops__sub">
                Operasyon merkezi · {tableRows.length} kayıt listede
              </span>
            </div>
            <div className="mos-erp-ops__head-actions">
              <PilotScopeToggle
                scope={scope}
                onScopeChange={setScope}
                canToggle={canToggle}
                hint={modeHint}
              />
              {canCreateOrder ? (
                <MosButton context="head" tone="primary" label="Sipariş ekle" onClick={onOpenOrderModal}>
                  <IconPlus />
                  Sipariş ekle
                </MosButton>
              ) : null}
            </div>
          </header>

          <SectionErrorBoundary label="Sipariş özeti">
            <ErpOpsSummaryStrip
              metrics={summaryMetrics}
              ariaLabel="Sipariş operasyon özeti"
              onMetricClick={handleSummaryClick}
              summaryClassName="mos-erp-summary--cols-5"
            />
          </SectionErrorBoundary>
        </>
      ) : null}

      <SectionErrorBoundary label="Sipariş listesi">
        {isPhone ? (
          <div
            className="evm-order-list-v1 evm-orders-v2"
            onTouchStart={handlePullStart}
            onTouchMove={handlePullMove}
            onTouchEnd={handlePullEnd}
            onTouchCancel={handlePullEnd}
          >
            <MobileScreenShell
              className="evm-order-list-v1__top"
              header={
                <AppHeader
                  eyebrow="Siparisi bul ve yonet"
                  title="Siparişler"
                  subtitle={`${mobileCardsFiltered.length} sipariş · mobil odaklı liste`}
                  meta={`${userRoleLabel} • Merkez Magaza`}
                  unreadCount={notificationCount}
                  initials={userInitials}
                  onOpenMenu={() => {
                    window.location.hash = '#/mobile/menu'
                  }}
                />
              }
              search={
                <SearchBar
                  value={globalSearch}
                  onValueChange={(value) => onGlobalSearchChange?.(value)}
                  placeholder="Siparis ara"
                  onRefresh={async () => {
                    await refreshOrders()
                    setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
                  }}
                />
              }
              filter={
                <FilterChips
                  items={MOBILE_ORDER_FILTERS.map((filterItem) => ({
                    id: filterItem.id,
                    label: filterItem.label,
                    count: mobileFilterCounts[filterItem.id],
                  }))}
                  activeId={mobileFilter}
                  onSelect={(id) => setMobileFilter(/** @type {MobileOrderFilterId} */ (id))}
                  ariaLabel="Sipariş filtreleri"
                />
              }
              fab={canCreateOrder ? (
                <FloatingActionButton
                  label="Yeni Sipariş"
                  icon={<IconPlus />}
                  onPress={onOpenOrderModal}
                  ariaLabel="Yeni Sipariş"
                />
              ) : null}
            >

              {pullDistance > 0 ? (
                <div className="evm-order-list-v1__pull" role="status" aria-live="polite">
                  <span>{pullDistance >= 58 ? 'Yenilemek için bırak' : 'Yenilemek için çek'}</span>
                </div>
              ) : null}

              {error ? (
                <div className="evm-order-list-v1__error" role="alert">
                  <strong>Liste yüklenemedi</strong>
                  <button
                    type="button"
                    onClick={async () => {
                      await refreshOrders()
                      setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
                    }}
                  >
                    Tekrar dene
                  </button>
                </div>
              ) : null}

              {selectionMode ? (
                <div className="evm-order-list-v1__selection-bar" role="status" aria-live="polite">
                  <strong>Seçim modu · {selectedIds.size} sipariş</strong>
                  <button type="button" onClick={() => setSelectionMode(false)}>Kapat</button>
                </div>
              ) : null}

              <ul className="evm-order-list-v1__cards" aria-label="Sipariş kartları">
                {loading ? (
                  <li className="evm-order-list-v1__skeleton-wrap">
                    <LoadingSkeleton rows={8} />
                  </li>
                ) : mobileCardsFiltered.length === 0 ? (
                  <li className="evm-order-list-v1__empty">
                    <EmptyState
                      title="Siparis bulunamadi"
                      description="Bu filtre ve arama ile eslesen kayit yok"
                      actionLabel="Filtreyi temizle"
                      onAction={() => {
                        setMobileFilter('all')
                        onGlobalSearchChange?.('')
                      }}
                    />
                  </li>
                ) : (
                  mobileOrderRows
                    .filter((row) => mobileVisibleRowIds.has(row.id))
                    .map((row) => {
                    if (!row.order) return null
                    const selected = selectedIds.has(row.id)
                    const isOpen = swipeOpenId === row.id
                    const isDragging = swipeDraggingId === row.id
                    const swipeSide = isOpen ? swipeOpenSide : null
                    const offset = isDragging ? swipeDx : isOpen ? (swipeSide === 'left' ? 108 : -108) : 0
                    return (
                      <li key={row.id} className="evm-order-list-v1__item-wrap">
                        <div className="evm-order-list-v1__swipe-actions is-left" aria-hidden={swipeSide !== 'left'}>
                          <button
                            type="button"
                            className="evm-order-list-v1__swipe-btn is-search"
                            onClick={() => {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              handleMobileCardOpen(row.order)
                            }}
                          >
                            Ara
                          </button>
                          <button
                            type="button"
                            className="evm-order-list-v1__swipe-btn is-whatsapp"
                            onClick={() => {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              if (row.whatsappHref) window.open(row.whatsappHref, '_blank', 'noopener,noreferrer')
                            }}
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            className="evm-order-list-v1__swipe-btn is-location"
                            onClick={() => {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              if (row.mapsHref) window.open(row.mapsHref, '_blank', 'noopener,noreferrer')
                            }}
                          >
                            Konum
                          </button>
                        </div>
                        <div className="evm-order-list-v1__swipe-actions is-right" aria-hidden={swipeSide !== 'right'}>
                          <button
                            type="button"
                            className="evm-order-list-v1__swipe-btn is-edit"
                            onClick={() => {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              onOrderSelect(row.order)
                            }}
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="evm-order-list-v1__swipe-btn is-pdf"
                            onClick={() => {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              onOrderSelect(row.order, { tab: 'contract' })
                            }}
                          >
                            PDF
                          </button>
                          <button
                            type="button"
                            className="evm-order-list-v1__swipe-btn is-deliver"
                            onClick={() => {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              onOrderSelect(row.order, { tab: 'shipment' })
                            }}
                          >
                            Teslim Et
                          </button>
                        </div>
                        <PrimaryListItem
                          className={`evm-order-list-v1__card-row${selected ? ' is-selected' : ''}`}
                          title={row.customer}
                          subtitle={row.productGroup}
                          metaLeft={`${row.orderDate} · ${row.phoneLabel}`}
                          metaRight={`#${row.orderNo}`}
                          badge={<Badge label={row.statusLabel} tone={row.statusTone} />}
                          trailing={<strong className="evm-order-list-v1__amount">{row.amountLabel}</strong>}
                          style={{ transform: `translateX(${offset}px)` }}
                          onPress={() => {
                            if (swipeOpenId && swipeOpenId !== row.id) {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              return
                            }
                            if (swipeOpenId === row.id) {
                              setSwipeOpenId(null)
                              setSwipeOpenSide(null)
                              return
                            }
                            handleMobileCardOpen(row.order)
                          }}
                          buttonProps={{
                            onMouseDown: () => handleCardPressStart(row.id),
                            onMouseUp: handleCardPressEnd,
                            onMouseLeave: handleCardPressEnd,
                            onTouchStart: (event) => {
                              handleCardPressStart(row.id)
                              handleSwipeStart(row.order, event)
                            },
                            onTouchMove: (event) => handleSwipeMove(row.order, event),
                            onTouchEnd: () => {
                              handleCardPressEnd()
                              handleSwipeEnd(row.order)
                            },
                            onTouchCancel: () => {
                              handleCardPressEnd()
                              handleSwipeEnd(row.order)
                            },
                          }}
                        />
                      </li>
                    )
                    })
                )}
              </ul>
            </MobileScreenShell>
          </div>
        ) : (
          <div className="mos-erp-ops__workspace">
            <ErpOpsLeftFilters
              groups={[{ title: 'Operasyon', options: ORDERS_OPS_FILTERS }]}
              activeFilter={activeFilter}
              filterCounts={filterCounts}
              onFilterChange={(id) => setActiveFilter(/** @type {OrdersOpsFilterId} */ (id))}
              ariaLabel="Sipariş filtreleri"
            />

            <div className="mos-erp-ops__main">
              {isTouchStore ? (
                <div className="mos-store-ops-mobile-only">
                  <MobileStoreChipBar
                    items={mobileFilterChips}
                    activeId={activeFilter}
                    onSelect={(id) => setActiveFilter(/** @type {OrdersOpsFilterId} */ (id))}
                    ariaLabel="Sipariş filtreleri"
                  />
                  <MobileOrderCardList
                    cards={mobileOrderCards}
                    selectedRowId={selectedOrder?.id ?? null}
                    onOpenCard={(id) => {
                      const order = sortedOrders.find((o) => o.id === id)
                      if (order) openOrderWithQueue(order)
                    }}
                    onNewOrder={canCreateOrder ? onOpenOrderModal : undefined}
                    onClearFilters={() => setActiveFilter('all')}
                  />
                </div>
              ) : null}

              <OrdersOpsDetailStrip
                view={detailView}
                onOpen={() => {
                  if (selectedOrder) openOrderWithQueue(selectedOrder)
                }}
              />

              <section className="mos-erp-ops__table-panel mos-store-ops-desktop-only" aria-label="Sipariş listesi">
                <OrdersOpsTable
                  rows={tableRows}
                  selectedRowId={selectedOrder?.id ?? null}
                  onSelectRow={(row) => setSelectedRowId(row.id)}
                  onOpenRow={(row) => {
                    const order = sortedOrders.find((o) => o.id === row.id)
                    if (order) openOrderWithQueue(order)
                  }}
                />
              </section>
            </div>
          </div>
        )}
      </SectionErrorBoundary>
    </div>
  )
}
