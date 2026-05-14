import { DELIVERY_QUICK_FILTERS } from '../../constants/orderFiltersUi.js'

/**
 * Sipariş listelerinde ortak durum + teslim + satış filtreleri.
 * @param {{
 *   status: string
 *   delivery: string
 *   sales: string
 *   onStatusChange: (v: string) => void
 *   onDeliveryChange: (v: string) => void
 *   onSalesChange: (v: string) => void
 *   statusOptions: string[]
 *   salesOptions: string[]
 *   resultCount: number
 *   className?: string
 * }} props
 */
export default function OrderFiltersToolbar({
  status,
  delivery,
  sales,
  onStatusChange,
  onDeliveryChange,
  onSalesChange,
  statusOptions,
  salesOptions,
  resultCount,
  className = '',
}) {
  const rootClass = ['mos-order-filters', className].filter(Boolean).join(' ')

  return (
    <div className={rootClass}>
      <label className="mos-filter-label">
        <span className="mos-sr-only">Durum</span>
        <select className="mos-filter-select" value={status} onChange={(e) => onStatusChange(e.target.value)}>
          <option value="all">Tüm durumlar</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="mos-filter-label">
        <span className="mos-sr-only">Teslim / sevk</span>
        <select
          className="mos-filter-select"
          value={delivery}
          onChange={(e) => onDeliveryChange(e.target.value)}
        >
          {DELIVERY_QUICK_FILTERS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mos-filter-label">
        <span className="mos-sr-only">Satış personeli</span>
        <select className="mos-filter-select" value={sales} onChange={(e) => onSalesChange(e.target.value)}>
          <option value="all">Tüm satış</option>
          {salesOptions.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <span className="mos-panel-meta">{resultCount} kayıt</span>
    </div>
  )
}
