import { useEffect, useRef, useState } from 'react'

/** @typedef {'detail' | 'payment' | 'shipment' | 'contract'} OrderCardQuickAction */

/**
 * @param {{
 *   orderId: string
 *   onAction: (action: OrderCardQuickAction) => void
 * }} props
 */
export default function OrderOperationCardMenu({ orderId, onAction }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (!rootRef.current?.contains(/** @type {Node} */ (e.target))) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  /** @param {OrderCardQuickAction} action */
  function pick(action) {
    setOpen(false)
    onAction(action)
  }

  return (
    <div
      ref={rootRef}
      className="mos-order-op-card__menu"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="mos-order-op-card__menu-trigger"
        aria-label={`Sipariş ${orderId} hızlı işlemler`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <div className="mos-order-op-card__menu-panel" role="menu">
          <button type="button" role="menuitem" onClick={() => pick('detail')}>
            Sipariş Detayı
          </button>
          <button type="button" role="menuitem" onClick={() => pick('payment')}>
            Tahsilat Gir
          </button>
          <button type="button" role="menuitem" onClick={() => pick('shipment')}>
            Sevk Planla
          </button>
          <button type="button" role="menuitem" onClick={() => pick('contract')}>
            Sözleşme Yazdır
          </button>
        </div>
      ) : null}
    </div>
  )
}
