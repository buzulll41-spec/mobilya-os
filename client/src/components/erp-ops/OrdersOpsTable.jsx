import StatusBadge from '../StatusBadge.jsx'
import PilotRecordBadge from '../pilot/PilotRecordBadge.jsx'
import MosButton from '../MosButton.jsx'

/** @typedef {import('../../features/orders/ordersOpsCenterUi.js').OrdersOpsTableRow} OrdersOpsTableRow */

/**
 * @param {{
 *   row: OrdersOpsTableRow
 *   selected: boolean
 *   onSelect: () => void
 *   onOpen: () => void
 * }} props
 */
function OrdersOpsTableRowView({ row, selected, onSelect, onOpen }) {
  const stop = (/** @type {import('react').SyntheticEvent} */ e) => {
    e.stopPropagation()
  }

  const rowClass = [
    'mos-erp-tbl-row',
    selected ? 'is-selected' : '',
    row.tone === 'critical' ? 'is-critical' : '',
    row.tone === 'warning' ? 'is-warning' : '',
    row.pilotKind ? 'is-pilot-record' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const riskClass = [
    'mos-erp-tbl-td--status',
    row.riskTone === 'critical' ? 'is-critical' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const collectClass = [
    'mos-erp-tbl-td--status',
    row.collectionTone === 'warning' ? 'is-warning' : '',
    row.collectionTone === 'success' ? 'is-success' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const terminClass = [
    'mos-erp-tbl-td',
    row.terminOverdue ? 'mos-erp-tbl-td--status is-critical' : '',
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
      <td className="mos-erp-tbl-td mos-erp-tbl-td--order mos-orders-col--desk">{row.orderNo}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">
        <span className="mos-orders-cell-customer">
          {row.customer}
          <PilotRecordBadge kind={row.pilotKind ?? null} />
        </span>
        <span className="mos-orders-cell-order-no">{row.orderNo}</span>
      </td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--product mos-orders-col--desk" title={row.product}>
        {row.product}
      </td>
      <td className={terminClass}>{row.terminLabel}</td>
      <td className={collectClass}>{row.collectionLabel}</td>
      <td className="mos-erp-tbl-td mos-orders-col--desk">{row.shipmentLabel}</td>
      <td className={`mos-erp-tbl-td ${riskClass}`}>{row.riskLabel}</td>
      <td className="mos-erp-tbl-td mos-orders-col--desk">
        <StatusBadge status={row.statusLabel} />
      </td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted mos-orders-col--desk">{row.lastActionLabel}</td>
      <td className="mos-erp-tbl-td is-ops">
        <MosButton context="table" label="Aç" onClick={(e) => { stop(e); onOpen() }} />
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   rows: OrdersOpsTableRow[]
 *   selectedRowId: string | null
 *   onSelectRow: (row: OrdersOpsTableRow) => void
 *   onOpenRow: (row: OrdersOpsTableRow) => void
 * }} props
 */
export default function OrdersOpsTable({ rows, selectedRowId, onSelectRow, onOpenRow }) {
  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl mos-erp-tbl--orders">
        <thead>
          <tr>
            <th className="mos-orders-col--desk">Sipariş No</th>
            <th>Müşteri</th>
            <th className="mos-orders-col--desk">Ürün</th>
            <th>Termin</th>
            <th>Tahsilat</th>
            <th className="mos-orders-col--desk">Sevk</th>
            <th>Risk</th>
            <th className="mos-orders-col--desk">Durum</th>
            <th className="mos-orders-col--desk">Son İşlem</th>
            <th className="is-ops">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="mos-erp-tbl-empty">
              <td colSpan={10}>Bu filtrede sipariş yok.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <OrdersOpsTableRowView
                key={row.id}
                row={row}
                selected={selectedRowId === row.id}
                onSelect={() => onSelectRow(row)}
                onOpen={() => onOpenRow(row)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
