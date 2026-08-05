/**
 * @param {{
 *   title?: string
 *   onRefresh: () => void | Promise<void>
 *   refreshing?: boolean
 *   updatedAt?: string | null
 * }} props
 */
export default function PageRefreshBar({
  title = 'Verileri yenile',
  onRefresh,
  refreshing = false,
  updatedAt = null,
}) {
  return (
    <div className="mos-page-refresh" role="region" aria-label="Sayfa yenileme">
      <div className="mos-page-refresh__copy">
        <span className="mos-page-refresh__title">{title}</span>
        {updatedAt ? (
          <span className="mos-page-refresh__meta">Son güncelleme: {updatedAt}</span>
        ) : null}
      </div>
      <button
        type="button"
        className="mos-btn mos-btn-ghost mos-btn-sm mos-page-refresh__btn"
        onClick={() => void onRefresh()}
        disabled={refreshing}
      >
        {refreshing ? 'Yenileniyor…' : 'Yenile'}
      </button>
    </div>
  )
}
