/**
 * API hata bandı — yeniden dene ile `refreshOrders`.
 * @param {{ message: string; onRetry: () => void }} props
 */
export default function OrdersErrorBanner({ message, onRetry }) {
  return (
    <div className="mos-api-error" role="alert">
      <p className="mos-api-error-text">{message}</p>
      <button type="button" className="mos-btn mos-btn-ghost mos-btn-sm" onClick={onRetry}>
        Yeniden dene
      </button>
    </div>
  )
}
