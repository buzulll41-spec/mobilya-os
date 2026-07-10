import { useEffect, useState } from 'react'
import {
  listOpenConflicts,
  resolveOfflineConflict,
} from '../../services/offline/offlineConflictResolver.js'
import { useOfflineFirst } from '../../state/OfflineFirstProvider.jsx'

export default function ConflictCenterPanel() {
  const { conflictCount, refreshSnapshot } = useOfflineFirst()
  const [open, setOpen] = useState(false)
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    if (!open && conflictCount <= 0) return undefined
    void listOpenConflicts().then(setConflicts)
    return undefined
  }, [open, conflictCount])

  if (conflictCount <= 0) return null

  async function resolve(id, resolution) {
    await resolveOfflineConflict(id, resolution)
    const next = await listOpenConflicts()
    setConflicts(next)
    await refreshSnapshot()
  }

  return (
    <div className={`mos-conflict-center${open ? ' mos-conflict-center--open' : ''}`}>
      <button
        type="button"
        className="mos-conflict-center__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Çakışma Merkezi ({conflictCount})
      </button>
      {open ? (
        <div className="mos-conflict-center__panel" role="region" aria-label="Çakışma merkezi">
          <ul className="mos-conflict-center__list">
            {conflicts.map((conflict) => (
              <li key={conflict.id} className="mos-conflict-center__item">
                <strong>{conflict.entityType}</strong>
                <span>{conflict.entityKey}</span>
                <div className="mos-conflict-center__actions">
                  <button type="button" onClick={() => void resolve(conflict.id, 'keep-local')}>
                    Yerel
                  </button>
                  <button type="button" onClick={() => void resolve(conflict.id, 'keep-server')}>
                    Sunucu
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
