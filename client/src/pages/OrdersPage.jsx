import { useEffect, useMemo, useState } from 'react'
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import MosButton from '../components/MosButton.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import OrdersOpsDetailStrip from '../components/erp-ops/OrdersOpsDetailStrip.jsx'
import OrdersOpsTable from '../components/erp-ops/OrdersOpsTable.jsx'
import MobileOrderCardList from '../components/mobile/MobileOrderCardList.jsx'
import MobileStoreChipBar from '../components/mobile/MobileStoreChipBar.jsx'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { IconPlus } from '../components/Icons.jsx'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import { useOrders } from '../state/useOrders.js'
import { toastSuccess } from '../lib/toastBus.js'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { useSmartFilter } from '../hooks/useSmartFilter.js'
import { useViewportTier } from '../hooks/useViewportTier.js'
import { getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import { DEFAULT_ORDER_LIST_SORT, sortOrderListRows } from '../utils/orderListSort.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import { buildMobileOrderCardVm } from '../mappers/mobile/mobileStoreOpsModel.js'
import {
  ORDERS_OPS_FILTERS,
  buildOrdersOpsDetail,
  buildOrdersOpsSummary,
  buildOrdersOpsTableRow,
  countOrdersOpsFilter,
  filterOrdersOpsRows,
} from '../features/orders/ordersOpsCenterUi.js'
import '../styles/mos-erp-ops.css'

/** @typedef {import('../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../features/orders/ordersOpsCenterUi.js').OrdersOpsFilterId} OrdersOpsFilterId */
/** @typedef {'detail' | 'payment' | 'shipment' | 'contract'} OrderCardQuickAction */

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
  listItemDtos = [],
  todayIso,
  canCreateOrder = true,
  onOpenOrderModal,
  onOrderSelect,
  highlightOrderId = null,
}) {
  const { refreshOrders, isRefreshing } = useOrders()
  const viewportTier = useViewportTier()
  const isTouchStore = viewportTier === 'phone' || viewportTier === 'tablet'
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const { value: activeFilter, setValue: setActiveFilter } = useSmartFilter(
    /** @type {OrdersOpsFilterId} */ ('orders-ops-filter'),
    /** @type {OrdersOpsFilterId} */ ('all'),
  )
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()

  const scopedOrderRows = useMemo(
    () => filterItems(orderRows, getOrderPilotKind),
    [orderRows, filterItems],
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
    () => sortedOrders.map((o) => buildMobileOrderCardVm(o, dtoById.get(o.id), todayIso)),
    [sortedOrders, dtoById, todayIso],
  )

  const mobileFilterChips = useMemo(
    () => ORDERS_OPS_FILTERS.map((f) => ({ id: f.id, label: f.label })),
    [],
  )

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
    <div className="mos-page mos-erp-ops mos-erp-ops--orders">
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

      <SectionErrorBoundary label="Sipariş listesi">
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
      </SectionErrorBoundary>
    </div>
  )
}
