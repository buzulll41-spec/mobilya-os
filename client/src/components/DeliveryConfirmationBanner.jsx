import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'

/**
 * @param {{
 *   count: number
 *   onNavigate: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 * }} props
 */
export default function DeliveryConfirmationBanner({ count, onNavigate }) {
  if (count <= 0) return null

  return (
    <div className="mos-delivery-confirm-banner" role="status">
      <p className="mos-delivery-confirm-banner__text">
        Teslim onayı bekleyen <strong>{count}</strong> sevk var.
      </p>
      <button
        type="button"
        className="mos-delivery-confirm-banner__btn"
        onClick={() => navigateWithOpsFilter('shipment-ops', 'pending_confirm', onNavigate)}
      >
        Teslim Onaylarını Gör
      </button>
    </div>
  )
}
