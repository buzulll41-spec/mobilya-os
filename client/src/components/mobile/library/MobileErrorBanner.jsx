import './MobileDesignSystem.css'
import MobileActionButton from './MobileActionButton.jsx'

/**
 * @param {{
 *   title?: string
 *   message: string
 *   retryLabel?: string
 *   onRetry?: () => void
 *   className?: string
 * }} props
 */
export default function MobileErrorBanner({
  title = 'Bir hata olustu',
  message,
  retryLabel = 'Tekrar dene',
  onRetry,
  className = '',
}) {
  return (
    <section className={`mos-mobile-ds mos-mds-error ${className}`.trim()} role="alert">
      <h3 className="mos-mds-section__title">{title}</h3>
      <p className="mos-mds-header__subtitle">{message}</p>
      {onRetry ? <MobileActionButton variant="danger" onClick={onRetry}>{retryLabel}</MobileActionButton> : null}
    </section>
  )
}
