import { useMemo, useState } from 'react'
import { explainCompositeListItemRiskForDebug } from '../mappers/risk/applyCompositeListItemRisk.js'
import {
  DERIVED_FIELD_SOURCE_BLURBS,
  LIST_ITEM_PROJECTION_PIPELINE,
  explainTaskGenerationReason,
  sortDomainEventsForReplay,
} from './operationalDebugModel.js'
import { checkOperationProjectionHealth } from '../mappers/operations/checkOperationProjectionHealth.js'
import { projectOperationalTasksFromReadModels } from '../mappers/tasks/projectOperationalTasks.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */

/**
 * @param {{
 *   listItemDto: SalesOrderListItemDto | undefined
 *   order: Order
 *   orderDomainEvents: DomainEventDto[]
 *   orderOperationalTasks: TaskDto[]
 *   domainEventsTotalCount: number
 *   todayIso: string
 * }} props
 */
export default function OperationalDebugPanel({
  listItemDto,
  order,
  orderDomainEvents,
  orderOperationalTasks,
  domainEventsTotalCount,
  todayIso,
}) {
  const [rawOpen, setRawOpen] = useState(false)
  const replaySorted = useMemo(() => sortDomainEventsForReplay(orderDomainEvents), [orderDomainEvents])

  const projectionHealth = useMemo(() => {
    if (!listItemDto) return null
    return checkOperationProjectionHealth({
      dtos: [listItemDto],
      events: orderDomainEvents,
      tasks: orderOperationalTasks,
      todayIso,
      projectTasks: projectOperationalTasksFromReadModels,
    })
  }, [listItemDto, orderDomainEvents, orderOperationalTasks, todayIso])
  const riskExplain = useMemo(() => {
    if (!listItemDto) return null
    return explainCompositeListItemRiskForDebug(listItemDto, order, todayIso)
  }, [listItemDto, order, todayIso])

  const shipmentSummary = useMemo(() => {
    if (!listItemDto) return null
    return {
      qtyOrderedTotal: listItemDto.qtyOrderedTotal,
      qtyShippedTotal: listItemDto.qtyShippedTotal,
      remainingQty: listItemDto.remainingQty,
      partiallyShipped: listItemDto.partiallyShipped,
      shipmentSummaryOpenCount: listItemDto.shipmentSummaryOpenCount,
      shipmentSummaryNextPlannedDate: listItemDto.shipmentSummaryNextPlannedDate,
    }
  }, [listItemDto])

  const paymentSummary = useMemo(() => {
    if (!listItemDto) return null
    return {
      amountPaid: listItemDto.amountPaid,
      amountDue: listItemDto.amountDue,
      paymentProgress: listItemDto.paymentProgress,
      hasOverdueBalance: listItemDto.hasOverdueBalance,
      lastPaymentAt: listItemDto.lastPaymentAt,
    }
  }, [listItemDto])

  const riskSignals = useMemo(() => {
    if (!listItemDto) return null
    return {
      currentRiskSeverity: listItemDto.currentRiskSeverity,
      riskSignalOverduePartialShipment: listItemDto.riskSignalOverduePartialShipment,
    }
  }, [listItemDto])

  return (
    <details className="mos-debug-drawer">
      <summary className="mos-debug-drawer-summary">Operational Debug</summary>
      <div className="mos-debug-drawer-body">
        {!listItemDto ? (
          <p className="mos-debug-drawer-note">Liste DTO bu sipariş için henüz yok (projection bekleniyor).</p>
        ) : null}

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Projection pipeline</h4>
          <ol className="mos-debug-pipeline">
            {LIST_ITEM_PROJECTION_PIPELINE.map((p) => (
              <li key={p.id} className="mos-debug-pipeline-item">
                <span className="mos-debug-pipeline-step">{p.step}</span>
                <span className="mos-debug-pipeline-label">{p.label}</span>
                <p className="mos-debug-pipeline-src">{p.source}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Derived alan kaynakları</h4>
          <ul className="mos-debug-list">
            {DERIVED_FIELD_SOURCE_BLURBS.map((row) => (
              <li key={row.fields}>
                <code className="mos-debug-code-inline">{row.fields}</code>
                <span className="mos-debug-dash"> — </span>
                {row.blur}
              </li>
            ))}
          </ul>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Neden bu risk seviyesi? (HIGH odaklı)</h4>
          {riskExplain ? (
            <>
              <p className="mos-debug-risk-head">{riskExplain.headline}</p>
              <ul className="mos-debug-list">
                {riskExplain.lines.map((ln) => (
                  <li key={ln}>{ln}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mos-debug-drawer-note">—</p>
          )}
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Lifecycle</h4>
          <dl className="mos-debug-dl">
            <div>
              <dt>Wire</dt>
              <dd>{listItemDto?.lifecycleStatus ?? '—'}</dd>
            </div>
            <div>
              <dt>Legacy display</dt>
              <dd>{order.status}</dd>
            </div>
          </dl>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Sevkiyat derived summary</h4>
          <pre className="mos-debug-pre">{shipmentSummary ? JSON.stringify(shipmentSummary, null, 2) : '—'}</pre>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Ödeme derived summary</h4>
          <pre className="mos-debug-pre">{paymentSummary ? JSON.stringify(paymentSummary, null, 2) : '—'}</pre>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Risk sinyalleri (DTO)</h4>
          <pre className="mos-debug-pre">{riskSignals ? JSON.stringify(riskSignals, null, 2) : '—'}</pre>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Projection health</h4>
          {projectionHealth ? (
            <>
              <p className="mos-debug-drawer-note">
                {projectionHealth.ok ? 'OK' : 'Uyarı var'} · görev: {projectionHealth.stats.taskCount} · yinelenen:{' '}
                {projectionHealth.stats.duplicateTaskKeys} · orphan event: {projectionHealth.stats.orphanEvents}
              </p>
              {projectionHealth.issues.length > 0 ? (
                <ul className="mos-debug-list">
                  {projectionHealth.issues.map((i) => (
                    <li key={i.code}>
                      <code>{i.code}</code> — {i.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="mos-debug-drawer-note">—</p>
          )}
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Üretilen operasyonel görevler</h4>
          {orderOperationalTasks.length === 0 ? (
            <p className="mos-debug-drawer-note">Bu sipariş için görev yok.</p>
          ) : (
            <ul className="mos-debug-tasklist">
              {orderOperationalTasks.map((t) => (
                <li key={t.id} className="mos-debug-taskli">
                  <div className="mos-debug-taskrow">
                    <strong>{t.title}</strong>
                    <span className="mos-debug-badge">{t.source}</span>
                  </div>
                  <p className="mos-debug-taskreason">{explainTaskGenerationReason(t)}</p>
                  <p className="mos-debug-taskmeta">
                    <code>{t.dedupeKey}</code>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Domain events</h4>
          <p className="mos-debug-drawer-note">
            Bu sipariş: <strong>{orderDomainEvents.length}</strong> · Store toplam:{' '}
            <strong>{domainEventsTotalCount}</strong>
          </p>
          <h5 className="mos-debug-drawer-subh">Replay sırası (occurredAt)</h5>
          <ol className="mos-debug-replay">
            {replaySorted.map((e, i) => (
              <li key={e.id} className="mos-debug-replay-item">
                <span className="mos-debug-replay-no">#{i + 1}</span>
                <code className="mos-debug-code-inline">{e.type}</code>
                <span className="mos-debug-replay-time">{e.occurredAt}</span>
                <span className="mos-debug-replay-id">{e.id}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mos-debug-drawer-block">
          <h4 className="mos-debug-drawer-h">Raw SalesOrderListItemDto</h4>
          <button type="button" className="mos-debug-toggle" onClick={() => setRawOpen((v) => !v)}>
            {rawOpen ? 'JSON gizle' : 'JSON göster'}
          </button>
          {rawOpen && listItemDto ? (
            <pre className="mos-debug-pre mos-debug-pre--scroll">{JSON.stringify(listItemDto, null, 2)}</pre>
          ) : null}
        </section>
      </div>
    </details>
  )
}
