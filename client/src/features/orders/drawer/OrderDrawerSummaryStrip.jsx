/** @typedef {import('../../../mappers/order/orderLifecycleProjection.js').OrderDrawerSummaryCell} OrderDrawerSummaryCell */

/**
 * @param {{
 *   cells: OrderDrawerSummaryCell[]
 * }} props
 */
export default function OrderDrawerSummaryStrip({ cells }) {
  return (
    <section className="oop-summary-strip mos-erp-detail" aria-label="Sipariş özet şeridi">
      <div className="oop-summary-strip__grid mos-erp-detail__grid">
        {cells.map((cell) => (
          <div key={cell.id} className="mos-erp-detail__field mos-erp-detail__field--emphasis">
            <span className="mos-erp-detail__field-label">{cell.label}</span>
            <span
              className={`mos-erp-detail__field-value${
                cell.tone === 'critical'
                  ? ' mos-erp-detail__field-value--critical'
                  : cell.tone === 'warning'
                    ? ' mos-erp-detail__field-value--warning'
                    : ''
              }`}
            >
              {cell.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
