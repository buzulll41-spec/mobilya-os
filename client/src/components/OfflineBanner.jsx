import { useOfflineFirst } from '../state/OfflineFirstProvider.jsx'
import { OFFLINE_BANNER_MODE } from '../contracts/v1/offlineFirstErp.js'

export default function OfflineBanner() {
  const { bannerMode, pendingCount, syncing } = useOfflineFirst()

  const label =
    bannerMode === OFFLINE_BANNER_MODE.OFFLINE
      ? 'OFFLINE'
      : bannerMode === OFFLINE_BANNER_MODE.SYNCING
        ? 'SYNCING'
        : 'ONLINE'

  const tone =
    bannerMode === OFFLINE_BANNER_MODE.OFFLINE
      ? 'offline'
      : bannerMode === OFFLINE_BANNER_MODE.SYNCING
        ? 'syncing'
        : 'online'

  const detail =
    bannerMode === OFFLINE_BANNER_MODE.OFFLINE
      ? 'İşlemler kuyruğa alınır — bağlantı gelince senkron olur'
      : bannerMode === OFFLINE_BANNER_MODE.SYNCING
        ? syncing
          ? 'Senkronizasyon devam ediyor…'
          : `${pendingCount} bekleyen işlem`
        : pendingCount > 0
          ? `${pendingCount} bekleyen işlem senkron bekliyor`
          : 'Bağlantı aktif'

  return (
    <div
      className={`mos-offline-banner mos-offline-banner--faz114 mos-offline-banner--${tone}`}
      role="status"
      aria-live="polite"
    >
      <span className="mos-offline-banner__badge">{label}</span>
      <span className="mos-offline-banner__text">{detail}</span>
    </div>
  )
}
