import { useEffect, useRef } from 'react'



const SWIPE_THRESHOLD = 56

const CARD_SELECTOR =

  '.mos-mobile-pwa.mos-viewport-phone .mos-erp-tbl tbody tr, .mos-mobile-pwa.mos-viewport-phone .coll-ops-tbl tbody tr, .mos-mobile-pwa.mos-viewport-phone .mos-mobile-swipe-card'



/**

 * Telefon kartlarında sağa/sola kaydırma aksiyonları.

 * Mevcut satır tıklama / detay butonlarını yeniden kullanır.

 */

export default function MobileSwipeEnhancer() {

  const stateRef = useRef({

    startX: 0,

    startY: 0,

    row: /** @type {HTMLElement | null} */ (null),

    swiping: false,

  })



  useEffect(() => {

    function findActionButton(row, kind) {

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

      return row.querySelector('[data-swipe-delete]') || row.querySelector('.mos-erp-tbl-op--danger')

    }



    /** @param {TouchEvent} event */

    function onTouchStart(event) {

      const target = /** @type {HTMLElement | null} */ (event.target instanceof Element ? event.target.closest(CARD_SELECTOR) : null)

      if (!target) return

      stateRef.current = {

        startX: event.touches[0]?.clientX ?? 0,

        startY: event.touches[0]?.clientY ?? 0,

        row: target,

        swiping: true,

      }

      target.classList.remove('mos-mobile-swipe--left', 'mos-mobile-swipe--right')

    }



    /** @param {TouchEvent} event */

    function onTouchMove(event) {

      const state = stateRef.current

      if (!state.swiping || !state.row) return

      const dx = (event.touches[0]?.clientX ?? 0) - state.startX

      const dy = (event.touches[0]?.clientY ?? 0) - state.startY

      if (Math.abs(dy) > Math.abs(dx)) {

        state.swiping = false

        state.row.classList.remove('mos-mobile-swipe--left', 'mos-mobile-swipe--right')

        return

      }

      if (dx > 12) {

        state.row.classList.add('mos-mobile-swipe--right')

        state.row.classList.remove('mos-mobile-swipe--left')

      } else if (dx < -12) {

        state.row.classList.add('mos-mobile-swipe--left')

        state.row.classList.remove('mos-mobile-swipe--right')

      }

    }



    /** @param {TouchEvent} event */

    function onTouchEnd(event) {

      const state = stateRef.current

      if (!state.swiping || !state.row) return

      const dx = (event.changedTouches[0]?.clientX ?? 0) - state.startX

      const row = state.row

      state.swiping = false

      state.row = null



      if (dx >= SWIPE_THRESHOLD) {

        const btn = findActionButton(row, 'edit')

        if (btn instanceof HTMLElement) btn.click()

        else row.click()

      } else if (dx <= -SWIPE_THRESHOLD) {

        const detailBtn = findActionButton(row, 'detail')

        if (detailBtn instanceof HTMLElement) detailBtn.click()

        else row.click()

      }



      row.classList.remove('mos-mobile-swipe--left', 'mos-mobile-swipe--right')

    }



    document.addEventListener('touchstart', onTouchStart, { passive: true })

    document.addEventListener('touchmove', onTouchMove, { passive: true })

    document.addEventListener('touchend', onTouchEnd, { passive: true })

    document.addEventListener('touchcancel', onTouchEnd, { passive: true })



    return () => {

      document.removeEventListener('touchstart', onTouchStart)

      document.removeEventListener('touchmove', onTouchMove)

      document.removeEventListener('touchend', onTouchEnd)

      document.removeEventListener('touchcancel', onTouchEnd)

    }

  }, [])



  return null

}


