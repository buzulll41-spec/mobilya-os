import './MobileDesignSystem.css'
import MobileStatusChip from './MobileStatusChip.jsx'

/**
 * @param {{
 *   label: string
 *   value: string | number
 *   delta?: string
 *   tone?: 'neutral' | 'success' | 'warning' | 'critical' | 'info'
 *   helperText?: string
 *   className?: string
 * }} props
 */
export default function MobileKpiCard({
  label,
  value,
  delta,
  tone = 'neutral',
  helperText,
  className = '',
}) {
  return (
    <article className={`mos-mobile-ds mos-mds-kpi ${className}`.trim()}>
      <p className="mos-mds-kpi__meta">{label}</p>
      <p className="mos-mds-kpi__value">{value}</p>
      <div>
        {delta ? <MobileStatusChip tone={tone} label={delta} /> : null}
        {helperText ? <p className="mos-mds-kpi__meta">{helperText}</p> : null}
      </div>
    </article>
  )
}
