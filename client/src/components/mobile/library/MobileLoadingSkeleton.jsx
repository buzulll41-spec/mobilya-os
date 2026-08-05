import './MobileDesignSystem.css'

/**
 * @param {{
 *   rows?: number
 *   showHeader?: boolean
 *   className?: string
 * }} props
 */
export default function MobileLoadingSkeleton({ rows = 3, showHeader = true, className = '' }) {
  return (
    <section className={`mos-mobile-ds mos-mds-card ${className}`.trim()} aria-busy="true" aria-live="polite">
      {showHeader ? (
        <>
          <div className="mos-mds-skeleton" style={{ height: 18, width: '48%' }} />
          <div className="mos-mds-skeleton" style={{ height: 14, width: '72%' }} />
        </>
      ) : null}
      <div className="mos-mds-loading-rows">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="mos-mds-skeleton" style={{ height: 14, width: `${92 - index * 6}%` }} />
        ))}
      </div>
    </section>
  )
}
