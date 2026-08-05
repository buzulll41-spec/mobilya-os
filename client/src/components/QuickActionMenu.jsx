import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { resolveQuickActionsForPage } from '../lib/quickActions.js'

/**
 * @param {{
 *   page: string
 *   onAction?: (action: import('../lib/quickActions.js').QuickActionDef) => void
 *   userRole?: import('../contracts/v1/user.js').UserRole
 * }} props
 */
function QuickActionMenu({ page, onAction, userRole }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const actions = resolveQuickActionsForPage(page, userRole)

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleSelect = useCallback(
    (action) => {
      setOpen(false)
      onAction?.(action)
    },
    [onAction],
  )

  return (
    <div className="mos-quick-action" ref={rootRef}>
      <button
        type="button"
        className="mos-quick-action-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Hızlı işlem menüsü"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>⚡</span>
        <span>Hızlı İşlem</span>
      </button>
      {open ? (
        <div className="mos-quick-action-panel" role="menu" aria-label="Hızlı işlemler">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="mos-quick-action-item"
              role="menuitem"
              onClick={() => handleSelect(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default memo(QuickActionMenu)
