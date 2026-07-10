import { useEffect, useMemo, useState } from 'react'
import {
  COLLECTION_FILTERS,
  filterCollectionRows,
  PRIORITY_CALL_LIMIT,
} from '../mappers/collection/collectionCommandCenterModel.js'
import { MOBILE_COLLECTION_PRIORITY_CHIPS } from '../mappers/mobile/mobileStoreOpsModel.js'
import { consumeOpsDeepLink } from '../lib/opsDeepLink.js'
import { remainingBalance } from '../utils/orderFinance.js'
import { paymentCollectionPercent } from '../utils/orderCardUi.js'
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx'
import CollectionOpsCustomerCard from '../features/collection/ops-center/CollectionOpsCustomerCard.jsx'
import CollectionOpsLeftPanel from '../features/collection/ops-center/CollectionOpsLeftPanel.jsx'
import CollectionOpsSummaryBar from '../features/collection/ops-center/CollectionOpsSummaryBar.jsx'
import CollectionOpsTable from '../features/collection/ops-center/CollectionOpsTable.jsx'
import CollectionPendingApprovalTable from '../features/collection/ops-center/CollectionPendingApprovalTable.jsx'
import CollectionCenterPanel from '../features/collection/CollectionCenterPanel.jsx'
import MobileStoreChipBar from '../components/mobile/MobileStoreChipBar.jsx'
import MobileStoreEmptyState from '../components/mobile/MobileStoreEmptyState.jsx'
import {
  buildPendingApprovalQueueRows,
  loadPendingApprovalPayments,
  loadPaymentsIndexForOrders,
} from '../mappers/collection/collectionPendingApprovalQueueModel.js'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { MOBILE_FAB_EVENT } from '../constants/mobileFabActions.js'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import { useOrders } from '../state/useOrders.js'
import { toastSuccess } from '../lib/toastBus.js'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { useViewportTier } from '../hooks/useViewportTier.js'
import { getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import {
  buildOpsCenterView,
  buildOpsCustomerCardModel,
  countByFilter,
} from '../features/collection/ops-center/collectionOpsCenterUi.js'
import { buildErpTableRow } from '../features/collection/collectionErpTableUi.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import '../styles/collection-ops-center.css'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerQueueContext} OrderDrawerQueueContext */
/** @typedef {import('../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId} CollectionFilterId */
/** @typedef {import('../features/collection/ops-center/collectionOpsCenterUi.js').OpsDateFilterId} OpsDateFilterId */

/**
 * @param {{
 *   collectionRows: CollectionRowVM[]
 *   listItemDtos?: import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   getOrderById?: (orderId: string) => Order | undefined
 *   postOrderPayment?: (orderId: string, body: { amount: number, method: string, note?: string }) => Promise<void>
 *   mutating?: boolean
 *   domainEvents?: DomainEventDto[]
 *   onOpenOrder?: (row: CollectionRowVM, options?: import('../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   highlightOrderId?: string | null
 *   globalSearch?: string
 *   onClearGlobalSearch?: () => void
 *   onRefreshOrders?: () => void | Promise<void>
 * }} props
 */
export default function CollectionPage({
  collectionRows,
  listItemDtos = [],
  todayIso,
  getOrderById,
  postOrderPayment,
  mutating = false,
  domainEvents = [],
  onOpenOrder,
  highlightOrderId = null,
  globalSearch = '',
  onClearGlobalSearch,
  onRefreshOrders,
}) {
  /** @type {[CollectionFilterId, import('react').Dispatch<import('react').SetStateAction<CollectionFilterId>>]} */
  const [activeFilter, setActiveFilter] = useState('all')
  /** @type {[OpsDateFilterId, import('react').Dispatch<import('react').SetStateAction<OpsDateFilterId>>]} */
  const [dateFilter, setDateFilter] = useState('all')
  const [mailOrderSupplierFilterId, setMailOrderSupplierFilterId] = useState('')
  const [paymentsByOrderId, setPaymentsByOrderId] = useState(
    /** @type {Map<string, import('../contracts/v1/payment.js').PaymentTransactionDto[]>} */ (new Map()),
  )
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))
  const [paymentRefreshKey, setPaymentRefreshKey] = useState(0)
  const [panelQueue, setPanelQueue] = useState(/** @type {OrderDrawerQueueContext | null} */ (null))
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const filter = consumeOpsDeepLink('collection')
    if (
      filter === 'critical' ||
      filter === 'overdue' ||
      filter === 'partial' ||
      filter === 'none' ||
      filter === 'pending-approval'
    ) {
      setActiveFilter(filter)
    }
  }, [])
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()
  const viewportTier = useViewportTier()
  const isTouchStore = viewportTier === 'phone' || viewportTier === 'tablet'
  const { refreshOrders, isRefreshing } = useOrders()
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const [mobileCollectionChip, setMobileCollectionChip] = useState('balance')

  const scopedCollectionRows = useMemo(
    () => filterItems(collectionRows, getOrderPilotKind),
    [collectionRows, filterItems],
  )

  const dtoById = useMemo(
    () => new Map(listItemDtos.map((d) => [d.id, d])),
    [listItemDtos],
  )

  const openRows = useMemo(
    () => scopedCollectionRows.filter((row) => remainingBalance(row) > 0.009),
    [scopedCollectionRows],
  )

  const filterOptions = useMemo(
    () => ({
      ...(mailOrderSupplierFilterId ? { mailOrderSupplierId: mailOrderSupplierFilterId } : {}),
      paymentsByOrderId,
    }),
    [mailOrderSupplierFilterId, paymentsByOrderId],
  )

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const filter of COLLECTION_FILTERS) {
      const source =
        filter.id === 'pending-approval' ||
        filter.id === 'approved-payments' ||
        filter.id === 'rejected-payments' ||
        filter.id === 'mail-order'
          ? scopedCollectionRows
          : openRows
      counts[filter.id] = filterCollectionRows(source, filter.id, todayIso, dtoById, filterOptions).length
    }
    return counts
  }, [openRows, scopedCollectionRows, todayIso, dtoById, filterOptions])

  const view = useMemo(
    () => buildOpsCenterView(scopedCollectionRows, activeFilter, dateFilter, todayIso, dtoById, filterOptions),
    [scopedCollectionRows, activeFilter, dateFilter, todayIso, dtoById, filterOptions],
  )

  useEffect(() => {
    if (view.cards.length === 0) {
      setSelectedRowId(null)
      return
    }
    const visible = view.cards.some((c) => c.row.id === selectedRowId)
    if (!visible) {
      setSelectedRowId(view.cards[0].row.id)
    }
  }, [view.cards, selectedRowId])

  const selectedCard = useMemo(
    () => view.cards.find((c) => c.row.id === selectedRowId) ?? view.cards[0] ?? null,
    [view.cards, selectedRowId],
  )

  const customerView = useMemo(
    () => buildOpsCustomerCardModel(selectedCard, todayIso),
    [selectedCard, todayIso],
  )

  useEffect(() => {
    if (highlightOrderId && view.cards.some((c) => c.row.id === highlightOrderId)) {
      setSelectedRowId(highlightOrderId)
    }
  }, [highlightOrderId, view.cards])

  useEffect(() => {
    /** @param {Event} event */
    function onMobileFab(event) {
      const detail = /** @type {CustomEvent<{ intent?: string }>} */ (event).detail
      if (detail?.intent !== 'new-collection') return
      const card = view.cards[0]
      if (!card) return
      openWithQueue(card.row, 'payments')
    }
    window.addEventListener(MOBILE_FAB_EVENT, onMobileFab)
    return () => window.removeEventListener(MOBILE_FAB_EVENT, onMobileFab)
  }, [view.cards])

  /** @param {CollectionRowVM} row @param {import('../contracts/orderDrawer.js').OrderDrawerTab} [tab] */
  function openWithQueue(row, tab) {
    const rowIds = view.cards.map((c) => c.row.id)
    const options = {
      source: /** @type {const} */ ('collection'),
      tab,
      queue: buildDrawerQueue({
        queueId: `collection:${activeFilter}:${dateFilter}`,
        filterSnapshot: { filter: activeFilter, dateFilter },
        rowIds,
        activeOrderId: row.id,
        source: 'collection',
      }),
    }
    if (tab === 'payments' && getOrderById && postOrderPayment) {
      setPanelQueue(options.queue ?? null)
      setPanelOpen(true)
      setSelectedRowId(row.id)
      return
    }
    if (onOpenOrder) onOpenOrder(row, options)
  }

  const panelOrderId = panelQueue?.rowIds[panelQueue.activeIndex] ?? selectedRowId
  const panelOrder = panelOrderId && getOrderById ? getOrderById(panelOrderId) : null
  const panelRemaining = panelOrder ? remainingBalance(panelOrder) : 0
  const panelPaidPct = panelOrder ? Math.round(paymentCollectionPercent(panelOrder)) : 0
  const panelQueueLabel =
    panelQueue && panelQueue.rowIds.length > 1
      ? `${panelQueue.activeIndex + 1} / ${panelQueue.rowIds.length}`
      : null
  const panelCanGoNext =
    panelQueue != null && panelQueue.activeIndex < panelQueue.rowIds.length - 1

  function closePaymentPanel() {
    setPanelOpen(false)
    setPanelQueue(null)
  }

  async function handlePanelPostPayment(body) {
    if (!panelOrder || !postOrderPayment) return
    await postOrderPayment(panelOrder.id, body)
    setPaymentRefreshKey((k) => k + 1)
  }

  async function handlePanelSaveAndNext(body) {
    if (!panelOrder || !postOrderPayment || !panelQueue) return
    await postOrderPayment(panelOrder.id, body)
    setPaymentRefreshKey((k) => k + 1)
    if (panelCanGoNext) {
      setPanelQueue({ ...panelQueue, activeIndex: panelQueue.activeIndex + 1 })
      const nextId = panelQueue.rowIds[panelQueue.activeIndex + 1]
      if (nextId) setSelectedRowId(nextId)
    } else {
      closePaymentPanel()
    }
  }

  const selectedTableRow = useMemo(() => {
    if (!selectedCard) return null
    const index = view.cards.findIndex((c) => c.row.id === selectedCard.row.id)
    const rank = index >= 0 && index < PRIORITY_CALL_LIMIT ? index + 1 : null
    return buildErpTableRow(selectedCard, todayIso, rank)
  }, [selectedCard, todayIso, view.cards])

  const searchActive = Boolean(globalSearch.trim())
  const isPendingApprovalView = activeFilter === 'pending-approval'
  const [pendingApprovalPayments, setPendingApprovalPayments] = useState(
    /** @type {import('../contracts/v1/payment.js').PaymentTransactionDto[]} */ ([]),
  )
  const [pendingPaymentsRefreshKey, setPendingPaymentsRefreshKey] = useState(0)

  useEffect(() => {
    if (!isPendingApprovalView) return undefined
    let cancelled = false
    void loadPendingApprovalPayments(listItemDtos)
      .then((rows) => {
        if (!cancelled) setPendingApprovalPayments(rows)
      })
      .catch(() => {
        if (!cancelled) setPendingApprovalPayments([])
      })
    return () => {
      cancelled = true
    }
  }, [isPendingApprovalView, listItemDtos, pendingPaymentsRefreshKey])

  useEffect(() => {
    const needsPaymentsIndex =
      activeFilter === 'mail-order' || Boolean(mailOrderSupplierFilterId.trim())
    if (!needsPaymentsIndex) return undefined

    let cancelled = false
    const orderIds = scopedCollectionRows.map((row) => row.id)
    void loadPaymentsIndexForOrders(orderIds)
      .then((map) => {
        if (!cancelled) setPaymentsByOrderId(map)
      })
      .catch(() => {
        if (!cancelled) setPaymentsByOrderId(new Map())
      })
    return () => {
      cancelled = true
    }
  }, [
    activeFilter,
    mailOrderSupplierFilterId,
    scopedCollectionRows,
    paymentRefreshKey,
    pendingPaymentsRefreshKey,
  ])

  const pendingApprovalRows = useMemo(
    () =>
      isPendingApprovalView
        ? buildPendingApprovalQueueRows(
            scopedCollectionRows,
            domainEvents,
            todayIso,
            pendingApprovalPayments,
            dtoById,
          )
        : [],
    [
      isPendingApprovalView,
      scopedCollectionRows,
      domainEvents,
      todayIso,
      pendingApprovalPayments,
      dtoById,
    ],
  )

  function refreshPendingApprovalQueue() {
    setPendingPaymentsRefreshKey((k) => k + 1)
    setPaymentRefreshKey((k) => k + 1)
    void onRefreshOrders?.()
  }

  /** @param {string} chipId */
  function handleMobileCollectionChip(chipId) {
    setMobileCollectionChip(chipId)
    const chip = MOBILE_COLLECTION_PRIORITY_CHIPS.find((c) => c.id === chipId)
    if (!chip) return
    if (chip.actionKind === 'focus-search') {
      document.querySelector('.mos-global-search-input')?.focus()
      return
    }
    if (chip.actionKind === 'open-deposit' || chip.actionKind === 'open-payment') {
      const card = view.cards.find((c) => remainingBalance(c.row) > 0.009) ?? view.cards[0]
      if (card) openWithQueue(card.row, 'payments')
      return
    }
    if (chip.filterId) setActiveFilter(chip.filterId)
  }

  const mobileCollectionChips = useMemo(
    () => MOBILE_COLLECTION_PRIORITY_CHIPS.map((c) => ({ id: c.id, label: c.label })),
    [],
  )

  return (
    <div className="mos-page coll-ops-center coll-ops-center--store-tablet">
      <PageRefreshBar
        title="Tahsilat verilerini yenile"
        onRefresh={async () => {
          await (onRefreshOrders?.() ?? refreshOrders())
          refreshPendingApprovalQueue()
          setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
          toastSuccess('Tahsilat listesi yenilendi')
        }}
        refreshing={isRefreshing || mutating}
        updatedAt={lastRefresh}
      />
      <header className="coll-ops-center__head">
        <div>
          <h1 className="coll-ops-center__title">Tahsilat</h1>
          <span className="coll-ops-center__sub">
            {view.openCount} açık dosya · {view.filteredCount} listede
          </span>
          {searchActive ? (
            <div className="coll-ops-center__search-badge" role="status">
              <span className="coll-ops-center__search-badge-label">
                Arama: “{globalSearch.trim()}”
              </span>
              {onClearGlobalSearch ? (
                <button
                  type="button"
                  className="coll-ops-center__search-badge-clear"
                  onClick={onClearGlobalSearch}
                  aria-label="Aramayı temizle"
                >
                  ×
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <PilotScopeToggle
          scope={scope}
          onScopeChange={setScope}
          canToggle={canToggle}
          hint={modeHint}
        />
      </header>

      <CollectionOpsSummaryBar
        kpis={view.kpis}
        activeFilter={activeFilter}
        onFilterSelect={setActiveFilter}
      />

      <SectionErrorBoundary label="Tahsilat listesi">
      <div className="coll-ops-center__workspace">
        {isTouchStore ? (
          <div className="mos-store-ops-mobile-only coll-ops-center__mobile-bar">
            <MobileStoreChipBar
              items={mobileCollectionChips}
              activeId={mobileCollectionChip}
              onSelect={handleMobileCollectionChip}
              ariaLabel="Tahsilat hızlı işlemler"
            />
          </div>
        ) : null}

        <CollectionOpsLeftPanel
          activeFilter={activeFilter}
          dateFilter={dateFilter}
          filterCounts={filterCounts}
          onFilterChange={setActiveFilter}
          onDateFilterChange={setDateFilter}
          mailOrderSupplierId={mailOrderSupplierFilterId}
          onMailOrderSupplierChange={setMailOrderSupplierFilterId}
          pilotScope={scope}
          onPilotScopeChange={setScope}
          canTogglePilotScope={canToggle}
          pilotModeHint={modeHint}
        />

        <div className="coll-ops-center__main">
          <CollectionOpsCustomerCard
            view={customerView}
            telHref={selectedTableRow?.telHref ?? null}
            whatsappHref={selectedTableRow?.whatsappHref ?? null}
            onOpenPayment={() => {
              if (selectedCard?.row) openWithQueue(selectedCard.row, 'payments')
            }}
          />

          <section
            className="coll-ops-center__table-panel"
            aria-label={isPendingApprovalView ? 'Onay bekleyen tahsilatlar' : 'Tahsilat listesi'}
            onDoubleClick={() => {
              if (!isPendingApprovalView && selectedCard?.row) openWithQueue(selectedCard.row)
            }}
          >
            {isPendingApprovalView ? (
              <CollectionPendingApprovalTable
                rows={pendingApprovalRows}
                mutating={mutating}
                onChanged={refreshPendingApprovalQueue}
              />
            ) : view.cards.length === 0 ? (
              <MobileStoreEmptyState
                context="collection"
                onPrimary={() => document.querySelector('.mos-global-search-input')?.focus()}
                onSecondary={() => setActiveFilter('all')}
              />
            ) : (
              <CollectionOpsTable
                cards={view.cards}
                todayIso={todayIso}
                selectedRowId={selectedCard?.row.id ?? null}
                onSelectRow={(row) => setSelectedRowId(row.id)}
                onOpenPayment={(row) => openWithQueue(row, 'payments')}
              />
            )}
          </section>
        </div>
      </div>
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Tahsilat paneli">
      <CollectionCenterPanel
        open={panelOpen && Boolean(panelOrder)}
        order={panelOrder}
        remaining={panelRemaining}
        paidPct={panelPaidPct}
        mutating={mutating}
        refreshKey={paymentRefreshKey}
        domainEvents={domainEvents}
        queuePositionLabel={panelQueueLabel}
        showSaveAndNext={panelCanGoNext}
        onClose={closePaymentPanel}
        onPostPayment={handlePanelPostPayment}
        onSaveAndNext={handlePanelSaveAndNext}
        onPaymentsChanged={refreshPendingApprovalQueue}
      />
      </SectionErrorBoundary>
    </div>
  )
}
