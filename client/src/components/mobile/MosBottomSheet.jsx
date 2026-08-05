import { createPortal } from 'react-dom'

/**
 * FAZ 113 — standart bottom sheet (mobil drawer/modal yerine).
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   title?: string
 *   subtitle?: string
 *   children: import('react').ReactNode
 *   footer?: import('react').ReactNode
 *   ariaLabel?: string
 * }} props
 */
export default function MosBottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  ariaLabel = 'Alt panel',
}) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="mos-bottom-sheet-root" role="presentation" data-open="true">
      <button type="button" className="mos-bottom-sheet-backdrop" aria-label="Kapat" onClick={onClose} />
      <section
        className="mos-bottom-sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        <div className="mos-bottom-sheet-handle" aria-hidden />
        {(title || subtitle) && (
          <header className="mos-bottom-sheet-head">
            {title ? <h2 className="mos-bottom-sheet-title">{title}</h2> : null}
            {subtitle ? <p className="mos-bottom-sheet-sub">{subtitle}</p> : null}
          </header>
        )}
        <div className="mos-bottom-sheet-body">{children}</div>
        {footer ? <footer className="mos-bottom-sheet-foot">{footer}</footer> : null}
      </section>
    </div>,
    document.body,
  )
}
