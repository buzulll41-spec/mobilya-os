import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TOAST_EVENT, UI_STANDARDS } from '../constants/uiStandards.js'

/** @typedef {import('../constants/uiStandards.js').ToastPayload} ToastPayload */
/** @typedef {ToastPayload & { id: string; createdAt: number }} ToastItem */

const ToastContext = createContext(
  /** @type {{ push: (payload: ToastPayload) => void } | null} */ (null),
)

/** @param {ToastPayload} payload */
function normalizeToast(payload) {
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message: payload.message,
    tone: payload.tone ?? 'info',
    durationMs: payload.durationMs ?? UI_STANDARDS.toast.defaultDurationMs,
    createdAt: Date.now(),
  }
}

/** @param {{ children: import('react').ReactNode }} props */
export function ToastProvider({ children }) {
  const [items, setItems] = useState(/** @type {ToastItem[]} */ ([]))

  const push = useCallback((payload) => {
    const next = normalizeToast(payload)
    setItems((prev) => [next, ...prev].slice(0, UI_STANDARDS.toast.maxVisible))
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== next.id))
    }, next.durationMs)
  }, [])

  useEffect(() => {
    /** @param {Event} event */
    function onToast(event) {
      const detail = /** @type {CustomEvent<ToastPayload>} */ (event).detail
      if (!detail?.message) return
      push(detail)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [push])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={(id) => setItems((prev) => prev.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  )
}

/**
 * @param {{ items: ToastItem[]; onDismiss: (id: string) => void }} props
 */
function ToastViewport({ items, onDismiss }) {
  if (!items.length) return null

  return (
    <div className="mos-toast-viewport" aria-live="polite" aria-relevant="additions">
      {items.map((item) => (
        <div key={item.id} className={`mos-toast mos-toast--${item.tone}`} role="status">
          <span className="mos-toast__message">{item.message}</span>
          <button type="button" className="mos-toast__close" aria-label="Kapat" onClick={() => onDismiss(item.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast ToastProvider içinde kullanılmalı')
  }
  return ctx
}
