import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import AutomationCenterErpDrawer from '../features/automation/AutomationCenterErpDrawer.jsx'
import {
  approveAutomationJob,
  cancelAutomationJob,
  getAutomationJobs,
  runAutomationJob,
} from '../services/automationClient.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import {
  buildAutomationCenterWarRoomView,
  filterAutomationRows,
  QUICK_FILTERS,
} from '../mappers/automation/automationCenterWarRoomModel.js'
import '../styles/mos-erp-ops.css'

/**
 * @param {import('../mappers/automation/automationCenterWarRoomModel.js').AutomationTableRow} row
 */
function priorityBadgeClass(row) {
  if (row.isTerminal && row.status === 'COMPLETED') return 'is-closed'
  if (row.priority === 'P1') return 'is-p1'
  if (row.priority === 'P2') return 'is-p2'
  if (row.priority === 'P3') return 'is-p3'
  return 'is-p4'
}

/**
 * @param {import('../mappers/automation/automationCenterWarRoomModel.js').AutomationTableRow} row
 */
function rowClassName(row, selected) {
  const parts = ['mos-erp-tbl-row']
  if (selected) parts.push('is-selected')
  if (row.isTerminal && row.status === 'COMPLETED') parts.push('is-closed')
  else if (row.priority === 'P1') parts.push('is-prio-row-1')
  else if (row.priority === 'P2') parts.push('is-prio-row-2')
  else if (row.priority === 'P3') parts.push('is-prio-row-3')
  return parts.join(' ')
}

/**
 * @param {{
 *   rows: import('../mappers/automation/automationCenterWarRoomModel.js').AutomationTableRow[]
 *   selectedId: string | null
 *   busy: boolean
 *   onSelect: (id: string) => void
 *   onApprove: (id: string) => void
 *   onRun: (id: string) => void
 *   onCancel: (id: string) => void
 *   onOpenDetail: (id: string) => void
 * }} props
 */
function AutomationWarRoomTable({
  rows,
  selectedId,
  busy,
  onSelect,
  onApprove,
  onRun,
  onCancel,
  onOpenDetail,
}) {
  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl mos-erp-tbl--automation">
        <thead>
          <tr>
            <th>Öncelik</th>
            <th>Otomasyon No</th>
            <th>Kaynak</th>
            <th>Tip</th>
            <th>Durum</th>
            <th>Onay</th>
            <th>Etki</th>
            <th>Beklenen Kazanım</th>
            <th>Son Çalışma</th>
            <th>Sonraki Aksiyon</th>
            <th className="is-ops">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="mos-erp-tbl-empty">
              <td colSpan={11}>Otomasyon işi yok.</td>
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
                <span className="mos-erp-prio-badge">{row.priority}</span>
              </td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.jobNumber}</td>
              <td className="mos-erp-tbl-td">{row.source}</td>
              <td className="mos-erp-tbl-td">{row.typeLabel}</td>
              <td
                className={`mos-erp-tbl-td mos-erp-tbl-td--status${
                  row.status === 'FAILED' ? ' is-critical' : row.status === 'COMPLETED' ? ' is-success' : ''
                }`}
              >
                {row.statusLabel}
              </td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.approvalLabel}</td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--customer" title={row.effectLabel}>
                {row.effectLabel}
              </td>
              <td
                className="mos-erp-tbl-td mos-erp-tbl-td--gain"
                title={row.expectedGainLabel}
              >
                {row.expectedGainLabel}
              </td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.lastRunLabel}</td>
              <td className="mos-erp-tbl-td mos-erp-tbl-td--action" title={row.nextActionLabel}>
                {row.nextActionLabel}
              </td>
              <td className="mos-erp-tbl-td is-ops" onClick={(e) => e.stopPropagation()}>
                <div className="mos-erp-tbl-ops">
                  {row.canApprove ? (
                    <button
                      type="button"
                      className="mos-erp-tbl-op"
                      disabled={busy}
                      onClick={() => onApprove(row.id)}
                    >
                      Onayla
                    </button>
                  ) : null}
                  {row.canRun ? (
                    <button
                      type="button"
                      className="mos-erp-tbl-op"
                      disabled={busy}
                      onClick={() => onRun(row.id)}
                    >
                      Çalıştır
                    </button>
                  ) : null}
                  {row.canCancel ? (
                    <button
                      type="button"
                      className="mos-erp-tbl-op"
                      disabled={busy}
                      onClick={() => onCancel(row.id)}
                    >
                      İptal
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="mos-erp-tbl-op"
                    onClick={() => onOpenDetail(row.id)}
                  >
                    Detay
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const KPI_FILTER_MAP = {
  total: 'all',
  'waiting-approval': 'waiting-approval',
  ready: 'ready',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
}

const EMPTY_FILTERS = { q: '' }

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function AutomationCenterPage({ embedded = false }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [activeFilter, setActiveFilter] = useState('all')
  const [data, setData] = useState(/** @type {any} */ (null))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionError, setActionError] = useState(/** @type {string | null} */ (null))
  const [busy, setBusy] = useState(false)

  const authUser = getCurrentAuthUser()
  const limitedView = useMemo(() => {
    const role = authUser?.role
    return role === 'SALES' || role === 'sales'
  }, [authUser?.role])

  const load = useCallback(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const query = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    if (limitedView) query.limitedView = 'true'
    getAutomationJobs(query)
      .then((res) => {
        if (!alive) return
        setData(res)
        setSelectedId((prev) => (prev && res.jobs.some((j) => j.id === prev) ? prev : res.jobs[0]?.id ?? null))
        setLoading(false)
      })
      .catch((err) => {
        if (!alive) return
        setError(err?.message ?? 'Otomasyon işleri yüklenemedi')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [filters, limitedView])

  useEffect(() => load(), [load])

  const view = useMemo(() => {
    if (!data) return null
    return buildAutomationCenterWarRoomView(data)
  }, [data])

  const displayRows = useMemo(() => {
    if (!data) return []
    return filterAutomationRows(data.jobs ?? [], activeFilter)
  }, [data, activeFilter])

  const selectedJob = useMemo(
    () => data?.jobs?.find((j) => j.id === selectedId) ?? null,
    [data, selectedId],
  )
  const selectedRow = useMemo(
    () => displayRows.find((r) => r.id === selectedId) ?? view?.rows.find((r) => r.id === selectedId) ?? null,
    [displayRows, selectedId, view?.rows],
  )

  async function doAction(fn) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      load()
    } catch (err) {
      setActionError(err?.body?.message ?? err?.message ?? 'İşlem başarısız')
    } finally {
      setBusy(false)
    }
  }

  function handleSelect(id) {
    setSelectedId(id)
    setDrawerOpen(true)
  }

  function handleApprove(id) {
    doAction(() => approveAutomationJob(id, { approvedBy: authUser?.id ?? 'manager' }))
  }

  function handleRun(id) {
    doAction(() => runAutomationJob(id))
  }

  function handleCancel(id) {
    doAction(() => cancelAutomationJob(id))
  }

  function handleKpiClick(metricId) {
    const next = KPI_FILTER_MAP[metricId]
    if (next) setActiveFilter(next)
  }

  return (
    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--automation-center'
          : 'mos-page mos-erp-ops mos-erp-ops--automation-center'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Otomasyon Merkezi</h1>
            <span className="mos-erp-ops__sub">
              Operasyon otomasyonu · onay, çalıştırma ve tamamlanma kuyruğu
              {data?.today ? ` · ${data.today}` : ''}
            </span>
          </div>
        </header>
      ) : null}

      {view ? (
        <ErpOpsSummaryStrip
          metrics={view.kpiMetrics}
          ariaLabel="Otomasyon KPI özeti"
          summaryClassName="mos-erp-summary--cols-6 mos-erp-ops__automation-kpis"
          onMetricClick={handleKpiClick}
        />
      ) : null}

      {view ? (
        <section className="mos-erp-ops__today-focus" aria-label="Bugün odaklan">
          <h2 className="mos-erp-ops__today-focus-title">BUGÜN ODAKLAN</h2>
          <ul className="mos-erp-ops__today-focus-list">
            {view.todayFocusItems.every((item) => item.count === 0) ? (
              <li className="mos-erp-ops__today-focus-item">Bugün bekleyen kritik otomasyon yok</li>
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
          {view.firstRecommendedAction ? (
            <p className="mos-erp-ops__today-focus-first">
              <span className="mos-erp-ops__today-focus-first-label">İlk önerilen aksiyon:</span>
              <span>{view.firstRecommendedAction}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      <div
        className="mos-erp-ops__quick-filters"
        role="toolbar"
        aria-label="Otomasyon durum filtreleri"
      >
        {QUICK_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`mos-erp-ops__quick-filter${activeFilter === filter.id ? ' is-active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            <span>{filter.label}</span>
            <span className="mos-erp-ops__quick-filter-count">
              {view?.filterCounts[filter.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mos-erp-cockpit-filters" aria-label="Otomasyon arama">
        <div className="mos-erp-cockpit-filters__field">
          <label htmlFor="auto-q">Arama</label>
          <input
            id="auto-q"
            type="text"
            className="mos-erp-filters__field"
            placeholder="Otomasyon / vaka / sipariş"
            value={filters.q}
            onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
          />
        </div>
      </div>

      <div className="mos-erp-ops__automation-workspace">
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
          <section className="mos-erp-ops__table-panel" aria-label="Otomasyon işleri">
            <AutomationWarRoomTable
              rows={displayRows}
              selectedId={selectedId}
              busy={busy}
              onSelect={handleSelect}
              onApprove={handleApprove}
              onRun={handleRun}
              onCancel={handleCancel}
              onOpenDetail={handleSelect}
            />
          </section>
        )}

        <AutomationCenterErpDrawer
          open={drawerOpen && Boolean(selectedJob)}
          job={selectedJob}
          busy={busy}
          actionError={actionError}
          onClose={() => setDrawerOpen(false)}
          onApprove={selectedId ? () => handleApprove(selectedId) : undefined}
          onRun={selectedId ? () => handleRun(selectedId) : undefined}
          onCancel={selectedId ? () => handleCancel(selectedId) : undefined}
          canApprove={selectedRow?.canApprove ?? false}
          canRun={selectedRow?.canRun ?? false}
          canCancel={selectedRow?.canCancel ?? false}
        />
      </div>
    </div>
  )
}
