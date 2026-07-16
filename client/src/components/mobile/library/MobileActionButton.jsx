import './MobileDesignSystem.css'

/**
 * @param {{
 *   children: import('react').ReactNode
 *   variant?: 'primary' | 'secondary' | 'tonal' | 'danger'
 *   icon?: import('react').ReactNode
 *   className?: string
 *   disabled?: boolean
 *   type?: 'button' | 'submit' | 'reset'
 *   onClick?: import('react').MouseEventHandler<HTMLButtonElement>
 * }} props
 */
export default function MobileActionButton({
  children,
  variant = 'secondary',
  icon = null,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
}) {
  return (
    <button
      type={type}
      className={`mos-mobile-ds mos-mds-btn ${className}`.trim()}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}
