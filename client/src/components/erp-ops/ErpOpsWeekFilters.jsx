import { addDays } from '../../data/constants.js'
import { formatShortDate } from '../../utils/dates.js'

/**
 * @param {{
 *   todayIso: string
 *   selectedDate: string
 *   weekDays: string[]
 *   onSelectDate: (iso: string) => void
 * }} props
 */
export default function ErpOpsWeekFilters({ todayIso, selectedDate, weekDays, onSelectDate }) {
  const tomorrow = addDays(todayIso, 1)

  return (
    <section className="mos-erp-filters__group">
      <h2 className="mos-erp-filters__title">Gün</h2>
      <ul className="mos-erp-filters__list">
        <li>
          <button
            type="button"
            className={`mos-erp-filters__btn${selectedDate === todayIso ? ' is-active' : ''}`}
            onClick={() => onSelectDate(todayIso)}
          >
            <span>Bugün</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`mos-erp-filters__btn${selectedDate === tomorrow ? ' is-active' : ''}`}
            onClick={() => onSelectDate(tomorrow)}
          >
            <span>Yarın</span>
          </button>
        </li>
        {weekDays
          .filter((iso) => iso !== todayIso && iso !== tomorrow)
          .map((iso) => {
            const d = new Date(`${iso}T12:00:00`)
            const label = `${d.toLocaleDateString('tr-TR', { weekday: 'short' })} ${d.getDate()}`
            return (
              <li key={iso}>
                <button
                  type="button"
                  className={`mos-erp-filters__btn${selectedDate === iso ? ' is-active' : ''}`}
                  onClick={() => onSelectDate(iso)}
                >
                  <span>{label}</span>
                </button>
              </li>
            )
          })}
      </ul>
      <p className="mos-erp-filters__hint">{formatShortDate(selectedDate)}</p>
    </section>
  )
}
