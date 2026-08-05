/**
 * @param {{
 *   tasks: import('../../mappers/shipment-calendar/shipmentCalendarModel.js').CalendarTodayTask[]
 *   hints: string[]
 *   regionInsights: import('../../mappers/shipment-calendar/shipmentCalendarGrouping.js').RegionDayInsight[]
 * }} props
 */
export default function ShipmentCalendarTodayPanel({ tasks, hints, regionInsights }) {
  return (
    <aside className="scl-today" aria-labelledby="scl-today-title">
      <h2 id="scl-today-title" className="scl-today__title">
        Bugün yapılacaklar
      </h2>

      {hints.length > 0 ? (
        <div className="scl-today__hints" role="status">
          <p className="scl-today__hints-kicker">Akıllı özet</p>
          <ul className="scl-hint-list">
            {hints.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {regionInsights.length > 0 ? (
        <div className="scl-today__regions">
          <p className="scl-today__hints-kicker">Bölge grupları</p>
          <ul className="scl-region-list">
            {regionInsights.map((r) => (
              <li key={`${r.region}-${r.dateIso}`}>
                <strong>{r.region}</strong> — {r.count} sevk
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="scl-task-list">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`scl-task${task.done ? ' scl-task--done' : ''}${task.critical ? ' scl-task--critical' : ''}`}
          >
            <span className="scl-task__box" aria-hidden>
              {task.done ? '✓' : ''}
            </span>
            <span>{task.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}
