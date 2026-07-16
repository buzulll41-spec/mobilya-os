import { useEffect } from 'react'
import './MobileDesignSystem.css'
import MobileActionButton from './MobileActionButton.jsx'

/**
 * @param {{
 *   open: boolean
 *   title?: string
 *   children?: import('react').ReactNode
 *   onClose: () => void
 *   onApply?: () => void
 *   applyLabel?: string
 *   className?: string
 * }} props
 */
export default function MobileFilterSheet({
  open,
  title = 'Filtreler',
  children,
  onClose,
  onApply,
  applyLabel = 'Uygula',
  className = '',
}) {
  useEffect(() => {
    if (!open) return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`mos-mobile-ds mos-mds-sheet ${className}`.trim()} role="dialog" aria-modal="true" onClick={onClose}>
      <section className="mos-mds-sheet__panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 className="mos-mds-section__title">{title}</h2>
        </header>
        <div>{children}</div>
        <footer className="mos-mds-sheet__actions">
          <MobileActionButton variant="secondary" onClick={onClose}>Vazgec</MobileActionButton>
          <MobileActionButton variant="primary" onClick={onApply}>{applyLabel}</MobileActionButton>
        </footer>
      </section>
    </div>
  )
}
