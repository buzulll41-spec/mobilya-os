import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'

import MobileDateField from '../../components/mobile/MobileDateField.jsx'
import { IconClose } from '../../components/Icons.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { KNOWN_SHIPMENT_REGIONS } from '../../mappers/shipment-ops/shipmentRegionNormalize.js'
import {
  SHIPMENT_CREW_OPTIONS,
  SHIPMENT_VEHICLE_OPTIONS,
} from '../../mappers/shipment-ops/shipmentPlanConstants.js'
import { detectPlanConflicts } from '../../mappers/shipment-ops/shipmentPlanConflict.js'
import {
  buildShipmentPlanningOperationChecks,
  buildShipmentPlanningOpsSummary,
  buildShipmentDeliveryProductsViewModel,
  formatDeliveryQtyLabel,
  joinShipmentRegionFields,
  splitShipmentRegionFields,
} from '../../mappers/shipment-ops/shipmentPlanningCenterModel.js'
import { normalizePlanTime } from '../../state/shipmentPlanStore.js'
import * as ordersClient from '../../services/ordersClient.js'
import { useOrderLineReceiving } from '../../hooks/useOrderLineReceiving.js'
import { isMissingItemResolvedStatus } from '../../contracts/v1/missingItemStatuses.js'
import { buildOrderPanelProductRows } from '../../mappers/order/orderPanelProductsModel.js'

import '../../styles/shipment-planning-center-v2.css'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @param {{
 *   item: ShipmentAgendaItem
 *   initialPlan: ShipmentPlan
 *   allPlans: ShipmentPlan[]
 *   order?: Order
 *   listItemDto?: SalesOrderListItemDto
 *   onSave: (plan: ShipmentPlan) => void | Promise<void>
 *   onClose: () => void
 * }} props
 */
export default function ShipmentPlanningCenterModal({
  item,
  initialPlan,
  allPlans,
  order,
  listItemDto,
  onSave,
  onClose,
}) {
  const [saving, setSaving] = useState(false)
  const [plannedDate, setPlannedDate] = useState(initialPlan.plannedDate)
  const [plannedTime, setPlannedTime] = useState(initialPlan.plannedTime)
  const [district, setDistrict] = useState(() => splitShipmentRegionFields(initialPlan.region).district)
  const [neighborhood, setNeighborhood] = useState(
    () => splitShipmentRegionFields(initialPlan.region).neighborhood,
  )
  const [vehicle, setVehicle] = useState(initialPlan.vehicle)
  const [crew1, setCrew1] = useState(initialPlan.crew1)
  const [crew2, setCrew2] = useState(initialPlan.crew2)
  const [note, setNote] = useState(initialPlan.note)

  const { lines: receivingLines } = useOrderLineReceiving(item.orderId, 0)
  const [orderLines, setOrderLines] = useState(
    /** @type {import('../../services/ordersClient.js').OrderLineDetailDto[] | null} */ (null),
  )
  const [openMissingLineIds, setOpenMissingLineIds] = useState(/** @type {Set<string>} */ (new Set()))

  useEffect(() => {
    let cancelled = false
    Promise.all([
      ordersClient.getOrderLines(item.orderId),
      ordersClient.getOrderMissingItems(item.orderId),
    ])
      .then(([lines, missingItems]) => {
        if (cancelled) return
        setOrderLines(lines)
        setOpenMissingLineIds(
          new Set(
            missingItems
              .filter((m) => m.lineId && !isMissingItemResolvedStatus(m.status))
              .map((m) => m.lineId)
              .filter(Boolean),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setOrderLines([])
      })
    return () => {
      cancelled = true
    }
  }, [item.orderId])

  useEffect(() => {
    setPlannedDate(initialPlan.plannedDate)
    setPlannedTime(initialPlan.plannedTime)
    const split = splitShipmentRegionFields(initialPlan.region)
    setDistrict(split.district)
    setNeighborhood(split.neighborhood)
    setVehicle(initialPlan.vehicle)
    setCrew1(initialPlan.crew1)
    setCrew2(initialPlan.crew2)
    setNote(initialPlan.note)
  }, [initialPlan])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const productRows = useMemo(() => {
    if (!orderLines) return []
    return buildOrderPanelProductRows(orderLines, receivingLines, openMissingLineIds)
  }, [orderLines, receivingLines, openMissingLineIds])

  const opsSummary = useMemo(() => {
    if (!order) return []
    return buildShipmentPlanningOpsSummary(order, listItemDto, productRows)
  }, [order, listItemDto, productRows])

  const operationChecks = useMemo(() => {
    if (!order) return []
    return buildShipmentPlanningOperationChecks(productRows, listItemDto, order)
  }, [order, listItemDto, productRows])

  const deliveryProducts = useMemo(
    () => buildShipmentDeliveryProductsViewModel(orderLines, listItemDto?.lineSummaryTitle),
    [orderLines, listItemDto?.lineSummaryTitle],
  )

  const region = joinShipmentRegionFields(district, neighborhood)

  const draftPlan = useMemo(
    () => ({
      id: initialPlan.id,
      orderId: item.orderId,
      plannedDate,
      plannedTime: normalizePlanTime(plannedTime),
      region: region.trim(),
      vehicle,
      crew1,
      crew2,
      note: note.trim(),
      groupId: initialPlan.groupId,
      deliveryType: initialPlan.deliveryType,
      missingItemId: initialPlan.missingItemId,
      missingItemTitle: initialPlan.missingItemTitle,
      updatedAt: initialPlan.updatedAt,
    }),
    [item.orderId, plannedDate, plannedTime, region, vehicle, crew1, crew2, note, initialPlan],
  )

  const conflicts = useMemo(
    () => detectPlanConflicts(draftPlan, allPlans, item.orderId),
    [draftPlan, allPlans, item.orderId],
  )

  const displayStatus = listItemDto?.displayStatus ?? order?.status ?? item.statusLabel
  const productCount = productRows.length || '—'
  const installLabel =
    opsSummary.find((s) => s.id === 'install')?.value ??
    (listItemDto?.installationPending ? 'Bekliyor' : 'Gerekmez')

  async function handleSave() {
    setSaving(true)
    try {
      await onSave({
        ...draftPlan,
        plannedTime: normalizePlanTime(plannedTime),
        region: region.trim(),
        note: note.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="spc-v2-overlay" role="dialog" aria-modal="true" aria-labelledby="spc-v2-title">
      <div className="spc-v2-shell">
        <header className="spc-v2-head">
          <div className="spc-v2-head__main">
            <h1 id="spc-v2-title" className="spc-v2-title">
              {item.customer}
            </h1>
            <dl className="spc-v2-head-meta">
              <div>
                <dt>Sipariş</dt>
                <dd>{item.orderNumber}</dd>
              </div>
              <div>
                <dt>Durum</dt>
                <dd>
                  <StatusBadge status={displayStatus} />
                </dd>
              </div>
              <div>
                <dt>Ürün</dt>
                <dd>{productCount}</dd>
              </div>
              <div>
                <dt>Montaj</dt>
                <dd>{installLabel}</dd>
              </div>
            </dl>
          </div>
          <button type="button" className="spc-v2-close" onClick={onClose} aria-label="Kapat">
            <IconClose />
          </button>
        </header>

        <div className="spc-v2-body">
          <section className="spc-v2-left" aria-label="Sevk planı">
            <h2 className="spc-v2-section-title">Plan Bilgileri</h2>

            <div className="spc-v2-date-row">
              <MobileDateField label="Sevk Tarihi" value={plannedDate} onChange={setPlannedDate} />
            </div>

            <label className="spc-v2-field">
              <span>Saat</span>
              <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} />
            </label>

            <h3 className="spc-v2-subtitle">Bölge</h3>
            <label className="spc-v2-field">
              <span>İlçe</span>
              <input
                list="spc-region-options"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="Başiskele"
              />
              <datalist id="spc-region-options">
                {KNOWN_SHIPMENT_REGIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </label>
            <label className="spc-v2-field">
              <span>Mahalle</span>
              <input
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Mahalle"
              />
            </label>

            <h3 className="spc-v2-subtitle">Araç</h3>
            <label className="spc-v2-field">
              <span>Araç</span>
              <select value={vehicle} onChange={(e) => setVehicle(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_VEHICLE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            <h3 className="spc-v2-subtitle">Ekip</h3>
            <label className="spc-v2-field">
              <span>Montaj Ustası</span>
              <select value={crew1} onChange={(e) => setCrew1(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_CREW_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="spc-v2-field">
              <span>Yardımcı</span>
              <select value={crew2} onChange={(e) => setCrew2(e.target.value)}>
                <option value="">Seçin</option>
                {SHIPMENT_CREW_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="spc-v2-field spc-v2-field--full">
              <span>Müşteri notu</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Müşteri öğleden sonra evde…"
              />
            </label>
          </section>

          <section className="spc-v2-right" aria-label="Operasyon özeti">
            <h2 className="spc-v2-section-title">Operasyon Özeti</h2>
            <div className="spc-v2-summary-grid">
              {opsSummary.map((row) => (
                <article key={row.id} className="spc-v2-summary-card">
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </article>
              ))}
            </div>

            <article className="spc-v2-delivery-card" aria-label="Teslim edilecek ürünler">
              <h3 className="spc-v2-subtitle">Teslim Edilecek Ürünler</h3>
              {orderLines === null ? (
                <p className="spc-v2-delivery-meta">Ürünler yükleniyor…</p>
              ) : deliveryProducts.lines.length === 0 ? (
                <p className="spc-v2-delivery-meta">Ürün kalemi yok</p>
              ) : (
                <>
                  <ul className="spc-v2-delivery-list">
                    {deliveryProducts.lines.map((line) => (
                      <li key={line.id}>{line.displayLabel}</li>
                    ))}
                  </ul>
                  <p className="spc-v2-delivery-total">
                    Toplam ürün sayısı:{' '}
                    <strong>{formatDeliveryQtyLabel(deliveryProducts.totalQuantity)}</strong>
                  </p>
                </>
              )}
            </article>

            <h3 className="spc-v2-subtitle">Operasyon Uyarıları</h3>
            <ul className="spc-v2-checks">
              {operationChecks.map((check) => (
                <li key={check.id} className={`spc-v2-check spc-v2-check--${check.tone}`}>
                  {check.tone === 'ok' ? '🟢' : check.tone === 'critical' ? '🔴' : '🟠'} {check.label}
                </li>
              ))}
            </ul>

            {(conflicts.vehicleWarnings.length > 0 || conflicts.crewWarnings.length > 0) && (
              <div className="spc-v2-conflicts" role="status">
                {[...conflicts.vehicleWarnings, ...conflicts.crewWarnings].map((msg) => (
                  <p key={msg}>{msg}</p>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="spc-v2-foot">
          <button type="button" className="spc-v2-cancel" onClick={onClose}>
            İptal
          </button>
          <button
            type="button"
            className="spc-v2-submit"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? 'Planlanıyor…' : 'SEVKİ PLANLA'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
