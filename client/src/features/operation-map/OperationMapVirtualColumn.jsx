import { useCallback, useEffect, useRef, useState } from 'react'
import OperationMapKanbanCard from './OperationMapKanbanCard.jsx'

/** @typedef {import('../../mappers/operation-map/operationMapKanbanModel.js').KanbanCard} KanbanCard */

const CARD_ESTIMATE_HEIGHT = 168
const OVERSCAN = 4

/**
 * @param {{
 *   cards: KanbanCard[]
 *   onOpenOrder: (orderId: string) => void
 * }} props
 */
export default function OperationMapVirtualColumn({ cards, onOpenOrder }) {
  const bodyRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [range, setRange] = useState({ start: 0, end: 24 })

  const updateRange = useCallback(() => {
    const el = bodyRef.current
    if (!el || cards.length === 0) {
      setRange({ start: 0, end: 24 })
      return
    }
    const start = Math.max(0, Math.floor(el.scrollTop / CARD_ESTIMATE_HEIGHT) - OVERSCAN)
    const visible = Math.ceil(el.clientHeight / CARD_ESTIMATE_HEIGHT) + OVERSCAN * 2
    const end = Math.min(cards.length, start + visible)
    setRange({ start, end })
  }, [cards.length])

  useEffect(() => {
    updateRange()
  }, [cards, updateRange])

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return undefined
    el.addEventListener('scroll', updateRange, { passive: true })
    const ro = new ResizeObserver(updateRange)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateRange)
      ro.disconnect()
    }
  }, [updateRange])

  if (cards.length === 0) {
    return (
      <div className="opmap-column__body opmap-column__body--virtual" data-droppable="true">
        <p className="opmap-column__empty">Kayıt yok</p>
      </div>
    )
  }

  const topPad = range.start * CARD_ESTIMATE_HEIGHT
  const bottomPad = Math.max(0, (cards.length - range.end) * CARD_ESTIMATE_HEIGHT)
  const visible = cards.slice(range.start, range.end)

  return (
    <div
      ref={bodyRef}
      className="opmap-column__body opmap-column__body--virtual"
      data-droppable="true"
    >
      <div className="opmap-column__spacer" style={{ height: topPad }} aria-hidden />
      <div className="opmap-column__cards">
        {visible.map((card) => (
          <OperationMapKanbanCard key={card.orderId} card={card} onOpen={onOpenOrder} />
        ))}
      </div>
      <div className="opmap-column__spacer" style={{ height: bottomPad }} aria-hidden />
    </div>
  )
}
