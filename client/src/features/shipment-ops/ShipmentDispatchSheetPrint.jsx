import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { buildDispatchSheetModel } from '../../mappers/shipment-ops/buildDispatchSheetModel.js'
import { useOrders } from '../../state/useOrders.js'
import '../../styles/shipment-dispatch-sheet-print.css'

/** @typedef {import('../../mappers/shipment-ops/buildDispatchSheetModel.js').DispatchSheetModel} DispatchSheetModel */
/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {{
 *   open: boolean
 *   vehicle: string
 *   selectedDate: string
 *   agendaItems: ShipmentAgendaItem[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   plansByOrderId: Map<string, ShipmentPlan>
 *   onClose: () => void
 * }} props
 */
export default function ShipmentDispatchSheetPrint({
  open,
  vehicle,
  selectedDate,
  agendaItems,
  orders,
  listItemDtos,
  plansByOrderId,
  onClose,
}) {
  const { recordDispatchSheetPrinted } = useOrders()
  const [model, setModel] = useState(/** @type {DispatchSheetModel | null} */ (null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const printAreaRef = useRef(/** @type {HTMLElement | null} */ (null))
  const auditRecordedRef = useRef(false)

  useEffect(() => {
    if (!open || !vehicle) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect -- kapalıyken önizleme state temizlenir */
      setModel(null)
      setError(null)
      auditRecordedRef.current = false
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const next = await buildDispatchSheetModel({
          vehicle,
          plannedDate: selectedDate,
          agendaItems,
          orders,
          listItemDtos,
          plansByOrderId,
        })
        if (cancelled) return
        setModel(next)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Çıkış fişi yüklenemedi')
        setModel(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, vehicle, selectedDate, agendaItems, orders, listItemDtos, plansByOrderId])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const recordAuditOnce = useCallback(async () => {
    if (!model || auditRecordedRef.current) return
    auditRecordedRef.current = true
    await recordDispatchSheetPrinted({
      vehicleName: model.header.vehicle,
      plannedDate: selectedDate,
      orderIds: model.orderIds,
    })
  }, [model, recordDispatchSheetPrinted, selectedDate])

  const handlePrint = useCallback(() => {
    void recordAuditOnce()
    window.print()
  }, [recordAuditOnce])

  const handleSavePdf = useCallback(() => {
    void recordAuditOnce()
    window.print()
  }, [recordAuditOnce])

  if (!open || !vehicle) return null

  const toolbarTitle = `Araç Çıkış Fişi — ${vehicle}`

  return createPortal(
    <div className="sds-overlay" role="dialog" aria-modal="true" aria-label={toolbarTitle}>
      <header className="sds-toolbar shipment-dispatch-sheet-print-toolbar">
        <div>
          <p className="sds-toolbar-title">{toolbarTitle}</p>
          <p className="sds-toolbar-hint">
            {selectedDate} · {model?.header.totalCustomers ?? 0} durak
          </p>
        </div>
        <div className="sds-toolbar-actions">
          <button
            type="button"
            className="sds-btn sds-btn--primary"
            disabled={!model}
            onClick={handlePrint}
          >
            Yazdır
          </button>
          <button
            type="button"
            className="sds-btn sds-btn--secondary"
            disabled={!model}
            onClick={handleSavePdf}
          >
            PDF Olarak Kaydet
          </button>
          <button type="button" className="sds-btn sds-btn--ghost" onClick={onClose}>
            Kapat
          </button>
        </div>
      </header>

      <div className="sds-preview-scroll">
        {loading ? <p className="sds-loading">Çıkış fişi hazırlanıyor…</p> : null}
        {error ? <p className="sds-loading">{error}</p> : null}
        {model ? <DispatchSheetDocument ref={printAreaRef} model={model} /> : null}
      </div>
    </div>,
    document.body,
  )
}

/** @param {{ model: DispatchSheetModel }} props */
const DispatchSheetDocument = forwardRef(function DispatchSheetDocument({ model }, ref) {
  const { header, stops, checklist } = model

  return (
    <article
      ref={ref}
      className="sds-document shipment-dispatch-sheet-print-area"
      id="sds-print-root"
    >
      <header className="sds-page-header">
        <div>
          <p className="sds-brand">{header.brand}</p>
          <h1 className="sds-doc-title">{header.title}</h1>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
          <div>
            <strong>Tarih:</strong> {header.date}
          </div>
          <div>
            <strong>Araç:</strong> {header.vehicle}
          </div>
        </div>
      </header>

      <dl className="sds-meta-grid">
        <dt>Ekip</dt>
        <dd>{header.crew}</dd>
        <dt>Bölge / rota</dt>
        <dd>{header.route}</dd>
        <dt>Toplam müşteri</dt>
        <dd>{header.totalCustomers}</dd>
        <dt>Toplam ürün</dt>
        <dd>{header.totalProducts}</dd>
        <dt>Toplam tahsilat bekleyen</dt>
        <dd>{header.totalCollectionDueLabel}</dd>
        <dt>Hazırlayan</dt>
        <dd>{header.preparedBy}</dd>
        <dt>Oluşturma</dt>
        <dd>{header.createdAtLabel}</dd>
      </dl>

      {stops.map((stop) => (
        <section key={stop.orderId} className="sds-stop">
          <header className="sds-stop__head">
            <span className="sds-stop__seq">Durak {stop.sequence}</span>
            <span className="sds-stop__time">{stop.plannedTime}</span>
          </header>

          <dl className="sds-stop__grid">
            <dt>Müşteri</dt>
            <dd>{stop.customer}</dd>
            <dt>Telefon</dt>
            <dd>{stop.phone}</dd>
            <dt>Adres</dt>
            <dd>{stop.address}</dd>
            <dt>Bölge</dt>
            <dd>{stop.region}</dd>
            <dt>Sipariş no</dt>
            <dd>{stop.orderNumber}</dd>
            <dt>Kalan ödeme</dt>
            <dd>{stop.remainingPaymentLabel}</dd>
            <dt>Tahsilat notu</dt>
            <dd>{stop.collectionNote}</dd>
            <dt>Sevk notu</dt>
            <dd>{stop.shipmentNote}</dd>
            <dt>Montaj notu</dt>
            <dd>{stop.installationNote}</dd>
            <dt>Risk</dt>
            <dd>
              <span className="sds-risk">{stop.riskLabel}</span>
            </dd>
          </dl>

          <div>
            <strong style={{ fontSize: '0.78rem' }}>Ürünler</strong>
            <ul className="sds-stop__products">
              {stop.products.map((product, idx) => (
                <li key={`${stop.orderId}-${idx}`}>
                  <div className="sds-stop__product-title">
                    {product.title} ×{product.quantity}
                  </div>
                  {product.configurationLines?.length ? (
                    <ul className="sds-stop__config">
                      {product.configurationLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="sds-signature">Müşteri imzası</div>
        </section>
      ))}

      <footer className="sds-checklist">
        <h2 className="sds-checklist__title">Hızlı kontrol</h2>
        <ul className="sds-checklist__list">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </footer>
    </article>
  )
})
