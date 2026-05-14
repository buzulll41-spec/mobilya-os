/**
 * Sipariş listesi gerçekten boş olduğunda (mock store sıfırlandıysa veya API boş döndüyse).
 * @param {{ onRefresh?: () => void; isBusy?: boolean; onAddOrder?: () => void }} props
 */
export default function EmptyOrdersState({ onRefresh, isBusy = false, onAddOrder }) {
  return (
    <div className="mos-empty-state" role="status">
      <p className="mos-empty-state-title">Henüz sipariş yok</p>
      <p className="mos-empty-state-body">
        Yeni sipariş ekleyerek operasyon akışını başlatın. Veriler şu an yalnızca bu oturumda tutuluyor
        (mock API).
      </p>
      <div className="mos-empty-state-actions">
        {onAddOrder ? (
          <button type="button" className="mos-btn mos-btn-primary" onClick={onAddOrder}>
            Yeni sipariş
          </button>
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            className="mos-btn mos-btn-ghost"
            onClick={onRefresh}
            disabled={isBusy}
          >
            {isBusy ? 'Yükleniyor…' : 'Listeyi yenile'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
