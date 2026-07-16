import './MobileDesignSystem.css'
import MobileStatusChip from './MobileStatusChip.jsx'

/**
 * @param {{
 *   offline: boolean
 *   pendingCount?: number
 *   lastSyncLabel?: string
 *   className?: string
 * }} props
 */
export default function MobileOfflineBanner({
  offline,
  pendingCount = 0,
  lastSyncLabel = 'Simdi',
  className = '',
}) {
  if (!offline && pendingCount === 0) return null
  return (
    <section className={`mos-mobile-ds mos-mds-offline ${className}`.trim()} role="status" aria-live="polite">
      <div>
        <h3 className="mos-mds-section__title">{offline ? 'Cevrimdisi mod' : 'Senkron bekleyen isler'}</h3>
        <p className="mos-mds-header__subtitle">Son senkron: {lastSyncLabel}</p>
      </div>
      <MobileStatusChip tone={offline ? 'warning' : 'info'} label={`${pendingCount} bekleyen islem`} />
    </section>
  )
}
