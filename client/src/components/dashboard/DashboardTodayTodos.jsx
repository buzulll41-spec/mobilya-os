import { useMemo } from 'react'
import { IconChevronRight } from '../Icons.jsx'

/** @typedef {import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardActionRow} DashboardActionRow */

/**
 * @param {{
 *   lists: {
 *     pendingShipments: DashboardActionRow[]
 *     installationPending: DashboardActionRow[]
 *     criticalCustomers: DashboardActionRow[]
 *     openService: DashboardActionRow[]
 *   }
 *   onOpenRow: (row: DashboardActionRow) => void
 *   onViewAll?: () => void
 * }} props
 */
export default function DashboardTodayTodos({ lists, onOpenRow, onViewAll }) {
  const rows = useMemo(
    () => [
      {
        id: 'collect',
        icon: '₺',
        label: 'Tahsilat aranacak',
        count: lists.criticalCustomers.length,
        row: lists.criticalCustomers[0],
      },
      {
        id: 'ship',
        icon: '↗',
        label: 'Sevk planı yapılacak',
        count: lists.pendingShipments.length,
        row: lists.pendingShipments[0],
      },
      {
        id: 'missing',
        icon: '📦',
        label: 'Eksik ürün kontrolü',
        count: lists.installationPending.length,
        row: lists.installationPending[0],
      },
      {
        id: 'service',
        icon: '◎',
        label: 'SSH takip edilecek',
        count: lists.openService.length,
        row: lists.openService[0],
      },
    ],
    [lists],
  )

  return (
    <section className="dct-panel-card dct-panel-card--tasks" aria-labelledby="dct-todos-title">
      <header className="dct-panel-card__head">
        <h2 id="dct-todos-title" className="dct-panel-card__title">
          Bugün yapılacaklar
        </h2>
      </header>
      <ul className="dct-panel-rows dct-task-rows">
        {rows.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="dct-panel-row dct-task-row"
              onClick={() => {
                if (item.row) onOpenRow(item.row)
                else onViewAll?.()
              }}
              disabled={!item.row && !onViewAll}
            >
              <span className="dct-task-row__check" aria-hidden />
              <span className={`dct-task-row__icon dct-task-row__icon--${item.id}`} aria-hidden>
                {item.icon}
              </span>
              <span className="dct-task-row__label">{item.label}</span>
              <span className={`dct-task-row__count${item.count === 0 ? ' dct-task-row__count--zero' : ''}`}>
                {item.count}
              </span>
              <span className="dct-panel-row__chevron" aria-hidden>
                <IconChevronRight />
              </span>
            </button>
          </li>
        ))}
      </ul>
      {onViewAll ? (
        <button type="button" className="dct-panel-card__footer" onClick={onViewAll}>
          Tümünü görüntüle →
        </button>
      ) : null}
    </section>
  )
}
