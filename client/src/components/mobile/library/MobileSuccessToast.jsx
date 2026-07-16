import { useEffect } from 'react'
import './MobileDesignSystem.css'

/**
 * @param {{
 *   open: boolean
 *   message: string
 *   durationMs?: number
 *   onClose?: () => void
 *   className?: string
 * }} props
 */
export default function MobileSuccessToast({
  open,
  message,
  durationMs = 2800,
  onClose,
  className = '',
}) {
  useEffect(() => {
    if (!open || !onClose) return undefined
    const timer = setTimeout(() => onClose(), durationMs)
    return () => clearTimeout(timer)
  }, [open, onClose, durationMs])

  if (!open) return null
  return (
    <aside className={`mos-mobile-ds mos-mds-toast ${className}`.trim()} role="status" aria-live="polite">
      {message}
    </aside>
  )
}
