import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import OperationCaseErpDrawer from '../features/operationCases/OperationCaseErpDrawer.jsx'
import { getActionCenter } from '../services/actionCenterClient.js'
import { getOperationCases } from '../services/operationCaseClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { useOrders } from '../state/useOrders.js'
import {
  ACTIVE_STATUSES,
  buildOperationCaseWarRoomView,
  STATUS_LABEL,
} from '../mappers/operationCase/operationCaseWarRoomModel.js'
import '../styles/mos-erp-ops.css'

const PRIORITY_OPTIONS = [
  { value: '', label: 'Tümü' },
  { value: 'P1', label: 'P1 · Acil' },
  { value: 'P2', label: 'P2 · Yüksek' },
  { value: 'P3', label: 'P3 · Orta' },
  { value: 'P4', label: 'P4 · Normal' },
  { value: 'P5', label: 'P5 · Düşük' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tümü' },
  ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label })),
]

/**
 * @param {import('../mappers/operationCase/operationCaseWarRoomModel.js').OperationCaseTableRow} row
 */
function priorityBadgeClass(row) {
  if (row.isClosed) return 'is-closed'
  if (row.priority === 'P1') return 'is-p1'
  if (row.priority === 'P2') return 'is-p2'
  if (row.priority === 'P3') return 'is-p3'
  return 'is-p4'
}

/**
 * @param {import('../mappers/operationCase/operationCaseWarRoomModel.js').OperationCaseTableRow} row
 */
function rowClassName(row, selected) {
  const parts = ['mos-erp-tbl-row']
  if (selected) parts.push('is-selected')
  if (row.isClosed) parts.push('is-closed')
  else if (row.priority === 'P1') parts.push('is-prio-row-1')
  else if (row.priority === 'P2') parts.push('is-prio-row-2')
  else if (row.priority === 'P3') parts.push('is-prio-row-3')
  return parts.join(' ')
}

/**
 * @param {{
 *   rows: import('../mappers/operationCase/operationCaseWarRoomModel.js').OperationCaseTableRow[]
 *   selectedId: string | null
 *   onSelect: (id: string) => void
 * }} props
 */
function CaseWarRoomTable({ rows, selectedId, onSelect }) {
  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl mos-erp-tbl--cases">
        <thead>
          <tr>
            <th>Öncelik</th>
            <th>Vaka No</th>
            <th>Müşteri</th>
            <th>Kategori</th>
            <th>Sorumlu</th>
            <th>Risk</th>
            <th>Durum</th>
            <th>Son Hareket</th>
            <th>Sonraki Aksiyon</th>
            <th>Açılış Tarihi</th>
            <th className="is-num">Yaş (gün)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="mos-erp-tbl-empty">
              <td colSpan={11}>Vaka yok.</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.id}
              className={rowClassName(row, selectedId === row.id)}
              onClick={() => onSelect(row.id)}
              tabIndex={0}
              role="button"
              aria-selected={selectedId === row.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(row.id)
                }
              }}
            >
              <td className={`mos-erp-tbl-td mos-erp-tbl-td--prio ${priorityBadgeClass(row)}`}>
                {row.isClosed ? (
                  <span className="mos-erp-prio-badge mos-erp-prio-badge--closed">Kapandı</span>
                ) : (
                  <span className="mos-erp-prio-badge">{row.priority}</span>
                )}
              </td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.caseNumber}</td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{row.customer}</td>
              <td className="mos-erp-tbl-td">{row.category}</td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.owner}</td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.risk}</td>
              <td
                className={`mos-erp-tbl-td mos-erp-tbl-td--status${
                  row.isClosed ? ' is-success' : row.priority === 'P1' ? ' is-critical' : ''
                }`}
              >
                {row.statusLabel}
              </td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.lastMovement}</td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--action" title={row.nextAction}>
                {row.nextAction}
              </td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.openedAt}</td>
              <td className="mos-erp-tbl-td is-num">{row.ageDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const EMPTY_FILTERS = { priority: '', status: '', q: '' }

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function OperationCasesPage({ embedded = false }) {
  const { orders, salesOrderListItemDtos } = useOrders()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [casesData, setCasesData] = useState(/** @type {any} */ (null))
  const [actions, setActions] = useState(/** @type {import('../contracts/v1/actionCenter.js').ActionDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const limitedView = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'SALES' || role === 'sales'
  }, [])

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const { priority: _priorityFilter, ...apiFilters } = filters
    const query = Object.fromEntries(Object.entries(apiFilters).filter(([, v]) => v))
    if (limitedView) query.limitedView = 'true'

    Promise.all([getOperationCases(query), getActionCenter(query)])
      .then(([casesRes, actionRes]) => {
        if (!alive) return
        setCasesData(casesRes)
        setActions(actionRes.actions ?? [])
        setSelectedId((prev) =>
          prev && casesRes.cases.some((c) => c.id === prev) ? prev : casesRes.cases[0]?.id ?? null,
        )
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Vakalar yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [filters, limitedView])

  useEffect(() => load(), [load])

  function set(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }))
  }

  const view = useMemo(() => {
    if (!casesData) return null
    return buildOperationCaseWarRoomView({
      casesResponse: casesData,
      actions,
      orders,
      listItemDtos: salesOrderListItemDtos ?? [],
    })
  }, [casesData, actions, orders, salesOrderListItemDtos])

  const rows = view?.rows ?? []
  const displayRows = useMemo(() => {
    if (!filters.priority) return rows
    return rows.filter((r) => r.priority === filters.priority)
  }, [rows, filters.priority])
  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  )
  const openCount = rows.filter((r) => ACTIVE_STATUSES.has(r.status)).length

  function handleSelect(id) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  return (
    <div
      className={
        embedded ? 'mos-hub-pane mos-erp-ops mos-erp-ops--case-center' : 'mos-page mos-erp-ops mos-erp-ops--case-center'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Operasyon Vakaları Merkezi</h1>
            <span className="mos-erp-ops__sub">
              Operasyon yöneticisi savaş odası · {openCount} açık vaka
              {casesData?.today ? ` · ${casesData.today}` : ''}
            </span>
          </div>
        </header>
      ) : null}

      {view ? (
        <ErpOpsSummaryStrip
          metrics={view.kpiMetrics}
          ariaLabel="Vaka KPI özeti"
          summaryClassName="mos-erp-summary--cols-6"
        />
      ) : null}

      {view ? (
        <section className="mos-erp-ops__today-focus" aria-label="Bugün odaklan">
          <h2 className="mos-erp-ops__today-focus-title">BUGÜN ODAKLAN</h2>
          <ul className="mos-erp-ops__today-focus-list">
            {view.todayFocusItems.every((item) => item.count === 0) ? (
              <li className="mos-erp-ops__today-focus-item">Bugün kritik operasyon beklenmiyor</li>
            ) : (
              view.todayFocusItems
                .filter((item) => item.count > 0)
                .map((item) => (
                  <li key={item.id} className="mos-erp-ops__today-focus-item">
                    <span className="mos-erp-ops__today-focus-icon" aria-hidden>
                      ⚠
                    </span>
                    <span>
                      {item.count} {item.label}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </section>
      ) : null}

      <div className="mos-erp-cockpit-filters" aria-label="Vaka filtreleri">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="oc-prio">Öncelik</label>
          <select
            id="oc-prio"
            className="mos-erp-filters__field"
            value={filters.priority}
            onChange={(e) => set('priority', e.target.value)}
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="oc-status">Durum</label>
          <select
            id="oc-status"
            className="mos-erp-filters__field"
            value={filters.status}
            onChange={(e) => set('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="oc-q">Arama</label>
          <input
            id="oc-q"
            type="text"
            className="mos-erp-filters__field"
            placeholder="Vaka / müşteri / sipariş"
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
          />
        </div>
      </div>

      <div className="mos-erp-ops__case-workspace">
        {loading && (
          <div className="mos-erp-detail mos-erp-detail--empty">
            <span className="mos-erp-detail__empty">Yükleniyor…</span>
          </div>
        )}
        {!loading && error && (
          <div className="mos-erp-detail mos-erp-detail--empty">
            <span className="mos-erp-detail__empty">{error}</span>
          </div>
        )}

        {!loading && !error && view && (
          <section className="mos-erp-ops__table-panel" aria-label="Operasyon vakaları">
            <CaseWarRoomTable rows={displayRows} selectedId={selectedId} onSelect={handleSelect} />
          </section>
        )}

        <OperationCaseErpDrawer
          open={drawerOpen && Boolean(selectedId)}
          caseId={selectedId}
          displayPriority={selectedRow?.priority}
          limitedView={limitedView}
          todayIso={casesData?.today}
          onClose={() => setDrawerOpen(false)}
          onUpdated={load}
        />
      </div>
    </div>
  )
}
