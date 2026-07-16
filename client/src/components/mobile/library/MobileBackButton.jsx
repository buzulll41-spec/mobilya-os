import './MobileDesignSystem.css'

/**
 * @param {{
 *   label?: string
 *   onClick?: () => void
 *   className?: string
 * }} props
 */
export default function MobileBackButton({ label = 'Geri', onClick, className = '' }) {
  return (
    <button type="button" className={`mos-mobile-ds mos-mds-back ${className}`.trim()} onClick={onClick} aria-label={label}>
      ←
    </button>
  )
}
