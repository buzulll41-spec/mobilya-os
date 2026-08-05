import { getDrawerVisibleLocks } from '../../../mappers/order/globalOperationLocks.js'

/** @typedef {import('../../../mappers/order/globalOperationLocks.js').OperationLock} OperationLock */

/**
 * @param {{
 *   locks: OperationLock[]
 *   onGoSsh?: () => void
 * }} props
 */
export default function OrderDrawerLockBanner({ locks, onGoSsh }) {
  const visible = getDrawerVisibleLocks(locks)
  if (!visible.length) return null

  const bannerSeverity = visible[0]?.severity ?? 'warning'
  const hasSsh = locks.some((l) => l.id === 'SSH_BLOCKS_SHIPMENT')

  return (
    <div
      className={`oop-lock-banner oop-lock-banner--${bannerSeverity}`}
      role="status"
      aria-live="polite"
    >
      <ul className="oop-lock-banner__list">
        {visible.map((lock) => (
          <li key={lock.id}>
            <strong>{lock.severity === 'critical' ? 'Kilit' : 'Uyarı'}:</strong> {lock.message}
          </li>
        ))}
      </ul>
      {hasSsh && onGoSsh ? (
        <button type="button" className="oop-btn oop-btn--ghost oop-btn--sm" onClick={onGoSsh}>
          SSH sekmesine git
        </button>
      ) : null}
    </div>
  )
}
