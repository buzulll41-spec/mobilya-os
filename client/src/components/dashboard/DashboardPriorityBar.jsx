import { IconChevronRight } from '../Icons.jsx'

/**
 * @param {{
 *   criticalCount: number
 *   warningCount?: number
 *   onOpenRisk?: () => void
 * }} props
 */
export default function DashboardPriorityBar({ criticalCount, warningCount = 0, onOpenRisk }) {
  const total = criticalCount + warningCount
  if (total <= 0) return null

  const title =
    criticalCount > 0
      ? `${criticalCount} kritik operasyon dikkat bekliyor`
      : `${warningCount} operasyon uyarısı mevcut`

  return (
    <div className="dct-priority-bar" role="status">
      <span className="dct-priority-bar__icon" aria-hidden>
        ⚠
      </span>
      <p className="dct-priority-bar__title">{title}</p>
      {onOpenRisk ? (
        <button type="button" className="dct-priority-bar__btn" onClick={onOpenRisk}>
          Kritikleri gör
          <IconChevronRight />
        </button>
      ) : null}
    </div>
  )
}
