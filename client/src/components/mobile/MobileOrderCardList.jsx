import MobileOrderCard from './MobileOrderCard.jsx'
import MobileStoreEmptyState from './MobileStoreEmptyState.jsx'

/**
 * @param {{
 *   cards: import('../../mappers/mobile/mobileStoreOpsModel.js').MobileOrderCardVm[]
 *   selectedRowId?: string | null
 *   onOpenCard?: (id: string) => void
 *   onNewOrder?: () => void
 *   onClearFilters?: () => void
 * }} props
 */
export default function MobileOrderCardList({
  cards,
  selectedRowId = null,
  onOpenCard,
  onNewOrder,
  onClearFilters,
}) {
  if (!cards.length) {
    return (
      <MobileStoreEmptyState
        context="orders"
        onPrimary={onNewOrder}
        onSecondary={onClearFilters}
      />
    )
  }

  return (
    <div className="mos-mobile-order-card-list" role="list" aria-label="Sipariş kartları">
      {cards.map((card) => (
        <MobileOrderCard
          key={card.id}
          card={card}
          selected={card.id === selectedRowId}
          onOpen={() => onOpenCard?.(card.id)}
        />
      ))}
    </div>
  )
}
