import EmptyState from './EmptyState.jsx'

/**
 * Sipariş listesi gerçekten boş olduğunda.
 * @param {{ onRefresh?: () => void; isBusy?: boolean; onAddOrder?: () => void }} props
 */
export default function EmptyOrdersState({ onRefresh, isBusy = false, onAddOrder }) {
  return (
    <EmptyState
      icon="📦"
      title="Henüz sipariş yok"
      body="Yeni sipariş ekleyerek operasyon akışını başlatın. Veriler şu an yalnızca bu oturumda tutuluyor (mock API)."
      actionLabel={onAddOrder ? 'Yeni sipariş' : undefined}
      onAction={onAddOrder}
      secondaryLabel={onRefresh ? (isBusy ? 'Yükleniyor…' : 'Listeyi yenile') : undefined}
      onSecondary={onRefresh}
      secondaryDisabled={isBusy}
    />
  )
}
