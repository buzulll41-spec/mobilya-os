import './MobileDesignSystem.css'

/**
 * @param {{
 *   title?: string
 *   subtitle?: string
 *   children?: import('react').ReactNode
 *   footer?: import('react').ReactNode
 *   className?: string
 *   as?: keyof JSX.IntrinsicElements
 * }} props
 */
export default function MobileCard({
  title,
  subtitle,
  children,
  footer,
  className = '',
  as = 'article',
}) {
  const Tag = as
  return (
    <Tag className={`mos-mobile-ds mos-mds-card ${className}`.trim()}>
      {title || subtitle ? (
        <header>
          {title ? <h3 className="mos-mds-section__title">{title}</h3> : null}
          {subtitle ? <p className="mos-mds-header__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
      {footer ? <footer>{footer}</footer> : null}
    </Tag>
  )
}
