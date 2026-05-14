/** @typedef {import('../data/seedOrders.js').Order} Order */

/** @param {Order['status']} status */
function statusSlug(status) {
  const map = {
    Bekleniyor: 'bekleniyor',
    Üretimde: 'uretimde',
    Geldi: 'geldi',
    'Eksik Var': 'eksik',
    Hazır: 'hazir',
    'Teslim Edildi': 'teslim',
  }
  return map[status] ?? 'bekleniyor'
}

/** @param {{ status: Order['status'] }} props */
export default function StatusBadge({ status }) {
  const slug = statusSlug(status)
  return (
    <span className={`mos-status mos-status--${slug}`}>
      <span className="mos-status-dot" aria-hidden />
      <span className="mos-status-label">{status}</span>
    </span>
  )
}
