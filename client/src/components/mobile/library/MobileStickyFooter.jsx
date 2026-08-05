import './MobileDesignSystem.css'

/**
 * @param {{
 *   children: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function MobileStickyFooter({ children, className = '' }) {
  return <footer className={`mos-mobile-ds mos-mds-sticky-footer ${className}`.trim()}>{children}</footer>
}
