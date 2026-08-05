import { PRIORITY_CALL_LIMIT } from '../../mappers/collection/collectionCommandCenterModel.js'
import { buildErpTableRows } from './collectionErpTableUi.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('./collectionErpTableUi.js').CollectionErpTableRow} CollectionErpTableRow */

const TABLE_HEAD = (
  <thead>
    <tr>
      <th scope="col" className="coll-erp-th coll-erp-th--prio">
        Öncelik
      </th>
      <th scope="col" className="coll-erp-th coll-erp-th--customer">
        Müşteri
      </th>
      <th scope="col" className="coll-erp-th">
        Telefon
      </th>
      <th scope="col" className="coll-erp-th">
        Durum
      </th>
      <th scope="col" className="coll-erp-th coll-erp-th--amount">
        Kalan bakiye
      </th>
      <th scope="col" className="coll-erp-th coll-erp-th--pct">
        Tahsilat %
      </th>
      <th scope="col" className="coll-erp-th coll-erp-th--last">
        Son işlem
      </th>
      <th scope="col" className="coll-erp-th">
        Sonraki aksiyon
      </th>
      <th scope="col" className="coll-erp-th coll-erp-th--ops">
        İşlem
      </th>
    </tr>
  </thead>
)

/**
 * @param {{
 *   row: CollectionErpTableRow
 *   rowIndex: number
 *   selected: boolean
 *   onSelect?: () => void
 *   onOpenPayment?: () => void
 * }} props
 */
function ErpTableRow({ row, rowIndex, selected, onSelect, onOpenPayment }) {
  const {
    card,
    priorityRank,
    statusBadge,
    statusLabel,
    riskLabel,
    remainingLabel,
    paidPct,
    phoneDisplay,
    nextActionFull,
    lastOperationLabel,
    telHref,
    whatsappHref,
  } = row
  const hasPhone = Boolean(telHref)

  const stop = (/** @type {import('react').MouseEvent} */ e) => {
    e.stopPropagation()
  }

  return (
    <tr
      className={`coll-erp-row coll-erp-row--${statusBadge.level}${rowIndex % 2 === 1 ? ' coll-erp-row--alt' : ''}${priorityRank != null ? ' coll-erp-row--priority' : ''}${selected ? ' coll-erp-row--selected' : ''}`}
      onClick={() => onSelect?.()}
      tabIndex={0}
      role="button"
      aria-selected={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.()
        }
      }}
    >
      <td className="coll-erp-td coll-erp-td--prio">
        {priorityRank != null ? (
          <span className={`coll-erp-prio-tag coll-erp-prio-tag--p${Math.min(priorityRank, 3)}`}>
            P{priorityRank}
          </span>
        ) : (
          <span className="coll-erp-prio-tag coll-erp-prio-tag--none">—</span>
        )}
      </td>
      <td className="coll-erp-td coll-erp-td--customer">
        <span className="coll-erp-customer">{card.row.customer}</span>
        <span className="coll-erp-order">{card.orderNo}</span>
      </td>
      <td className="coll-erp-td coll-erp-td--phone">
        {phoneDisplay ? (
          <span className="coll-erp-phone">{phoneDisplay}</span>
        ) : (
          <span className="coll-erp-muted">—</span>
        )}
      </td>
      <td className="coll-erp-td coll-erp-td--status">
        <span className={`coll-erp-status coll-erp-status--${statusBadge.level}`}>{statusBadge.label}</span>
        <span className="coll-erp-risk" title={riskLabel}>
          {riskLabel}
        </span>
        <span className="coll-erp-status-sub" title={statusLabel}>
          {statusLabel}
        </span>
      </td>
      <td className="coll-erp-td coll-erp-td--amount">{remainingLabel}</td>
      <td className="coll-erp-td coll-erp-td--pct">
        <div className="coll-erp-pct">
          <div className="coll-erp-pct__track">
            <div
              className={`coll-erp-pct__fill coll-erp-pct__fill--${statusBadge.level}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
          <span className="coll-erp-pct__label">%{paidPct}</span>
        </div>
      </td>
      <td className="coll-erp-td coll-erp-td--last">{lastOperationLabel}</td>
      <td className="coll-erp-td coll-erp-td--action">{nextActionFull}</td>
      <td className="coll-erp-td coll-erp-td--ops">
        <div className="coll-erp-ops" onClick={stop} onKeyDown={stop} role="presentation">
          {hasPhone ? (
            <a className="coll-erp-op coll-erp-op--call" href={telHref ?? undefined}>
              Ara
            </a>
          ) : (
            <span className="coll-erp-op coll-erp-op--disabled" aria-disabled="true">
              Ara
            </span>
          )}
          {hasPhone ? (
            <a
              className="coll-erp-op coll-erp-op--wa"
              href={whatsappHref ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <span className="coll-erp-op coll-erp-op--disabled" aria-disabled="true">
              WhatsApp
            </span>
          )}
          <button
            type="button"
            className="coll-erp-op coll-erp-op--pay"
            onClick={(e) => {
              stop(e)
              onOpenPayment?.()
            }}
          >
            Ödeme Al
          </button>
        </div>
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   rows: CollectionErpTableRow[]
 *   selectedRowId: string | null
 *   onSelectRow?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
function ErpTableBody({ rows, selectedRowId, onSelectRow, onOpenPayment }) {
  return (
    <tbody>
      {rows.map((row, index) => (
        <ErpTableRow
          key={row.card.row.id}
          row={row}
          rowIndex={index}
          selected={selectedRowId === row.card.row.id}
          onSelect={() => onSelectRow?.(row.card.row)}
          onOpenPayment={() => onOpenPayment?.(row.card.row)}
        />
      ))}
    </tbody>
  )
}

/**
 * @param {{
 *   title: string
 *   titleClass?: string
 *   rows: CollectionErpTableRow[]
 *   selectedRowId: string | null
 *   onSelectRow?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
function ErpTableSection({ title, titleClass = '', rows, selectedRowId, onSelectRow, onOpenPayment }) {
  if (rows.length === 0) return null
  return (
    <section className={`coll-erp-section ${titleClass}`.trim()}>
      <h3 className="coll-erp-section__title">{title}</h3>
      <div className="coll-erp-table-wrap">
        <table className="coll-erp-table">
          {TABLE_HEAD}
          <ErpTableBody
            rows={rows}
            selectedRowId={selectedRowId}
            onSelectRow={onSelectRow}
            onOpenPayment={onOpenPayment}
          />
        </table>
      </div>
    </section>
  )
}

/**
 * @param {{
 *   cards: CollectionCardModel[]
 *   todayIso: string
 *   selectedRowId: string | null
 *   onSelectRow?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionErpTable({
  cards,
  todayIso,
  selectedRowId,
  onSelectRow,
  onOpenPayment,
}) {
  if (cards.length === 0) {
    return (
      <div className="coll-empty">
        <p className="coll-empty__title">Bu filtrede kayıt yok</p>
        <p className="coll-empty__hint">Farklı bir filtre seçin.</p>
      </div>
    )
  }

  const allRows = buildErpTableRows(cards, todayIso, PRIORITY_CALL_LIMIT)
  const topRows = allRows.slice(0, PRIORITY_CALL_LIMIT)
  const restRows = allRows.slice(PRIORITY_CALL_LIMIT)

  return (
    <div className="coll-erp-workspace">
      <ErpTableSection
        title="Öncelikli müdahale"
        titleClass="coll-erp-section--priority"
        rows={topRows}
        selectedRowId={selectedRowId}
        onSelectRow={onSelectRow}
        onOpenPayment={onOpenPayment}
      />
      {restRows.length > 0 ? (
        <ErpTableSection
          title="Tüm açık tahsilatlar"
          titleClass="coll-erp-section--all"
          rows={restRows}
          selectedRowId={selectedRowId}
          onSelectRow={onSelectRow}
          onOpenPayment={onOpenPayment}
        />
      ) : null}
    </div>
  )
}
