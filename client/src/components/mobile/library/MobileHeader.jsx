import './MobileDesignSystem.css'

/**
 * @param {{
 *   title: string
 *   subtitle?: string
 *   leading?: import('react').ReactNode
 *   trailing?: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function MobileHeader({
  title,
  subtitle,
  leading = null,
  trailing = null,
  className = '',
}) {
  return (
    <header className={`mos-mobile-ds mos-mds-header ${className}`.trim()}>
      {leading}
      <div className="mos-mds-header__text">
        <h1 className="mos-mds-header__title">{title}</h1>
        {subtitle ? <p className="mos-mds-header__subtitle">{subtitle}</p> : null}
      </div>
      {trailing}
    </header>
  )
}
