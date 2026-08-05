import { addDays } from '../../data/constants.js'
import { formatShortDate } from '../../utils/dates.js'
import { IconChevronLeft, IconChevronRight } from '../../components/Icons.jsx'

/**
 * @param {{
 *   todayIso: string
 *   selectedDate: string
 *   weekDays: string[]
 *   onSelectDate: (iso: string) => void
 * }} props
 */
export default function ShipmentOpsDateSidebar({ todayIso, selectedDate, weekDays, onSelectDate }) {
  const tomorrow = addDays(todayIso, 1)

  return (
    <aside className="sops-v3-sidebar" aria-label="Tarih seçici">
      <div className="sops-v3-sidebar__quick">
        <button
          type="button"
          className={`sops-v3-sidebar__chip${selectedDate === todayIso ? ' sops-v3-sidebar__chip--active' : ''}`}
          onClick={() => onSelectDate(todayIso)}
        >
          Bugün
        </button>
        <button
          type="button"
          className={`sops-v3-sidebar__chip${selectedDate === tomorrow ? ' sops-v3-sidebar__chip--active' : ''}`}
          onClick={() => onSelectDate(tomorrow)}
        >
          Yarın
        </button>
      </div>

      <div className="sops-v3-sidebar__nav">
        <button
          type="button"
          className="sops-v3-sidebar__nav-btn"
          aria-label="Önceki gün"
          onClick={() => onSelectDate(addDays(selectedDate, -1))}
        >
          <IconChevronLeft />
        </button>
        <span className="sops-v3-sidebar__nav-label">{formatShortDate(selectedDate)}</span>
        <button
          type="button"
          className="sops-v3-sidebar__nav-btn"
          aria-label="Sonraki gün"
          onClick={() => onSelectDate(addDays(selectedDate, 1))}
        >
          <IconChevronRight />
        </button>
      </div>

      <p className="sops-v3-sidebar__section">Bu hafta</p>
      <div className="sops-v3-sidebar__week">
        {weekDays.map((iso) => {
          const d = new Date(`${iso}T12:00:00`)
          const isToday = iso === todayIso
          const active = iso === selectedDate
          return (
            <button
              key={iso}
              type="button"
              className={`sops-v3-sidebar__day${active ? ' sops-v3-sidebar__day--active' : ''}${isToday ? ' sops-v3-sidebar__day--today' : ''}`}
              onClick={() => onSelectDate(iso)}
            >
              <span className="sops-v3-sidebar__day-num">{d.getDate()}</span>
              <span className="sops-v3-sidebar__day-wd">
                {d.toLocaleDateString('tr-TR', { weekday: 'short' })}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
