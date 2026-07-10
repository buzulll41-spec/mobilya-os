import { useState } from 'react'
import { formatCustomerPhonesCompact } from '../newOrderWizardModel.js'

/**
 * @param {{
 *   orderNo: string
 *   customer: string
 *   phone?: string | null
 *   address?: string | null
 *   note?: string | null
 *   product?: string | null
 *   salesPerson?: string | null
 * }} props
 */
export default function OrderPanelSummaryCard({
  orderNo,
  customer,
  phone,
  address,
  note,
  product,
  salesPerson,
}) {
  const [expanded, setExpanded] = useState(false)
  const phoneDisplay = phone?.trim() || formatCustomerPhonesCompact({ phone, phone2: undefined }) || '—'
  const noteText = note?.trim() || '—'
  const addressText = address?.trim() || '—'

  return (
    <section className="oop-card oop-card--saas oop-card--summary" aria-labelledby="oop-summary-title">
      <div className="oop-card__head">
        <h3 id="oop-summary-title" className="oop-card-title">
          Sipariş özeti
        </h3>
        <button
          type="button"
          className="oop-link-btn"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Detayı gizle' : 'Detay göster'}
        </button>
      </div>

      <dl className="oop-summary-kv">
        <div className="oop-summary-kv__row">
          <dt>Sipariş no</dt>
          <dd>{orderNo}</dd>
        </div>
        <div className="oop-summary-kv__row">
          <dt>Müşteri</dt>
          <dd>{customer}</dd>
        </div>
        <div className="oop-summary-kv__row">
          <dt>Telefon</dt>
          <dd>{phoneDisplay}</dd>
        </div>
        <div className="oop-summary-kv__row">
          <dt>Adres</dt>
          <dd className={expanded ? undefined : 'oop-summary-clamp'}>{addressText}</dd>
        </div>
        <div className="oop-summary-kv__row">
          <dt>Not</dt>
          <dd className={expanded ? 'oop-summary-note' : 'oop-summary-clamp oop-summary-note'}>
            {noteText}
          </dd>
        </div>
      </dl>

      {expanded ? (
        <div className="oop-summary-extra">
          {product ? (
            <p>
              <span className="oop-summary-extra__label">Ürün</span>
              {product}
            </p>
          ) : null}
          {salesPerson?.trim() ? (
            <p>
              <span className="oop-summary-extra__label">Satış</span>
              {salesPerson.trim()}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
