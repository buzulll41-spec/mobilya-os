import { useEffect, useMemo, useState } from 'react'

import ErpOpsSummaryStrip from '../../../components/erp-ops/ErpOpsSummaryStrip.jsx'
import OperationTimeline from '../OperationTimeline.jsx'
import * as ordersClient from '../../../services/ordersClient.js'
import { useOrderLineReceiving } from '../../../hooks/useOrderLineReceiving.js'
import { isMissingItemResolvedStatus } from '../../../contracts/v1/missingItemStatuses.js'
import {
  buildOrderPanelProductRows,
} from '../../../mappers/order/orderPanelProductsModel.js'
import {
  buildOrderPanelShipmentKpis,
  buildOrderPanelShipmentOpsSummary,
  buildOrderPanelShipmentPlanRows,
  buildOrderPanelShipmentRiskAlerts,
  buildOrderPanelShipmentTimeline,
} from '../../../mappers/order/orderPanelShipmentModel.js'
import { useViewportTier } from '../../../hooks/useViewportTier.js'

import '../../../styles/mos-erp-ops.css'
import '../../../styles/order-panel-shipment.css'

/** @typedef {import('../../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */
/** @typedef {import('../../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */

/**
 * @param {{
 *   order: Order
 *   listItemDto?: SalesOrderListItemDto
 *   shipmentPlan?: ShipmentPlan
 *   rem: number
 *   planBlocked?: boolean
 *   planBlockedMessage?: string
 *   onPlanClick?: () => void
 *   onOpenShipmentOperation?: () => void
 *   onCompletePhoneDelivery?: () => Promise<void>
 * }} props
 */
export default function OrderPanelShipmentOps({
  order,
  listItemDto,
  shipmentPlan,
  rem,
  planBlocked = false,
  planBlockedMessage,
  onPlanClick,
  onOpenShipmentOperation,
  onCompletePhoneDelivery,
}) {
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'
  const { lines: receivingLines } = useOrderLineReceiving(order.id, 0)
  const [orderLines, setOrderLines] = useState(/** @type {import('../../../services/ordersClient.js').OrderLineDetailDto[] | null} */ (null))
  const [openMissingLineIds, setOpenMissingLineIds] = useState(/** @type {Set<string>} */ (new Set()))
  const [shipments, setShipments] = useState(/** @type {ShipmentDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null))
  const [phoneStep, setPhoneStep] = useState(0)
  const [phoneBusy, setPhoneBusy] = useState(false)
  const [phoneError, setPhoneError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    setPhoneStep(0)
    setPhoneBusy(false)
    setPhoneError(null)
  }, [order.id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([
      ordersClient.getOrderLines(order.id),
      ordersClient.getOrderMissingItems(order.id),
      ordersClient.getOrderShipments(order.id),
    ])
      .then(([lines, missingItems, shipmentRows]) => {
        if (cancelled) return
        setOrderLines(lines)
        const ids = new Set(
          missingItems
            .filter((m) => m.orderLineId && !isMissingItemResolvedStatus(m.status))
            .map((m) => m.orderLineId),
        )
        setOpenMissingLineIds(ids)
        setShipments(shipmentRows)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Veri yüklenemedi')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [order.id])

  const productRows = useMemo(() => {
    if (!orderLines) return []
    return buildOrderPanelProductRows(orderLines, receivingLines, openMissingLineIds)
  }, [orderLines, receivingLines, openMissingLineIds])

  const opsSummary = useMemo(
    () => buildOrderPanelShipmentOpsSummary(order, listItemDto, shipmentPlan),
    [order, listItemDto, shipmentPlan],
  )

  const kpiMetrics = useMemo(
    () => buildOrderPanelShipmentKpis(productRows, listItemDto),
    [productRows, listItemDto],
  )

  const timelineSteps = useMemo(
    () => buildOrderPanelShipmentTimeline(order, shipmentPlan),
    [order, shipmentPlan],
  )

  const planRows = useMemo(
    () => buildOrderPanelShipmentPlanRows(shipmentPlan, shipments, listItemDto),
    [shipmentPlan, shipments, listItemDto],
  )

  const riskAlerts = useMemo(
    () => buildOrderPanelShipmentRiskAlerts(order, listItemDto, productRows),
    [order, listItemDto, productRows],
  )

  const notReadyForShipment = useMemo(() => {
    if (!productRows.length) return false
    return productRows.some((r) => !r.shipmentReady)
  }, [productRows])

  const productsBlockPlan = !loading && productRows.length > 0 && notReadyForShipment
  const effectivePlanBlocked = planBlocked || productsBlockPlan
  const planBlockReason = planBlocked
    ? planBlockedMessage
    : productsBlockPlan
      ? 'Sevk planı için tüm ürünlerin tedarik verilmiş, depoya gelmiş ve sevke hazır olması gerekir.'
      : undefined

  async function handlePhoneComplete() {
    if (!onCompletePhoneDelivery) return
    setPhoneBusy(true)
    setPhoneError(null)
    try {
      await onCompletePhoneDelivery()
      setPhoneStep(2)
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Teslim tamamlanamadi')
    } finally {
      setPhoneBusy(false)
    }
  }

  if (isPhone) {
    const canProceed = !loading && !effectivePlanBlocked
    const canComplete = !phoneBusy && Boolean(onCompletePhoneDelivery)
    const completed0 = phoneStep > 0
    const completed1 = phoneStep > 1

    return (
      <div className="oop-shipment" aria-label="Sevk ve montaj operasyonu">
        <div className="oop-shipment__panel" aria-label="Telefon teslim wizardi">
          <section>
            <details open={phoneStep === 0}>
              <summary>{completed0 ? '✓' : '1.'} Teslime hazirlik kontrolu</summary>
              {phoneStep === 0 ? (
                <div>
                  {planBlockReason ? <p>{planBlockReason}</p> : null}
                  <p>Urun hazir: {notReadyForShipment ? 'Hayir' : 'Evet'}</p>
                  <p>Kalan bakiye: {rem > 0.009 ? 'Var' : 'Yok'}</p>
                </div>
              ) : null}
            </details>
          </section>

          <section>
            <details open={phoneStep === 1}>
              <summary>{completed1 ? '✓' : '2.'} Teslimi tamamla</summary>
              {phoneStep === 1 ? (
                <div>
                  <p>Bu adim siparisi teslim edildi olarak kapatir.</p>
                  {phoneError ? (
                    <p className="oop-shipment__load-error" role="alert">
                      {phoneError}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </details>
          </section>

          <section>
            <details open={phoneStep === 2}>
              <summary>3. Tamamlandi</summary>
              {phoneStep === 2 ? <p>Teslim tamamlandi. Operasyon haritasina donuluyor…</p> : null}
            </details>
          </section>
        </div>

        <div
          style={{
            position: 'sticky',
            bottom: 0,
            zIndex: 3,
            background: 'var(--mos-surface, #fff)',
            borderTop: '1px solid var(--mos-border, #e5e7eb)',
            padding: '0.75rem',
            marginTop: '0.75rem',
          }}
        >
          {phoneStep === 0 ? (
            <button
              type="button"
              className="oop-shipment__btn oop-shipment__btn--primary"
              disabled={!canProceed}
              onClick={() => setPhoneStep(1)}
            >
              Devam
            </button>
          ) : null}
          {phoneStep === 1 ? (
            <button
              type="button"
              className="oop-shipment__btn oop-shipment__btn--primary"
              disabled={!canComplete}
              onClick={() => {
                void handlePhoneComplete()
              }}
            >
              {phoneBusy ? 'Tamamlaniyor…' : 'Teslimi tamamla'}
            </button>
          ) : null}
          {phoneStep === 2 ? (
            <button type="button" className="oop-shipment__btn oop-shipment__btn--primary" disabled>
              Tamamlandi
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="oop-shipment" aria-label="Sevk ve montaj operasyonu">
      {riskAlerts.length > 0 ? (
        <div className="oop-shipment__alerts" role="alert">
          {riskAlerts.map((alert) => (
            <p
              key={alert.message}
              className={`oop-shipment__alert oop-shipment__alert--${alert.tone}`}
            >
              {alert.message}
            </p>
          ))}
        </div>
      ) : null}

      <div className="oop-shipment__head">
        <ErpOpsSummaryStrip
          metrics={opsSummary}
          ariaLabel="Operasyon özeti"
          summaryClassName="mos-erp-summary--cols-5 oop-shipment__ops-summary"
        />
        <div className="oop-shipment__actions">
          {onPlanClick ? (
            <div className="oop-shipment__plan-action">
              <button
                type="button"
                className="oop-shipment__btn oop-shipment__btn--primary"
                disabled={effectivePlanBlocked}
                title={planBlockReason}
                onClick={onPlanClick}
              >
                Sevk Planla
              </button>
              {effectivePlanBlocked && planBlockReason ? (
                <p className="oop-shipment__plan-hint" role="status">
                  {planBlockReason}
                </p>
              ) : null}
            </div>
          ) : null}
          {onOpenShipmentOperation ? (
            <button
              type="button"
              className="oop-shipment__btn oop-shipment__btn--info"
              onClick={onOpenShipmentOperation}
            >
              Sevk operasyonu
            </button>
          ) : null}
        </div>
      </div>

      <ErpOpsSummaryStrip
        metrics={kpiMetrics}
        ariaLabel="Operasyon KPI"
        summaryClassName="mos-erp-summary--cols-5 oop-shipment__kpi-strip"
      />

      {loadError ? <p className="oop-shipment__load-error">{loadError}</p> : null}

      <div className="oop-shipment__grid">
        <section className="oop-shipment__panel" aria-labelledby="oop-shipment-timeline-title">
          <h4 className="oop-shipment__panel-title" id="oop-shipment-timeline-title">
            Operasyon Zaman Çizgisi
          </h4>
          <OperationTimeline steps={timelineSteps} />
        </section>

        <section className="oop-shipment__panel" aria-labelledby="oop-shipment-plan-title">
          <h4 className="oop-shipment__panel-title" id="oop-shipment-plan-title">
            Sevk Planı
          </h4>
          <div className="oop-shipment__table-panel">
            <div className="mos-erp-tbl-wrap oop-shipment__tbl-wrap">
              <table className="mos-erp-tbl oop-shipment__tbl">
                <thead>
                  <tr>
                    <th>Planlanan sevk tarihi</th>
                    <th>Araç</th>
                    <th>Montaj ekibi</th>
                    <th>Durum</th>
                    <th>Not</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6}>Yükleniyor…</td>
                    </tr>
                  ) : planRows.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Henüz sevk planı yok.</td>
                    </tr>
                  ) : (
                    planRows.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`mos-erp-tbl-row oop-shipment-row${idx % 2 === 1 ? ' oop-shipment-row--alt' : ''}`}
                      >
                        <td>{row.plannedDateLabel}</td>
                        <td>{row.vehicleLabel}</td>
                        <td>{row.crewLabel}</td>
                        <td>
                          <span className={`oop-shipment__badge oop-shipment__badge--${row.statusBadge}`}>
                            {row.statusLabel}
                          </span>
                        </td>
                        <td>{row.noteLabel}</td>
                        <td>
                          {row.source === 'record' && onOpenShipmentOperation ? (
                            <button
                              type="button"
                              className="oop-shipment__row-btn oop-shipment__row-btn--info"
                              onClick={onOpenShipmentOperation}
                            >
                              Yönet
                            </button>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {rem > 0.009 ? (
        <p className="oop-shipment__balance-hint">
          Kalan bakiye: operasyon öncesi tahsilat durumunu kontrol edin.
        </p>
      ) : null}
    </div>
  )
}
