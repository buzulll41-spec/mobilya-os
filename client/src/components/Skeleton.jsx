import { memo } from 'react'

/**
 * @param {{ className?: string; width?: string; height?: string; style?: import('react').CSSProperties }} props
 */
function Skeleton({ className = '', width = '100%', height = '0.85rem', style }) {
  return (
    <span
      className={`mos-skeleton ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden
    />
  )
}

/**
 * @param {{ lines?: number; className?: string }} props
 */
function SkeletonBlock({ lines = 3, className = '' }) {
  return (
    <div className={`mos-skeleton-block ${className}`.trim()} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '62%' : '100%'} />
      ))}
    </div>
  )
}

/**
 * @param {{ rows?: number; cols?: number }} props
 */
function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="mos-skeleton-table" aria-hidden>
      <Skeleton height="1.35rem" width="38%" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.65rem' }}>
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} height="0.75rem" />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * @param {{ count?: number }} props
 */
function SkeletonCardGrid({ count = 4 }) {
  return (
    <div className="mos-skeleton-card-grid" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mos-pro-card" style={{ minHeight: '5.5rem' }}>
          <Skeleton height="0.65rem" width="45%" />
          <Skeleton height="1.1rem" width="72%" style={{ marginTop: '0.55rem' }} />
          <Skeleton height="0.65rem" width="55%" style={{ marginTop: '0.45rem' }} />
        </div>
      ))}
    </div>
  )
}

export default memo(Skeleton)
export { SkeletonBlock, SkeletonTable, SkeletonCardGrid }
