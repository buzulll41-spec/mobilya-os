import './MobileDesignSystem.css'

/**
 * @param {{
 *   title?: string
 *   subtitle?: string
 *   children: import('react').ReactNode
 *   className?: string
 *   actions?: import('react').ReactNode
 * }} props
 */
export default function MobileSection({ title, subtitle, children, className = '', actions = null }) {
  return (
    <section className={`mos-mobile-ds mos-mds-section ${className}`.trim()}>
      {title || subtitle || actions ? (
        <header className="mos-mds-section__head">
          <div>
            {title ? <h2 className="mos-mds-section__title">{title}</h2> : null}
            {subtitle ? <p className="mos-mds-header__subtitle">{subtitle}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  )
}
