import { useEffect, useMemo, useState } from 'react'
import { PRIORITY_CALL_LIMIT } from '../../../mappers/collection/collectionCommandCenterModel.js'
import { buildErpTableRows } from '../collectionErpTableUi.js'
import PilotRecordBadge from '../../../components/pilot/PilotRecordBadge.jsx'
import { getOrderPilotKind } from '../../../lib/pilotRecordHeuristics.js'
import { formatShortDate } from '../../../utils/dates.js'

/** @typedef {import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */
/** @typedef {import('../../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../collectionErpTableUi.js').CollectionErpTableRow} CollectionErpTableRow */

/**
 * @param {{
 *   row: CollectionErpTableRow
 *   selected: boolean
 *   onSelect: () => void
 *   onOpenPayment: () => void
 * }} props
 */
function OpsTableRow({ row, selected, onSelect, onOpenPayment }) {
  const {
    card,
    priorityRank,
    statusBadge,
    statusLabel,
    remainingLabel,
    paidPct,
    phoneDisplay,
    nextActionFull,
    lastOperationLabel,
    telHref,
    whatsappHref,
  } = row
  const hasPhone = Boolean(telHref)
  const isCritical = statusBadge.level === 'critical' || card.stripeTone === 'critical'
  const pilotKind = getOrderPilotKind(card.row)

  const stop = (/** @type {import('react').SyntheticEvent} */ e) => {
    e.stopPropagation()
  }

  return (
    <tr
      className={`coll-ops-tbl-row${selected ? ' is-selected' : ''}${isCritical ? ' is-critical' : ''}${pilotKind ? ' is-pilot-record' : ''}`}
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
      <td className="coll-ops-tbl-td coll-ops-tbl-td--prio coll-col--desk" data-label="Öncelik">{priorityRank != null ? `P${priorityRank}` : '—'}</td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--order coll-col--desk" data-label="Sipariş No">{card.orderNo}</td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--customer" data-label="Müşteri">
        {card.row.customer}
        <PilotRecordBadge kind={pilotKind} />
      </td>
      <td className="coll-ops-tbl-td coll-col--desk" data-label="Telefon">{phoneDisplay ?? '—'}</td>
      <td
        className={`coll-ops-tbl-td coll-ops-tbl-td--status coll-ops-tbl-td--status--${statusBadge.level}`}
        title={statusLabel}
        data-label="Risk"
      >
        {statusBadge.label}
      </td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--num coll-ops-tbl-td--balance" data-label="Kalan Borç">{remainingLabel}</td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--num coll-col--desk" data-label="Tahsilat %">%{paidPct}</td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--muted coll-col--tablet-last" data-label="Son Ödeme">{lastOperationLabel}</td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--action coll-col--desk" title={nextActionFull} data-label="Sonraki Aksiyon">
        {nextActionFull}
      </td>
      <td className="coll-ops-tbl-td coll-ops-tbl-td--ops" data-label="İşlem">
        <div className="coll-ops-tbl-ops" onClick={stop} onKeyDown={stop} role="presentation">
          {hasPhone ? (
            <a className="coll-ops-tbl-op" href={telHref ?? undefined}>
              Ara
            </a>
          ) : (
            <span className="coll-ops-tbl-op is-disabled">Ara</span>
          )}
          {hasPhone ? (
            <a
              className="coll-ops-tbl-op"
              href={whatsappHref ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              WA
            </a>
          ) : (
            <span className="coll-ops-tbl-op is-disabled">WA</span>
          )}
          <button
            type="button"
            className="coll-ops-tbl-op coll-ops-tbl-op--pay"
            onClick={(e) => {
              stop(e)
              onOpenPayment()
            }}
          >
            Ödeme
          </button>
        </div>
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   row: CollectionErpTableRow
 *   selected: boolean
 *   pendingApprovalCount: number
 *   onOpen: () => void
 * }} props
 */
function OpsMobileCard({ row, selected, pendingApprovalCount, onOpen }) {
  const dueIso = row.card.row.dueDate || row.card.row.shipmentDate || ''
  const dueLabel = dueIso ? formatShortDate(dueIso) : '—'
  const pendingApprovalLabel =
    pendingApprovalCount > 0 ? `${pendingApprovalCount} kayıt` : 'Bekleyen yok'

  return (
    <li className="coll-ops-mobile-list__item">
      <button
        type="button"
        className={`coll-ops-mobile-card${selected ? ' is-selected' : ''}`}
        onClick={onOpen}
        aria-label={`${row.card.row.customer} tahsilat detayı`}
      >
        <div className="coll-ops-mobile-card__head">
          <strong className="coll-ops-mobile-card__customer">{row.card.row.customer}</strong>
          <span className={`coll-ops-mobile-card__risk coll-ops-mobile-card__risk--${row.statusBadge.level}`}>
            {row.statusBadge.label}
          </span>
        </div>
        <dl className="coll-ops-mobile-card__grid">
          <div>
            <dt>Müşteri</dt>
            <dd>{row.card.row.customer}</dd>
          </div>
          <div>
            <dt>Kalan borç</dt>
            <dd>{row.remainingLabel}</dd>
          </div>
          <div>
            <dt>Son ödeme tarihi</dt>
            <dd>{dueLabel}</dd>
          </div>
          <div>
            <dt>Risk durumu</dt>
            <dd>{row.statusLabel}</dd>
          </div>
          <div>
            <dt>Bekleyen onay</dt>
            <dd>{pendingApprovalLabel}</dd>
          </div>
          <div>
            <dt>Son işlem</dt>
            <dd>{row.lastOperationLabel}</dd>
          </div>
        </dl>
      </button>
    </li>
  )
}

/**
 * @param {{
 *   cards: CollectionCardModel[]
 *   todayIso: string
 *   selectedRowId: string | null
 *   dtoById?: Map<string, import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>
 *   onSelectRow: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionOpsTable({
  cards,
  todayIso,
  selectedRowId,
  dtoById = new Map(),
  onSelectRow,
  onOpenPayment,
}) {
  const [isPhoneViewport, setIsPhoneViewport] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 480px)')
    const update = () => setIsPhoneViewport(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  if (cards.length === 0) {
    return (
      <div className="coll-ops-tbl-empty">
        <p>Bu filtrede kayıt yok.</p>
      </div>
    )
  }

  const rows = useMemo(
    () => buildErpTableRows(cards, todayIso, PRIORITY_CALL_LIMIT),
    [cards, todayIso],
  )

  if (isPhoneViewport) {
    return (
      <div className="coll-ops-tbl-wrap coll-ops-tbl-wrap--mobile">
        <ul className="coll-ops-mobile-list" aria-label="Tahsilat kart listesi">
          {rows.map((row) => (
            <OpsMobileCard
              key={row.card.row.id}
              row={row}
              selected={selectedRowId === row.card.row.id}
              pendingApprovalCount={dtoById.get(row.card.row.id)?.pendingApprovalPaymentCount ?? 0}
              onOpen={() => {
                onSelectRow(row.card.row)
                onOpenPayment?.(row.card.row)
              }}
            />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="coll-ops-tbl-wrap">
      <table className="coll-ops-tbl">
        <thead>
          <tr>
            <th className="coll-col--desk">Öncelik</th>
            <th className="coll-col--desk">Sipariş No</th>
            <th>Müşteri</th>
            <th className="coll-col--desk">Telefon</th>
            <th>Risk</th>
            <th className="is-num">Kalan Borç</th>
            <th className="is-num coll-col--desk">Tahsilat %</th>
            <th>Son Ödeme</th>
            <th className="coll-col--desk">Sonraki Aksiyon</th>
            <th className="is-ops">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <OpsTableRow
              key={row.card.row.id}
              row={row}
              selected={selectedRowId === row.card.row.id}
              onSelect={() => onSelectRow(row.card.row)}
              onOpenPayment={() => onOpenPayment?.(row.card.row)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
