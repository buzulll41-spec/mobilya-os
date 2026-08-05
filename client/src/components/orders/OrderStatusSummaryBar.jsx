/** @typedef {import('../../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */

/** @type {{ key: OrderListRowVM['status']; label: string; slug: string }[]} */
const SUMMARY_ITEMS = [
  { key: 'Bekleniyor', label: 'Bekleyen', slug: 'bekleniyor' },
  { key: 'Üretimde', label: 'Üretimde', slug: 'uretimde' },
  { key: 'Hazır', label: 'Hazır', slug: 'hazir' },
  { key: 'Eksik Var', label: 'Eksik Var', slug: 'eksik' },
  { key: 'Teslim Edildi', label: 'Teslim Edildi', slug: 'teslim' },
]

/**
 * @param {{
 *   orders: OrderListRowVM[]
 *   activeStatus?: string
 *   onStatusClick?: (status: OrderListRowVM['status']) => void
 * }} props
 */
export default function OrderStatusSummaryBar({ orders, activeStatus, onStatusClick }) {
  /** @type {Record<string, number>} */
  const counts = {}
  for (const item of SUMMARY_ITEMS) counts[item.key] = 0
  for (const order of orders) {
    if (order.status in counts) counts[order.status] += 1
  }

  return (
    <div className="mos-order-status-bar" aria-label="Durum özeti">
      {SUMMARY_ITEMS.map((item) => {
        const active = activeStatus === item.key
        return (
          <button
            key={item.key}
            type="button"
            className={`mos-order-status-bar__item mos-order-status-bar__item--${item.slug}${active ? ' mos-order-status-bar__item--active' : ''}`}
            aria-pressed={active}
            onClick={() => onStatusClick?.(item.key)}
          >
            <span className="mos-order-status-bar__count">{counts[item.key] ?? 0}</span>
            <span className="mos-order-status-bar__label">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
