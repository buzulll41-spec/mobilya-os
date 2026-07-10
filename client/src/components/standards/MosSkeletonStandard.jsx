import Skeleton, { SkeletonBlock, SkeletonCardGrid, SkeletonTable } from '../Skeleton.jsx'
import { UI_STANDARDS } from '../../constants/uiStandards.js'

/** @typedef {import('../../constants/uiStandards.js').SkeletonVariant} SkeletonVariant */

/**
 * Standart skeleton yükleyici.
 * @param {{
 *   variant?: SkeletonVariant
 *   label?: string
 *   rows?: number
 *   cols?: number
 *   count?: number
 *   className?: string
 * }} props
 */
export default function MosSkeletonStandard({
  variant = 'table',
  label = 'Yükleniyor…',
  rows = UI_STANDARDS.skeleton.tableDefaultRows,
  cols = UI_STANDARDS.skeleton.tableDefaultCols,
  count = UI_STANDARDS.skeleton.cardGridDefaultCount,
  className = '',
}) {
  return (
    <div
      className={`mos-skeleton-standard ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <span className="mos-skeleton-standard__label">{label}</span>
      {variant === 'table' ? <SkeletonTable rows={rows} cols={cols} /> : null}
      {variant === 'block' ? <SkeletonBlock lines={rows} /> : null}
      {variant === 'card-grid' ? <SkeletonCardGrid count={count} /> : null}
      {variant === 'inline' ? <Skeleton height="0.85rem" width="72%" /> : null}
    </div>
  )
}

export { Skeleton, SkeletonBlock, SkeletonTable, SkeletonCardGrid }
