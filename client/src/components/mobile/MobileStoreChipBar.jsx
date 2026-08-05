/**
 * @param {{
 *   items: { id: string; label: string }[]
 *   activeId?: string
 *   onSelect: (id: string) => void
 *   ariaLabel?: string
 *   className?: string
 * }} props
 */
export default function MobileStoreChipBar({
  items,
  activeId,
  onSelect,
  ariaLabel = 'Filtreler',
  className = '',
}) {
  return (
    <div
      className={`mos-mobile-store-chips ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={activeId === item.id}
          className={`mos-mobile-store-chips__chip ${activeId === item.id ? 'is-active' : ''}`.trim()}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
