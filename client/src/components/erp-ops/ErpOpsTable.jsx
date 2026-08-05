/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */

import PilotRecordBadge from '../pilot/PilotRecordBadge.jsx'
import MosButton from '../MosButton.jsx'

/**
 * @param {{
 *   row: ErpOpsTableRow
 *   selected: boolean
 *   onSelect: () => void
 *   onOpen: () => void
 *   showPriority?: boolean
 *   variant?: 'default' | 'dashboard-manager'
 * }} props
 */
function ErpOpsTableRowView({ row, selected, onSelect, onOpen, showPriority = true, variant = 'default' }) {
  const stop = (/** @type {import('react').SyntheticEvent} */ e) => {
    e.stopPropagation()
  }

  const accentClass =
    variant === 'dashboard-manager' && row.rowAccent
      ? ` is-accent-${row.rowAccent}`
      : ''
  const managerClass =
    variant === 'dashboard-manager' && row.isManagerCritical ? ' is-manager-critical' : ''

  const prioRowClass =
    variant === 'dashboard-manager' && row.priorityRank != null
      ? row.priorityRank === 1
        ? ' is-prio-row-1'
        : row.priorityRank === 2
          ? ' is-prio-row-2'
          : row.priorityRank === 3
            ? ' is-prio-row-3'
            : ''
      : ''

  const rowClass = [
    'mos-erp-tbl-row',
    selected ? 'is-selected' : '',
    row.tone === 'critical' ? 'is-critical' : '',
    row.tone === 'warning' ? 'is-warning' : '',
    row.pilotKind ? 'is-pilot-record' : '',
    accentClass,
    managerClass,
    prioRowClass,
  ]
    .filter(Boolean)
    .join(' ')

  const prioClass =
    variant === 'dashboard-manager' && row.priorityRank != null
      ? ` is-p${Math.min(row.priorityRank, 4)}`
      : ''

  const statusClass = [
    'mos-erp-tbl-td--status',
    row.tone === 'critical' ? 'is-critical' : '',
    row.tone === 'warning' ? 'is-warning' : '',
    row.tone === 'success' ? 'is-success' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <tr
      className={rowClass}
      data-order-row-id={row.id}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-selected={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {showPriority ? (
        <td className={`mos-erp-tbl-td mos-erp-tbl-td--prio${prioClass}`}>
          {row.priorityRank != null ? (
            variant === 'dashboard-manager' ? (
              <span className="mos-erp-prio-badge">{`P${row.priorityRank}`}</span>
            ) : (
              `P${row.priorityRank}`
            )
          ) : (
            '—'
          )}
        </td>
      ) : null}
      <td className="mos-erp-tbl-td mos-erp-tbl-td--order">{row.orderNo}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">
        <span className="mos-erp-tbl-customer-name">{row.customer}</span>
        {row.headerSummary ? (
          <span className="mos-erp-tbl-customer-summary">{row.headerSummary}</span>
        ) : null}
        <PilotRecordBadge kind={row.pilotKind ?? null} />
      </td>
      <td className={`mos-erp-tbl-td ${statusClass}`}>{row.statusLabel}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.lastActionLabel ?? '—'}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--action" title={row.nextActionLabel}>
        {row.nextActionLabel ?? '—'}
      </td>
      <td className="mos-erp-tbl-td is-ops">
        <MosButton
          context="table"
          label={row.actionButtonLabel ?? 'Aç'}
          onClick={(e) => {
            stop(e)
            onOpen()
          }}
        />
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   rows: ErpOpsTableRow[]
 *   selectedRowId: string | null
 *   onSelectRow: (row: ErpOpsTableRow) => void
 *   onOpenRow: (row: ErpOpsTableRow) => void
 *   emptyMessage?: string
 *   showPriority?: boolean
 *   variant?: 'default' | 'dashboard-manager'
 * }} props
 */
export default function ErpOpsTable({
  rows,
  selectedRowId,
  onSelectRow,
  onOpenRow,
  emptyMessage = 'Bu filtrede kayıt yok.',
  showPriority = true,
  variant = 'default',
}) {
  const colSpan = showPriority ? 7 : 6

  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl">
        <thead>
          <tr>
            {showPriority ? <th>Öncelik</th> : null}
            <th>Sipariş No</th>
            <th>Müşteri</th>
            <th>Durum</th>
            <th>Son İşlem</th>
            <th>Sonraki Aksiyon</th>
            <th className="is-ops">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="mos-erp-tbl-empty">
              <td colSpan={colSpan}>{emptyMessage}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <ErpOpsTableRowView
                key={row.id}
                row={row}
                selected={selectedRowId === row.id}
                onSelect={() => onSelectRow(row)}
                onOpen={() => onOpenRow(row)}
                showPriority={showPriority}
                variant={variant}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
