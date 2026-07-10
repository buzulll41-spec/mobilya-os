import { navigateWithOpsFilter } from '../lib/opsDeepLink.js'
import { canApprovePayments } from '../lib/paymentApprovalPolicy.js'

/**
 * @param {{
 *   count: number
 *   userRole?: string
 *   onNavigate: (page: string, ctx?: { opsFilter?: import('../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 * }} props
 */
export default function PaymentApprovalBanner({ count, userRole, onNavigate }) {
  if (count <= 0 || !canApprovePayments(userRole)) return null

  return (
    <div className="mos-delivery-confirm-banner mos-payment-approval-banner" role="status">
      <p className="mos-delivery-confirm-banner__text">
        <strong>{count}</strong> adet tahsilat onayı bekliyor.
      </p>
      <button
        type="button"
        className="mos-delivery-confirm-banner__btn"
        onClick={() => navigateWithOpsFilter('collection', 'pending-approval', onNavigate)}
      >
        Onay Kuyruğunu Gör
      </button>
    </div>
  )
}
