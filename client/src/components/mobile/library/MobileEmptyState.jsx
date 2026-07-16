import './MobileDesignSystem.css'
import MobileActionButton from './MobileActionButton.jsx'

/**
 * @param {{
 *   title: string
 *   description?: string
 *   actionLabel?: string
 *   onAction?: () => void
 *   icon?: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function MobileEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon = '🗂',
  className = '',
}) {
  return (
    <section className={`mos-mobile-ds mos-mds-empty ${className}`.trim()}>
      <span aria-hidden>{icon}</span>
      <h3 className="mos-mds-section__title">{title}</h3>
      {description ? <p className="mos-mds-header__subtitle">{description}</p> : null}
      {actionLabel ? <MobileActionButton onClick={onAction}>{actionLabel}</MobileActionButton> : null}
    </section>
  )
}
