import { PILOT_SCOPE_OPTIONS } from '../../lib/pilotRecordHeuristics.js'

/** @typedef {import('../../lib/pilotRecordHeuristics.js').PilotDataScope} PilotDataScope */

/**
 * @param {{
 *   scope: PilotDataScope
 *   onScopeChange: (scope: PilotDataScope) => void
 *   canToggle?: boolean
 *   hint?: string
 *   className?: string
 * }} props
 */
export default function PilotScopeToggle({
  scope,
  onScopeChange,
  canToggle = true,
  hint,
  className = '',
}) {
  if (!canToggle) {
    return hint ? (
      <p className={`mos-pilot-scope-hint${className ? ` ${className}` : ''}`}>{hint}</p>
    ) : null
  }

  return (
    <div className={`mos-pilot-scope${className ? ` ${className}` : ''}`} role="group" aria-label="Kayıt türü filtresi">
      {PILOT_SCOPE_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`mos-pilot-scope__btn${scope === opt.id ? ' is-active' : ''}`}
          aria-pressed={scope === opt.id}
          onClick={() => onScopeChange(/** @type {PilotDataScope} */ (opt.id))}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
