import { useEffect, useState } from 'react'
import { isDemoMode, isDevelopmentMode } from '../../config/appMode.js'
import {
  clearOfflineCaches,
  getOfflineFirstSnapshot,
} from '../../services/offline/offlineFirstFacade.js'
import { drainOfflineSyncQueue } from '../../services/offline/offlineSyncEngine.js'
import { useOfflineFirst } from '../../state/OfflineFirstProvider.jsx'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KB`
}

export default function DeveloperOfflinePanel() {
  const visible = isDevelopmentMode() || isDemoMode()
  const { refreshSnapshot, forceSync } = useOfflineFirst()
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState(null)

  useEffect(() => {
    if (!visible || !open) return undefined
    void getOfflineFirstSnapshot().then(setSnap)
    const id = window.setInterval(() => {
      void getOfflineFirstSnapshot().then(setSnap)
    }, 4000)
    return () => window.clearInterval(id)
  }, [visible, open])

  if (!visible) return null

  async function handleRetry() {
    await drainOfflineSyncQueue()
    await refreshSnapshot()
    setSnap(await getOfflineFirstSnapshot())
  }

  async function handleClearCache() {
    await clearOfflineCaches()
    await refreshSnapshot()
    setSnap(await getOfflineFirstSnapshot())
  }

  return (
    <div className={`mos-dev-offline${open ? ' mos-dev-offline--open' : ''}`}>
      <button
        type="button"
        className="mos-dev-offline__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Offline
      </button>
      {open && snap ? (
        <div className="mos-dev-offline__panel" role="region" aria-label="Offline developer panel">
          <strong>Offline First (FAZ 114)</strong>
          <dl>
            <div>
              <dt>Kuyruk</dt>
              <dd>
                {snap.queue.waiting} bekliyor · {snap.queue.error} hata · {snap.pending} toplam
              </dd>
            </div>
            <div>
              <dt>Cache</dt>
              <dd>
                Sipariş {snap.cache.orders} ({formatBytes(snap.cache.ordersBytes)}) · Müşteri{' '}
                {snap.cache.customers} ({formatBytes(snap.cache.customersBytes)}) · Ürün{' '}
                {snap.cache.products} ({formatBytes(snap.cache.productsBytes)})
              </dd>
            </div>
            <div>
              <dt>Çakışma</dt>
              <dd>{snap.conflicts}</dd>
            </div>
          </dl>
          <div className="mos-dev-offline__actions">
            <button type="button" onClick={() => void forceSync()}>
              Force Sync
            </button>
            <button type="button" onClick={() => void handleRetry()}>
              Retry
            </button>
            <button type="button" onClick={() => void handleClearCache()}>
              Clear Cache
            </button>
          </div>
          <ul className="mos-dev-offline__logs">
            {snap.logs.slice(0, 5).map((log) => (
              <li key={log.id}>
                [{log.level}] {log.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
