import { memo } from 'react'

/**
 * @param {{
 *   icon?: string
 *   title: string
 *   body?: string
 *   actionLabel?: string
 *   onAction?: () => void
 *   secondaryLabel?: string
 *   onSecondary?: () => void
 *   secondaryDisabled?: boolean
 *   className?: string
 * }} props
 */
function EmptyState({
  icon = '📋',
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  secondaryDisabled = false,
  className = '',
}) {
  return (
    <div className={`mos-pro-empty ${className}`.trim()} role="status">
      <span className="mos-pro-empty__icon" aria-hidden>
        {icon}
      </span>
      <h3 className="mos-pro-empty__title">{title}</h3>
      {body ? <p className="mos-pro-empty__body">{body}</p> : null}
      {(actionLabel || secondaryLabel) ? (
        <div className="mos-pro-empty__actions">
          {actionLabel && onAction ? (
            <button type="button" className="mos-btn mos-btn-primary" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <button
              type="button"
              className="mos-btn mos-btn-ghost"
              onClick={onSecondary}
              disabled={secondaryDisabled}
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default memo(EmptyState)
