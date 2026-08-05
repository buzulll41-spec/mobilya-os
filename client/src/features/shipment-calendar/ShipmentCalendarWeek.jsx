import ShipmentCalendarCard from './ShipmentCalendarCard.jsx'

/**
 * @param {{
 *   columns: import('../../mappers/shipment-calendar/shipmentCalendarModel.js').CalendarDayColumn[]
 *   onSelectOrder?: (orderId: string) => void
 *   onSelectEntry?: (entry: import('../../mappers/shipment-calendar/shipmentCalendarModel.js').ShipmentCalendarEntry) => void
 * }} props
 */
export default function ShipmentCalendarWeek({ columns, onSelectOrder, onSelectEntry }) {
  return (
    <div className="scl-week" role="grid" aria-label="Haftalık sevk takvimi">
      {columns.map((col) => (
        <section
          key={col.iso}
          className={`scl-day${col.isToday ? ' scl-day--today' : ''}`}
          role="gridcell"
          aria-label={`${col.weekdayLabel} ${col.dayNum}`}
        >
          <header className="scl-day__head">
            <span className="scl-day__weekday">{col.weekdayLabel}</span>
            <span className="scl-day__num">{col.dayNum}</span>
            <span className="scl-day__count">{col.entries.length}</span>
          </header>
          <div className="scl-day__cards">
            {col.entries.length === 0 ? (
              <p className="scl-day__empty">Sevk yok</p>
            ) : (
              col.entries.map((entry) => (
                <ShipmentCalendarCard
                  key={entry.id}
                  entry={entry}
                  onSelect={onSelectEntry ? () => onSelectEntry(entry) : undefined}
                  onSelectOrder={onSelectOrder}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
