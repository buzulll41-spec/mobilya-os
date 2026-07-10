/**
 * @param {{
 *   rows: { label: string, value: string }[]
 *   orderNo: string
 *   customer: string
 * }} props
 */
export default function OperationOrderSummary({ rows, orderNo, customer }) {
  return (
    <section className="oop-card oop-card--summary-rich" aria-labelledby="oop-summary-rich-title">
      <div className="oop-summary-rich-head">
        <h3 id="oop-summary-rich-title" className="oop-card-title">
          Sipariş özeti
        </h3>
        <p className="oop-summary-rich-meta">
          {orderNo} · {customer}
        </p>
      </div>
      <div className="oop-summary-rich-grid">
        {rows.map((row) => (
          <div key={row.label} className="oop-summary-rich-cell">
            <span className="oop-summary-rich-label">{row.label}</span>
            <strong className="oop-summary-rich-value">{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}
