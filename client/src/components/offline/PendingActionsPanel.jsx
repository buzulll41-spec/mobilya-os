import { useEffect, useState } from 'react'
import { OFFLINE_SYNC_STATUS } from '../../contracts/v1/offlineFirstErp.js'
import { listPendingSyncItems } from '../../services/offline/offlineSyncQueueStore.js'
import { useOfflineFirst } from '../../state/OfflineFirstProvider.jsx'

export default function PendingActionsPanel() {
  const { pendingCount, forceSync } = useOfflineFirst()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!open) return undefined
    void listPendingSyncItems().then(setItems)
    return undefined
  }, [open, pendingCount])

  if (pendingCount <= 0) return null

  return (
    <div className={`mos-pending-actions${open ? ' mos-pending-actions--open' : ''}`}>
      <button
        type="button"
        className="mos-pending-actions__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Bekleyen işlemler ({pendingCount})
      </button>
      {open ? (
        <div className="mos-pending-actions__panel" role="region" aria-label="Bekleyen offline işlemler">
          <ul className="mos-pending-actions__list">
            {items.map((item) => (
              <li key={item.id} className="mos-pending-actions__item">
                <strong>{item.type}</strong>
                <span data-status={item.status}>{item.status}</span>
                {item.lastError ? <small>{item.lastError}</small> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="mos-pending-actions__sync" onClick={() => void forceSync()}>
            Şimdi senkron et
          </button>
        </div>
      ) : null}
    </div>
  )
}

export { OFFLINE_SYNC_STATUS }
