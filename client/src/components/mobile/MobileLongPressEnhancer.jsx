import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MOBILE_LONG_PRESS_ACTIONS, MOBILE_LONG_PRESS_MS, MOBILE_CARD_SELECTORS } from '../../constants/mobileTouchFirst.js'

/**
 * @param {HTMLElement} row
 * @param {'detail' | 'edit' | 'quick'} actionId
 */
function runRowAction(row, actionId) {
  function findButton(kind) {
    if (kind === 'detail') {
      return (
        row.querySelector('.mos-erp-tbl-op[data-action="detail"]') ||
        row.querySelector('.coll-ops-tbl-op[data-action="detail"]') ||
        row.querySelector('.mos-erp-tbl-op') ||
        row.querySelector('.coll-ops-tbl-op') ||
        row.querySelector('button')
      )
    }
    if (kind === 'edit') {
      return (
        row.querySelector('.mos-erp-tbl-op[data-action="edit"]') ||
        row.querySelector('[data-swipe-edit]') ||
        row.querySelector('.mos-link-action')
      )
    }
    return row.querySelector('[data-swipe-quick]') || row.querySelector('.mos-erp-tbl-op--primary')
  }

  if (actionId === 'detail') {
    const btn = findButton('detail')
    if (btn instanceof HTMLElement) btn.click()
    else row.click()
    return
  }
  if (actionId === 'edit') {
    const btn = findButton('edit')
    if (btn instanceof HTMLElement) btn.click()
    else row.click()
    return
  }
  const quickBtn = findButton('quick')
  if (quickBtn instanceof HTMLElement) quickBtn.click()
  else row.click()
}

/**
 * FAZ 113 — kartlarda uzun basınca aksiyon menüsü.
 */
export default function MobileLongPressEnhancer() {
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const rowRef = useRef(/** @type {HTMLElement | null} */ (null))
  const [menu, setMenu] = useState(/** @type {{ x: number; y: number; row: HTMLElement } | null} */ (null))

  useEffect(() => {
    function clearTimer() {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    /** @param {TouchEvent} event */
    function onTouchStart(event) {
      clearTimer()
      const row = /** @type {HTMLElement | null} */ (
        event.target instanceof Element ? event.target.closest(MOBILE_CARD_SELECTORS) : null
      )
      if (!row) return
      rowRef.current = row
      const touch = event.touches[0]
      if (!touch) return
      timerRef.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(12)
        setMenu({ x: touch.clientX, y: touch.clientY, row })
      }, MOBILE_LONG_PRESS_MS)
    }

    function onTouchEnd() {
      clearTimer()
      rowRef.current = null
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', clearTimer, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      clearTimer()
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', clearTimer)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  function closeMenu() {
    setMenu(null)
  }

  function pickAction(actionId) {
    if (!menu) return
    runRowAction(menu.row, /** @type {'detail' | 'edit' | 'quick'} */ (actionId))
    closeMenu()
  }

  if (!menu || typeof document === 'undefined') return null

  const left = Math.min(Math.max(menu.x - 110, 12), window.innerWidth - 232)
  const top = Math.min(Math.max(menu.y - 120, 12), window.innerHeight - 180)

  return createPortal(
    <>
      <button type="button" className="mos-long-press-backdrop" aria-label="Menüyü kapat" onClick={closeMenu} />
      <div
        className="mos-long-press-menu"
        role="menu"
        aria-label="Kart işlemleri"
        style={{ left: `${left}px`, top: `${top}px` }}
      >
        {MOBILE_LONG_PRESS_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="mos-long-press-menu__btn"
            role="menuitem"
            onClick={() => pickAction(action.id)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  )
}
