import { useMemo, useState } from 'react'

import { DEMO_TODAY } from '../../../data/constants.js'
import {
  HISTORY_PANEL_FILTERS,
  buildOrderPanelHistoryRows,
  buildOrderPanelHistorySummary,
  buildOrderPanelHistoryTimeline,
  filterOrderPanelHistoryRows,
} from '../../../mappers/order/orderPanelHistoryModel.js'

import '../../../styles/mos-erp-ops.css'
import '../../../styles/order-panel-history.css'

/** @typedef {import('../../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @param {{
 *   order: Order
 *   domainEvents?: DomainEventDto[]
 * }} props
 */
export default function OrderPanelHistoryOps({ order, domainEvents = [] }) {
  const [categoryFilter, setCategoryFilter] = useState('all')

  const rows = useMemo(
    () => buildOrderPanelHistoryRows(order, domainEvents),
    [order, domainEvents],
  )

  const summaryMetrics = useMemo(() => buildOrderPanelHistorySummary(rows), [rows])

  const visibleRows = useMemo(
    () => filterOrderPanelHistoryRows(rows, categoryFilter),
    [rows, categoryFilter],
  )

  const timelineGroups = useMemo(
    () => buildOrderPanelHistoryTimeline(visibleRows),
    [visibleRows],
  )

  const openOpsCount = rows.filter((r) => r.displayCategory !== 'info').length

  return (
    <div className="oop-history" aria-label="İşlem geçmişi">
      <div className="oop-history__kpi-cards" aria-label="Geçmiş özet göstergeleri">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`oop-history__kpi-card oop-history__kpi-card--${metric.cardTone}`}
            data-kpi-id={metric.id}
          >
            <span className="oop-history__kpi-card-label">{metric.label}</span>
            <strong className="oop-history__kpi-card-value">{metric.value}</strong>
          </div>
        ))}
      </div>

      {rows.length > 0 ? (
        <p className="oop-history__meta" role="status">
          {rows.length} hareket kaydı · {openOpsCount} operasyon · referans günü {DEMO_TODAY}
        </p>
      ) : (
        <p className="oop-history__meta">Bu sipariş için henüz hareket kaydı yok.</p>
      )}

      <div className="oop-history__filters" role="toolbar" aria-label="Geçmiş kategori filtreleri">
        {HISTORY_PANEL_FILTERS.map((filter) => {
          const count =
            filter.categories == null
              ? rows.length
              : rows.filter((r) => filter.categories.includes(r.displayCategory)).length
          return (
            <button
              key={filter.id}
              type="button"
              className={`oop-history__filter${categoryFilter === filter.id ? ' oop-history__filter--active' : ''}`}
              onClick={() => setCategoryFilter(filter.id)}
            >
              {filter.label} ({count})
            </button>
          )
        })}
      </div>

      <section className="oop-history__timeline-panel" aria-label="Olay zaman çizelgesi">
        <h4 className="oop-history__section-title">Olay zaman çizelgesi</h4>
        {timelineGroups.length === 0 ? (
          <p className="oop-history__empty">Bu filtrede zaman çizelgesi kaydı yok.</p>
        ) : (
          <ol className="oop-history__timeline">
            {timelineGroups.map((group) => (
              <li key={group.dateLabel} className="oop-history__timeline-day">
                <p className="oop-history__timeline-dayhead">{group.dateLabel}</p>
                <ul className="oop-history__timeline-events">
                  {group.items.map((item) => (
                    <li key={item.id} className="oop-history__timeline-event">
                      {item.label}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="oop-history__table-panel" aria-label="İşlem geçmişi listesi">
        <h4 className="oop-history__section-title">İşlem geçmişi</h4>
        <div className="mos-erp-tbl-wrap oop-history__tbl-wrap">
          <table className="mos-erp-tbl oop-history__tbl">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="is-num">Saat</th>
                <th>Modül</th>
                <th>İşlem Tipi</th>
                <th>Kayıt ID</th>
                <th>Kullanıcı</th>
                <th>Eski Değer</th>
                <th>Yeni Değer</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.length === 0 ? (
                <tr className="mos-erp-tbl-empty">
                  <td colSpan={9}>Bu filtrede işlem kaydı yok.</td>
                </tr>
              ) : (
                visibleRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`mos-erp-tbl-row oop-history-row${idx % 2 === 1 ? ' oop-history-row--alt' : ''}`}
                  >
                    <td>{row.dateLabel}</td>
                    <td className="is-num">{row.timeLabel}</td>
                    <td>{row.moduleLabel}</td>
                    <td className="oop-history__action">{row.title}</td>
                    <td className="oop-history__record-id">{row.recordId}</td>
                    <td>{row.actor ?? '—'}</td>
                    <td className="oop-history__old">{row.oldValue ?? '—'}</td>
                    <td className="oop-history__new">{row.newValue ?? '—'}</td>
                    <td className="oop-history__desc">{row.description}</td>
                  </tr>
                ))
              )}
            </tbody>
            {visibleRows.length > 0 ? (
              <tfoot>
                <tr className="oop-history__footer">
                  <td colSpan={2}>
                    Toplam ({visibleRows.length} işlem)
                  </td>
                  <td colSpan={7} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  )
}
