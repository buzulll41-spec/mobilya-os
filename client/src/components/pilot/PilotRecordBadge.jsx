import { getPilotBadgeLabel } from '../../lib/pilotRecordHeuristics.js'

/** @typedef {import('../../lib/pilotRecordHeuristics.js').PilotRecordKind} PilotRecordKind */

/**
 * @param {{ kind: PilotRecordKind | null, className?: string }} props
 */
export default function PilotRecordBadge({ kind, className = '' }) {
  const label = getPilotBadgeLabel(kind)
  if (!label) return null
  const tone = kind === 'demo' ? 'demo' : 'test'
  return (
    <span className={`mos-pilot-badge mos-pilot-badge--${tone}${className ? ` ${className}` : ''}`}>
      {label}
    </span>
  )
}
