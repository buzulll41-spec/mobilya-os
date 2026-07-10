/** @typedef {import('../../features/orders/ordersOpsCenterUi.js').OrdersOpsDetailView} OrdersOpsDetailView */

import MosButton from '../MosButton.jsx'

/**
 * @param {{
 *   view: OrdersOpsDetailView | null
 *   onOpen: () => void
 * }} props
 */
export default function OrdersOpsDetailStrip({ view, onOpen }) {
  if (!view) {
    return (
      <section className="mos-erp-detail mos-erp-detail--orders mos-erp-detail--empty" aria-label="Seçili sipariş">
        <p className="mos-erp-detail__empty">Tablodan sipariş seçin.</p>
      </section>
    )
  }

  const riskClass =
    view.riskTone === 'critical'
      ? ' mos-erp-detail__field-value--critical'
      : view.riskTone === 'warning'
        ? ' mos-erp-detail__field-value--warning'
        : ''

  const collectClass =
    view.collectionTone === 'warning'
      ? ' mos-erp-detail__field-value--warning'
      : view.collectionTone === 'success'
        ? ' mos-erp-detail__field-value--success'
        : ''

  return (
    <section className="mos-erp-detail mos-erp-detail--orders" aria-label="Seçili sipariş">
      <div className="mos-erp-detail__grid mos-erp-detail__grid--orders">
        <div className="mos-erp-detail__body mos-erp-detail__body--orders">
          <div className="mos-erp-detail__field mos-erp-detail__field--primary">
            <span className="mos-erp-detail__field-label">Müşteri</span>
            <span className="mos-erp-detail__field-value mos-erp-detail__field-value--name">{view.customer}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Sipariş</span>
            <span className="mos-erp-detail__field-value">{view.orderNo}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Termin</span>
            <span className="mos-erp-detail__field-value">{view.terminLabel}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Tahsilat</span>
            <span className={`mos-erp-detail__field-value${collectClass}`}>{view.collectionLabel}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Sevk</span>
            <span className="mos-erp-detail__field-value">{view.shipmentLabel}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Risk</span>
            <span className={`mos-erp-detail__field-value${riskClass}`}>{view.riskLabel}</span>
          </div>
        </div>
        <div className="mos-erp-detail__actions">
          <MosButton context="detail" label="Siparişi aç" onClick={onOpen} />
        </div>
      </div>
    </section>
  )
}
