import { toMobileFriendlyErrorMessage } from '../../mappers/mobile/mobileStoreOpsModel.js'

/**
 * @param {{
 *   message: string
 *   onRetry?: () => void
 *   className?: string
 * }} props
 */
export default function MobileStoreErrorState({ message, onRetry, className = '' }) {
  const friendly = toMobileFriendlyErrorMessage(message)

  return (
    <div className={`mos-mobile-store-error ${className}`.trim()} role="alert">
      <span className="mos-mobile-store-error__icon" aria-hidden>
        ⚠️
      </span>
      <p className="mos-mobile-store-error__text">{friendly}</p>
      {onRetry ? (
        <button type="button" className="mos-mobile-store-error__retry" onClick={onRetry}>
          Yeniden dene
        </button>
      ) : null}
    </div>
  )
}
