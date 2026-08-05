import PilotRecordBadge from '../../components/pilot/PilotRecordBadge.jsx'
import MosButton from '../../components/MosButton.jsx'

/** @typedef {import('./shipmentOpsCenterUi.js').ShipmentPlannedTableRow} ShipmentPlannedTableRow */

/**
 * @param {ShipmentPlannedTableRow} row
 */
function toneClass(row) {
  if (row.tone === 'critical') return ' mos-erp-tbl-tr--critical'
  if (row.tone === 'warning') return ' mos-erp-tbl-tr--warning'
  if (row.tone === 'success') return ' mos-erp-tbl-tr--success'
  return ''
}

/**
 * @param {{
 *   rows: ShipmentPlannedTableRow[]
 *   selectedRowId: string | null
 *   mutating?: boolean
 *   mode?: 'default' | 'confirmation'
 *   onSelectRow: (row: ShipmentPlannedTableRow) => void
 *   onOpenRow: (row: ShipmentPlannedTableRow) => void
 *   onDispatch?: (row: ShipmentPlannedTableRow) => void
 *   onDeliver?: (row: ShipmentPlannedTableRow) => void
 *   onConfirmDelivery?: (row: ShipmentPlannedTableRow) => void
 *   onFailDelivery?: (row: ShipmentPlannedTableRow) => void
 *   onPostponeDelivery?: (row: ShipmentPlannedTableRow) => void
 *   emptyMessage?: string
 * }} props
 */
export default function ShipmentOpsPlannedTable({
  rows,
  selectedRowId,
  mutating = false,
  mode = 'default',
  onSelectRow,
  onOpenRow,
  onDispatch,
  onDeliver,
  onConfirmDelivery,
  onFailDelivery,
  onPostponeDelivery,
  emptyMessage = 'Bu filtrede planlı sevk kaydı yok.',
}) {
  const confirmationMode = mode === 'confirmation'

  const stop = (/** @type {import('react').MouseEvent} */ e) => {
    e.stopPropagation()
  }

  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl mos-erp-tbl--shipment-planned">
        <thead>
          <tr>
            {confirmationMode ? <th>Sipariş No</th> : null}
            <th>Planlanan tarih</th>
            <th>Müşteri</th>
            <th>Bölge</th>
            <th>Araç</th>
            <th>Montaj ekibi</th>
            {confirmationMode ? (
              <>
                <th>Ürün</th>
                <th>Özet</th>
              </>
            ) : null}
            <th>Durum</th>
            <th className="is-ops">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={confirmationMode ? 10 : 7} className="mos-erp-tbl-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={`mos-erp-tbl-tr${row.id === selectedRowId ? ' is-selected' : ''}${toneClass(row)}`}
                onClick={() => onSelectRow(row)}
              >
                {confirmationMode ? (
                  <td className="mos-erp-tbl-td" data-label="Sipariş No">{row.orderNumber}</td>
                ) : null}
                <td className="mos-erp-tbl-td mos-erp-tbl-td--date" data-label="Planlanan tarih">{row.plannedDateLabel}</td>
                <td className="mos-erp-tbl-td mos-erp-tbl-td--customer" data-label="Müşteri">
                  <span className="mos-erp-tbl-customer-name">{row.customer}</span>
                  <PilotRecordBadge kind={row.pilotKind ?? null} />
                </td>
                <td className="mos-erp-tbl-td" data-label="Bölge">{row.region}</td>
                <td className="mos-erp-tbl-td" data-label="Araç">{row.vehicleLabel}</td>
                <td className="mos-erp-tbl-td" data-label="Montaj ekibi">{row.crewLabel}</td>
                {confirmationMode ? (
                  <>
                    <td className="mos-erp-tbl-td" data-label="Ürün">{row.productCount ?? 1}</td>
                    <td className="mos-erp-tbl-td" data-label="Özet">{row.productSummary ?? '—'}</td>
                  </>
                ) : null}
                <td className="mos-erp-tbl-td" data-label="Durum">{row.statusLabel}</td>
                <td className="mos-erp-tbl-td is-ops" data-label="İşlem">
                  <div className="mos-erp-tbl-ops">
                    {row.canConfirmDelivery && onConfirmDelivery ? (
                      <MosButton
                        context="table"
                        tone="success"
                        label="Teslim Edildi"
                        disabled={mutating}
                        onClick={(e) => {
                          stop(e)
                          onConfirmDelivery(row)
                        }}
                      />
                    ) : null}
                    {row.canFailDelivery && onFailDelivery ? (
                      <MosButton
                        context="table"
                        tone="danger"
                        label="Teslim Edilemedi"
                        disabled={mutating}
                        onClick={(e) => {
                          stop(e)
                          onFailDelivery(row)
                        }}
                      />
                    ) : null}
                    {row.canPostponeDelivery && onPostponeDelivery ? (
                      <MosButton
                        context="table"
                        tone="danger"
                        label="Ertele"
                        disabled={mutating}
                        onClick={(e) => {
                          stop(e)
                          onPostponeDelivery(row)
                        }}
                      />
                    ) : null}
                    {row.canDispatch && onDispatch ? (
                      <MosButton
                        context="table"
                        tone="info"
                        label="Yola Çıktı"
                        disabled={mutating}
                        onClick={(e) => {
                          stop(e)
                          onDispatch(row)
                        }}
                      />
                    ) : null}
                    {row.canDeliver && onDeliver ? (
                      <MosButton
                        context="table"
                        tone="success"
                        label="Teslim Et"
                        disabled={mutating}
                        onClick={(e) => {
                          stop(e)
                          onDeliver(row)
                        }}
                      />
                    ) : null}
                    {!confirmationMode ? (
                      <MosButton
                        context="table"
                        tone="primary"
                        label="Planla"
                        onClick={(e) => {
                          stop(e)
                          onOpenRow(row)
                        }}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
