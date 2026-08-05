import './MobileDesignSystem.css'

/**
 * @param {{
 *   label: string
 *   tone?: 'neutral' | 'success' | 'warning' | 'critical' | 'info'
 *   icon?: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function MobileStatusChip({ label, tone = 'neutral', icon = null, className = '' }) {
  return (
    <span className={`mos-mobile-ds mos-mds-chip ${className}`.trim()} data-tone={tone}>
      {icon}
      {label}
    </span>
  )
}
