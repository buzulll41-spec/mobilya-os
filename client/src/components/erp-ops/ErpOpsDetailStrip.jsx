/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */

import MosButton from '../MosButton.jsx'

/**
 * @param {{
 *   row: ErpOpsTableRow | null
 *   onOpen: () => void
 *   emptyLabel?: string
 *   actionLabel?: string
 * }} props
 */
export default function ErpOpsDetailStrip({
  row,
  onOpen,
  emptyLabel = 'Tablodan kayıt seçin.',
  actionLabel,
}) {
  if (!row) {
    return (
      <section className="mos-erp-detail mos-erp-detail--empty" aria-label="Seçili kayıt">
        <p className="mos-erp-detail__empty">{emptyLabel}</p>
      </section>
    )
  }

  const btnLabel = actionLabel ?? row.actionButtonLabel ?? 'Aç'

  return (
    <section className="mos-erp-detail" aria-label="Seçili kayıt">
      <div className="mos-erp-detail__grid">
        <div className="mos-erp-detail__body">
          <div className="mos-erp-detail__primary">
            <h2 className="mos-erp-detail__name">{row.customer}</h2>
            <span className="mos-erp-detail__meta">
              {row.orderNo}
              {row.category ? ` · ${row.category}` : ''}
            </span>
          </div>
          <div className="mos-erp-detail__field mos-erp-detail__field--emphasis">
            <span className="mos-erp-detail__field-label">Durum</span>
            <span
              className={`mos-erp-detail__field-value${
                row.tone === 'critical'
                  ? ' mos-erp-detail__field-value--critical'
                  : row.tone === 'warning'
                    ? ' mos-erp-detail__field-value--warning'
                    : ''
              }`}
            >
              {row.statusLabel}
            </span>
          </div>
          {row.category ? (
            <div className="mos-erp-detail__field mos-erp-detail__field--emphasis">
              <span className="mos-erp-detail__field-label">Risk</span>
              <span
                className={`mos-erp-detail__field-value${
                  row.tone === 'critical'
                    ? ' mos-erp-detail__field-value--critical'
                    : row.tone === 'warning'
                      ? ' mos-erp-detail__field-value--warning'
                      : ''
                }`}
              >
                {row.category}
              </span>
            </div>
          ) : null}
          {row.dateLabel ? (
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Tarih</span>
              <span className="mos-erp-detail__field-value">{row.dateLabel}</span>
            </div>
          ) : null}
          {row.nextActionLabel ? (
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Sonraki aksiyon</span>
              <span className="mos-erp-detail__field-value">{row.nextActionLabel}</span>
            </div>
          ) : null}
        </div>
        <div className="mos-erp-detail__actions">
          <MosButton context="detail" label={btnLabel} onClick={onOpen} />
        </div>
      </div>
    </section>
  )
}
