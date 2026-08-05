import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { IconPlus } from '../components/Icons.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import ErpOpsDetailStrip from '../components/erp-ops/ErpOpsDetailStrip.jsx'
import ErpOpsTable from '../components/erp-ops/ErpOpsTable.jsx'
import {
  buildDashboardOpsView,
  countDashboardByFilter,
  DASHBOARD_MANAGER_QUICK_FILTERS,
  DASHBOARD_SCOPE_FILTERS,
  filterDashboardRows,
} from '../features/dashboard/dashboardOpsCenterUi.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import '../styles/mos-erp-ops.css'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../features/dashboard/dashboardOpsCenterUi.js').DashboardFilterId} DashboardFilterId */
/** @typedef {import('../features/dashboard/dashboardOpsCenterUi.js').DashboardOpsTableRow} DashboardOpsTableRow */

/**
 * @param {{
 *   controlTower: import('../mappers/dashboard/computeDashboardControlTower.js').ReturnType<import('../mappers/dashboard/computeDashboardControlTower.js').computeDashboardControlTower>
 *   operationalAlarms: import('../utils/operationalAlarms.js').OperationalAlarm[]
 *   orders: Order[]
 *   ordersById: Map<string, Order>
 *   todayIso: string
 *   onOpenOrderModal: () => void
 *   onOrderSelect: (order: Order, options?: import('../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   onNavigate: (page: string) => void
 *   sshMissingParts: import('../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard[]
 *   listItemDtos?: import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   kpis?: ReturnType<import('../data/dashboardHelpers.js').computeDashboardKpis>
 *   highlightOrderId?: string | null
 * }} props
 */
function DashboardPage({
  controlTower,
  orders,
  ordersById,
  todayIso,
  onOpenOrderModal,
  onOrderSelect,
  onNavigate,
  sshMissingParts,
  listItemDtos = [],
  kpis,
  highlightOrderId = null,
}) {
  /** @type {[DashboardFilterId, import('react').Dispatch<import('react').SetStateAction<DashboardFilterId>>]} */
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))

  const view = useMemo(
    () =>
      buildDashboardOpsView({
        controlTower,
        sshMissingParts,
        orders,
        listItemDtos,
        kpis,
        todayIso,
      }),
    [controlTower, sshMissingParts, orders, listItemDtos, kpis, todayIso],
  )

  const filteredRows = useMemo(
    () => filterDashboardRows(view.rows, activeFilter),
    [view.rows, activeFilter],
  )

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of [...DASHBOARD_MANAGER_QUICK_FILTERS, ...DASHBOARD_SCOPE_FILTERS]) {
      counts[f.id] = countDashboardByFilter(view.rows, f.id)
    }
    return counts
  }, [view.rows])

  useEffect(() => {
    if (filteredRows.length === 0) {
      setSelectedRowId(null)
      return
    }
    const visible = filteredRows.some((r) => r.id === selectedRowId)
    if (!visible) {
      setSelectedRowId(filteredRows[0].id)
    }
  }, [filteredRows, selectedRowId])

  useEffect(() => {
    if (highlightOrderId && filteredRows.some((r) => r.orderId === highlightOrderId)) {
      const row = filteredRows.find((r) => r.orderId === highlightOrderId)
      if (row) setSelectedRowId(row.id)
    }
  }, [highlightOrderId, filteredRows])

  const selectedRow = useMemo(
    () => filteredRows.find((r) => r.id === selectedRowId) ?? filteredRows[0] ?? null,
    [filteredRows, selectedRowId],
  )

  const filterGroups = useMemo(
    () => [{ title: 'Kapsam', options: DASHBOARD_SCOPE_FILTERS }],
    [],
  )

  const openRow = useCallback(
    /** @param {DashboardOpsTableRow} row */
    (row) => {
      const order = ordersById.get(row.orderId)
      if (!order) return
      const tab =
        row.openKind === 'shipment' || row.filterCategory === 'shipment'
          ? 'shipment'
          : row.filterCategory === 'ssh'
            ? 'ssh'
            : undefined
      onOrderSelect(order, {
        tab,
        source: 'dashboard',
        queue: buildDrawerQueue({
          queueId: `dashboard:${activeFilter}`,
          filterSnapshot: { filter: activeFilter },
          rowIds: filteredRows.map((r) => r.orderId),
          activeOrderId: row.orderId,
          source: 'dashboard',
        }),
      })
    },
    [ordersById, onOrderSelect, activeFilter, filteredRows],
  )

  const handleSummaryClick = useCallback(
    /** @param {string} metricId */
    (metricId) => {
      switch (metricId) {
        case 'open-orders':
          onNavigate('orders')
          break
        case 'pending-ship':
          onNavigate('shipment-ops')
          break
        case 'open-collect':
          onNavigate('collection')
          break
        case 'critical-risk':
          setActiveFilter('critical')
          break
        default:
          break
      }
    },
    [onNavigate],
  )

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--dashboard-manager">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Operasyon masası</h1>
          <span className="mos-erp-ops__sub">
            {view.totalCount} açık iş · {filteredRows.length} listede
          </span>
        </div>
        <div className="mos-erp-ops__head-actions">
          <button type="button" className="mos-erp-ops__btn mos-erp-ops__btn--primary" onClick={onOpenOrderModal}>
            <IconPlus />
            Sipariş ekle
          </button>
        </div>
      </header>

      <ErpOpsSummaryStrip
        metrics={view.summaryMetrics}
        ariaLabel="Günün operasyon özeti"
        onMetricClick={handleSummaryClick}
      />

      <ErpOpsSummaryStrip
        metrics={view.managerKpiMetrics}
        ariaLabel="Müdür operasyon göstergeleri"
        summaryClassName="mos-erp-summary--cols-6 mos-erp-ops__manager-kpis"
      />

      <section className="mos-erp-ops__today-focus" aria-label="Bugün odaklan">
        <h2 className="mos-erp-ops__today-focus-title">BUGÜN ODAKLAN</h2>
        <ul className="mos-erp-ops__today-focus-list">
          {view.todayFocusItems.map((item) => (
            <li key={item} className="mos-erp-ops__today-focus-item">
              {item === 'Bugün kritik operasyon beklenmiyor' ? (
                item
              ) : (
                <>
                  <span className="mos-erp-ops__today-focus-icon" aria-hidden>
                    ⚠
                  </span>
                  <span>{item}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div
        className="mos-erp-ops__quick-filters"
        role="toolbar"
        aria-label="Hızlı operasyon filtreleri"
      >
        {DASHBOARD_MANAGER_QUICK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`mos-erp-ops__quick-filter${activeFilter === filter.id ? ' is-active' : ''}`}
            onClick={() => setActiveFilter(/** @type {DashboardFilterId} */ (filter.id))}
          >
            <span>{filter.label}</span>
            <span className="mos-erp-ops__quick-filter-count">
              {filterCounts[filter.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mos-erp-ops__workspace">
        <ErpOpsLeftFilters
          groups={filterGroups}
          activeFilter={activeFilter}
          filterCounts={filterCounts}
          onFilterChange={(id) => setActiveFilter(/** @type {DashboardFilterId} */ (id))}
          ariaLabel="Operasyon filtreleri"
        />

        <div className="mos-erp-ops__main">
          <ErpOpsDetailStrip
            row={selectedRow}
            onOpen={() => {
              if (selectedRow) openRow(selectedRow)
            }}
          />

          <section className="mos-erp-ops__table-panel" aria-label="Operasyon listesi">
            {activeFilter === 'all' && view.managerCriticalCount > 0 ? (
              <p className="mos-erp-ops__manager-hint" role="status">
                Yönetici görünümü: ilk {view.managerCriticalCount} kritik kayıt üstte vurgulanıyor.
              </p>
            ) : null}
            <ErpOpsTable
              rows={filteredRows}
              selectedRowId={selectedRow?.id ?? null}
              onSelectRow={(row) => setSelectedRowId(row.id)}
              onOpenRow={openRow}
              variant="dashboard-manager"
            />
          </section>
        </div>
      </div>
    </div>
  )
}

export default memo(DashboardPage)
