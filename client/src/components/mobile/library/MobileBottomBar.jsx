import './MobileDesignSystem.css'

/**
 * @param {{
 *   children: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function MobileBottomBar({ children, className = '' }) {
  return <nav className={`mos-mobile-ds mos-mds-bottom-bar ${className}`.trim()}>{children}</nav>
}
