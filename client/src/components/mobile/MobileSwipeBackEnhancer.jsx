import { useEffect, useRef } from 'react'
import {
  MOBILE_SWIPE_BACK_EDGE_PX,
  MOBILE_SWIPE_BACK_ROOTS,
  MOBILE_SWIPE_BACK_THRESHOLD_PX,
} from '../../constants/mobileTouchFirst.js'

function findOpenOverlayRoot() {
  for (const selector of MOBILE_SWIPE_BACK_ROOTS) {
    const node = document.querySelector(selector)
    if (!node || !(node instanceof HTMLElement)) continue
    if (node.classList.contains('oop-root') && !node.querySelector('.oop-panel')) continue
    return node
  }
  return null
}

function closeOverlay(root) {
  const closeBtn =
    root.querySelector('.oop-close, .cc-v2-close, .now-close, .spc-v2-close, .mos-bottom-sheet-backdrop, [aria-label="Kapat"]') ||
    root.querySelector('button[type="button"]')
  if (closeBtn instanceof HTMLElement) {
    closeBtn.click()
    return
  }
  const backdrop = root.querySelector('.oop-backdrop, .cc-v2-backdrop, .now-backdrop, .spc-v2-backdrop')
  if (backdrop instanceof HTMLElement) backdrop.click()
}

/**
 * FAZ 113 — mobil detay ekranlarında sağa kaydırarak geri dön.
 */
export default function MobileSwipeBackEnhancer() {
  const stateRef = useRef({
    startX: 0,
    startY: 0,
    tracking: false,
    fromEdge: false,
  })

  useEffect(() => {
    /** @param {TouchEvent} event */
    function onTouchStart(event) {
      const overlay = findOpenOverlayRoot()
      if (!overlay) return
      const touch = event.touches[0]
      if (!touch) return
      const fromEdge = touch.clientX <= MOBILE_SWIPE_BACK_EDGE_PX
      stateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        tracking: true,
        fromEdge,
      }
    }

    /** @param {TouchEvent} event */
    function onTouchEnd(event) {
      const state = stateRef.current
      if (!state.tracking || !state.fromEdge) {
        stateRef.current.tracking = false
        return
      }
      const touch = event.changedTouches[0]
      if (!touch) {
        stateRef.current.tracking = false
        return
      }
      const dx = touch.clientX - state.startX
      const dy = Math.abs(touch.clientY - state.startY)
      stateRef.current.tracking = false
      if (dx >= MOBILE_SWIPE_BACK_THRESHOLD_PX && dy < 80) {
        const overlay = findOpenOverlayRoot()
        if (overlay) closeOverlay(overlay)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return null
}
