import { memo, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import ErpOpsDetailStrip from '../components/erp-ops/ErpOpsDetailStrip.jsx'
import ErpOpsTable from '../components/erp-ops/ErpOpsTable.jsx'
import {
  SSH_QUICK_FILTERS,
  buildSshOpsSummary,
  countSshFilter,
  filterSshCards,
  sshCardToErpTableRow,
} from '../features/ssh/sshOpsCenterUi.js'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import { consumeOpsDeepLink } from '../lib/opsDeepLink.js'
import '../styles/mos-erp-ops.css'

/** @typedef {import('../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard} SshMissingPartCard */
/** @typedef {import('../features/ssh/sshOpsCenterUi.js').SshQuickFilterId} SshQuickFilterId */
/** @typedef {import('../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */

/**
 * @param {{
 *   sshMissingParts: SshMissingPartCard[]
 *   onOpenSsh: (orderId: string, options?: import('../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   highlightOrderId?: string | null
 * }} props
 */
function ServiceCenterPage({ sshMissingParts, onOpenSsh, highlightOrderId = null }) {
  const [activeFilter, setActiveFilter] = useState(/** @type {SshQuickFilterId} */ ('all'))
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    const filter = consumeOpsDeepLink('ssh-service')
    if (filter === 'locked') setActiveFilter('locked')
    else if (filter === 'waiting') setActiveFilter('waiting')
    else if (filter === 'ready') setActiveFilter('ready')
    else if (filter === 'all') setActiveFilter('all')
  }, [])
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()

  const scopedCards = useMemo(
    () =>
      filterItems(sshMissingParts, (card) =>
        getOrderPilotKind({
          id: card.orderId,
          orderNumber: card.orderNumber,
          customer: card.customer,
        }),
      ),
    [sshMissingParts, filterItems],
  )

  const filteredCards = useMemo(
    () => filterSshCards(scopedCards, activeFilter),
    [scopedCards, activeFilter],
  )

  const tableRows = useMemo(
    () => filteredCards.map(sshCardToErpTableRow),
    [filteredCards],
  )

  const summaryMetrics = useMemo(
    () => buildSshOpsSummary(scopedCards),
    [scopedCards],
  )

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of SSH_QUICK_FILTERS) {
      counts[f.id] = countSshFilter(scopedCards, f.id)
    }
    return counts
  }, [scopedCards])

  const cardById = useMemo(() => new Map(filteredCards.map((c) => [c.id, c])), [filteredCards])

  const selectedRow = useMemo(
    () => tableRows.find((r) => r.id === selectedRowId) ?? tableRows[0] ?? null,
    [tableRows, selectedRowId],
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
    if (!highlightOrderId) return
    const card = filteredCards.find((c) => c.orderId === highlightOrderId)
    if (card) setSelectedRowId(card.id)
  }, [highlightOrderId, filteredCards])

  /** @param {string} orderId */
  function openSshWithQueue(orderId) {
    const orderIds = [...new Set(filteredCards.map((c) => c.orderId))]
    onOpenSsh(orderId, {
      tab: 'ssh',
      source: 'ssh',
      queue: buildDrawerQueue({
        queueId: `ssh:${activeFilter}`,
        filterSnapshot: { filter: activeFilter },
        rowIds: orderIds,
        activeOrderId: orderId,
        source: 'ssh',
      }),
    })
  }

  /** @param {string} metricId */
  function handleSummaryClick(metricId) {
    if (metricId === 'locked') setActiveFilter('locked')
    else if (metricId === 'completed') setActiveFilter('ready')
    else setActiveFilter('all')
  }

  /** @param {ErpOpsTableRow} row */
  function openRow(row) {
    const card = cardById.get(row.id)
    if (card) openSshWithQueue(card.orderId)
  }

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--ssh">
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">SSH / Servis Merkezi</h1>
          <span className="mos-erp-ops__sub">
            {scopedCards.length} açık kayıt · {tableRows.length} listede
          </span>
        </div>
        <div className="mos-erp-ops__head-actions">
          <PilotScopeToggle
            scope={scope}
            onScopeChange={setScope}
            canToggle={canToggle}
            hint={modeHint}
          />
        </div>
      </header>

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="SSH operasyon özeti"
        onMetricClick={handleSummaryClick}
        summaryClassName="mos-erp-summary--cols-3 mos-erp-summary--ssh-kpi"
      />

      <div className="mos-erp-ops__workspace">
        <ErpOpsLeftFilters
          groups={[{ title: 'Operasyon', options: SSH_QUICK_FILTERS }]}
          activeFilter={activeFilter}
          filterCounts={filterCounts}
          onFilterChange={(id) => setActiveFilter(/** @type {SshQuickFilterId} */ (id))}
          ariaLabel="SSH filtreleri"
        />

        <div className="mos-erp-ops__main">
          <ErpOpsDetailStrip
            row={selectedRow}
            emptyLabel="Tablodan SSH kaydı seçin."
            onOpen={() => selectedRow && openRow(selectedRow)}
          />

          <section className="mos-erp-ops__table-panel" aria-label="SSH listesi">
            <ErpOpsTable
              rows={tableRows}
              selectedRowId={selectedRow?.id ?? null}
              onSelectRow={(row) => setSelectedRowId(row.id)}
              onOpenRow={openRow}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

export default memo(ServiceCenterPage)
