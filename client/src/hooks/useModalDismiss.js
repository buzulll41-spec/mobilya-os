import { useEffect } from 'react'

/**
 * Escape + body scroll kilidi (modal / wizard).
 * @param {boolean} open
 * @param {() => void} onClose
 */
export function useModalDismiss(open, onClose) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])
}
