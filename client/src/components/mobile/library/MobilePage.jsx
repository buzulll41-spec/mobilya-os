import './MobileDesignSystem.css'

/**
 * @param {{
 *   children: import('react').ReactNode
 *   className?: string
 *   as?: keyof JSX.IntrinsicElements
 * }} props
 */
export default function MobilePage({ children, className = '', as = 'main' }) {
  const Tag = as
  return <Tag className={`mos-mobile-ds mos-mds-page ${className}`.trim()}>{children}</Tag>
}
