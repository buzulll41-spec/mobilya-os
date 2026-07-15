import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'

import MobileDateField from '../../components/mobile/MobileDateField.jsx'
import { IconClose } from '../../components/Icons.jsx'
import { useOrderLineReceiving } from '../../hooks/useOrderLineReceiving.js'
import * as ordersClient from '../../services/ordersClient.js'
import { isMissingItemResolvedStatus } from '../../contracts/v1/missingItemStatuses.js'
import { buildOrderPanelProductRows } from '../../mappers/order/orderPanelProductsModel.js'
import {
  buildShipmentPlanningOperationChecks,
  buildShipmentPlanningOpsSummary,
  buildShipmentDeliveryProductsViewModel,
  formatDeliveryQtyLabel,
  joinShipmentRegionFields,
  splitShipmentRegionFields,
} from '../../mappers/shipment-ops/shipmentPlanningCenterModel.js'
import { normalizePlanTime } from '../../state/shipmentPlanStore.js'
import {
  SHIPMENT_CREW_OPTIONS,
  SHIPMENT_VEHICLE_OPTIONS,
} from '../../mappers/shipment-ops/shipmentPlanConstants.js'
import { KNOWN_SHIPMENT_REGIONS } from '../../mappers/shipment-ops/shipmentRegionNormalize.js'
import { detectPlanConflicts } from '../../mappers/shipment-ops/shipmentPlanConflict.js'
import { buildShipmentStopDetailModel } from '../../mappers/shipment-ops/buildShipmentStopDetailModel.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import { formatShortDate } from '../../utils/dates.js'
import { labelFor, INSTALLATION_STATE_LABELS } from '../../mappers/operational/operationalStateLabelsTr.js'
import '../../styles/shipment-ops-mobile-edition.css'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const STEPS = [
  { id: 'summary', label: 'Sipariş özeti' },
  { id: 'products', label: 'Ürün hazırlık kontrolü' },
  { id: 'vehicle', label: 'Araç seçimi' },
  { id: 'crew', label: 'Personel / montaj ekibi seçimi' },
  { id: 'datetime', label: 'Tarih ve saat' },
  { id: 'contact', label: 'Adres ve iletişim' },
  { id: 'save', label: 'Planı kaydet' },
]

/**
 * @param {boolean} open
 * @param {() => void} onClose
 */
function useSheetDismiss(open, onClose) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])
}

/**
 * @param {string} riskLabel
 */
function riskTone(riskLabel) {
  const value = String(riskLabel ?? '').toLowerCase()
  if (value.includes('kritik') || value.includes('sorun') || value.includes('eksik')) return 'critical'
  if (value.includes('yüksek') || value.includes('gecik') || value.includes('bekli')) return 'warning'
  return 'neutral'
}

/**
 * @param {string} statusLabel
 */
function shipmentTone(statusLabel) {
  const value = String(statusLabel ?? '').toLowerCase()
  if (value.includes('teslim')) return 'success'
  if (value.includes('montaj') || value.includes('yolda') || value.includes('onayı')) return 'warning'
  return 'neutral'
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 */
function installationLabel(dto) {
  return labelFor(INSTALLATION_STATE_LABELS, dto?.operationalState?.installationState ?? 'NOT_REQUIRED')
}

/**
 * @param {{
 *   open: boolean
 *   item: ShipmentAgendaItem | null
 *   initialPlan: ShipmentPlan | null
 *   allPlans: ShipmentPlan[]
 *   order?: Order
 *   listItemDto?: SalesOrderListItemDto
 *   onSave: (plan: ShipmentPlan) => void | Promise<void>
 *   onClose: () => void
 * }} props
 */
export default function ShipmentOpsMobilePlanSheet({
  open,
  item,
  initialPlan,
  allPlans,
  order,
  listItemDto,
  onSave,
  onClose,
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [plannedDate, setPlannedDate] = useState(initialPlan?.plannedDate ?? '')
  const [plannedTime, setPlannedTime] = useState(initialPlan?.plannedTime ?? '')
  const [district, setDistrict] = useState(() => splitShipmentRegionFields(initialPlan?.region ?? '').district)
  const [neighborhood, setNeighborhood] = useState(
    () => splitShipmentRegionFields(initialPlan?.region ?? '').neighborhood,
  )
  const [vehicle, setVehicle] = useState(initialPlan?.vehicle ?? '')
  const [crew1, setCrew1] = useState(initialPlan?.crew1 ?? '')
  const [crew2, setCrew2] = useState(initialPlan?.crew2 ?? '')
  const [note, setNote] = useState(initialPlan?.note ?? '')
  const { lines: receivingLines } = useOrderLineReceiving(item?.orderId ?? '', 0)
  const [orderLines, setOrderLines] = useState(
    /** @type {import('../../services/ordersClient.js').OrderLineDetailDto[] | null} */ (null),
  )
  const [openMissingLineIds, setOpenMissingLineIds] = useState(/** @type {Set<string>} */ (new Set()))

  useSheetDismiss(open, onClose)

  useEffect(() => {
    if (!open || !item?.orderId) return
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
              .filter((missingItem) => missingItem.lineId && !isMissingItemResolvedStatus(missingItem.status))
              .map((missingItem) => missingItem.lineId)
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
  }, [open, item?.orderId])

  useEffect(() => {
    if (!open || !initialPlan) return
    setStepIndex(0)
    setSaveError(null)
    setPlannedDate(initialPlan.plannedDate)
    setPlannedTime(initialPlan.plannedTime)
    const split = splitShipmentRegionFields(initialPlan.region)
    setDistrict(split.district)
    setNeighborhood(split.neighborhood)
    setVehicle(initialPlan.vehicle)
    setCrew1(initialPlan.crew1)
    setCrew2(initialPlan.crew2)
    setNote(initialPlan.note)
  }, [open, initialPlan])

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
  const draftPlan = useMemo(() => {
    if (!item || !initialPlan) return null
    return {
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
    }
  }, [item, initialPlan, plannedDate, plannedTime, region, vehicle, crew1, crew2, note])

  const conflicts = useMemo(() => {
    if (!draftPlan || !item) return { vehicleWarnings: [], crewWarnings: [] }
    return detectPlanConflicts(draftPlan, allPlans, item.orderId)
  }, [draftPlan, allPlans, item])

  const stopModel = useMemo(() => {
    if (!item) return null
    return buildShipmentStopDetailModel({ item, order, listItemDto, plan: draftPlan ?? initialPlan ?? undefined })
  }, [item, order, listItemDto, draftPlan, initialPlan])

  if (!open || !item || !initialPlan || !stopModel) return null

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1
  const primaryLabel = isLastStep ? (saving ? 'Kaydediliyor…' : 'Planı kaydet') : 'Devam'
  const secondaryLabel = stepIndex === 0 ? 'Kapat' : 'Geri'

  async function handlePrimaryAction() {
    if (isLastStep) {
      if (!draftPlan) return
      setSaving(true)
      setSaveError(null)
      try {
        await onSave(draftPlan)
        onClose()
      } catch (error) {
        setSaveError(formatApiErrorMessage(error))
      } finally {
        setSaving(false)
      }
      return
    }
    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function handleSecondaryAction() {
    if (stepIndex === 0) {
      onClose()
      return
    }
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  return createPortal(
    <div className="sops-mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="sops-mobile-sheet-title">
      <button type="button" className="sops-mobile-sheet__backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="sops-mobile-sheet__panel">
        <header className="sops-mobile-sheet__head">
          <div>
            <p className="sops-mobile-sheet__eyebrow">Sevk kartı</p>
            <h2 id="sops-mobile-sheet-title" className="sops-mobile-sheet__title">{item.customer}</h2>
            <p className="sops-mobile-sheet__sub">{item.orderNumber} · {formatShortDate(item.dateIso)}</p>
          </div>
          <button type="button" className="sops-mobile-sheet__close" aria-label="Kapat" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="sops-mobile-sheet__progress" aria-label="Sevk planlama adımları">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={`sops-mobile-sheet__progress-step${index === stepIndex ? ' is-active' : ''}`}
              onClick={() => setStepIndex(index)}
            >
              <span>{index + 1}</span>
              <strong>{step.label}</strong>
            </button>
          ))}
        </div>

        <div className="sops-mobile-sheet__body">
          {currentStep.id === 'summary' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Sipariş özeti</h3>
              <div className="sops-mobile-sheet__grid">
                <article>
                  <span>Müşteri</span>
                  <strong>{item.customer}</strong>
                </article>
                <article>
                  <span>Sipariş</span>
                  <strong>{item.orderNumber}</strong>
                </article>
                <article>
                  <span>Sevk durumu</span>
                  <strong data-tone={shipmentTone(item.statusLabel)}>{item.statusLabel}</strong>
                </article>
                <article>
                  <span>Montaj durumu</span>
                  <strong>{installationLabel(listItemDto)}</strong>
                </article>
                <article>
                  <span>Risk / uyarı</span>
                  <strong data-tone={riskTone(item.riskLabel)}>{item.riskLabel}</strong>
                </article>
                <article>
                  <span>Kalan tahsilat</span>
                  <strong>{stopModel.remainingPaymentLabel}</strong>
                </article>
              </div>
              {opsSummary.length > 0 ? (
                <div className="sops-mobile-sheet__stack">
                  {opsSummary.map((summary) => (
                    <article key={summary.id} className="sops-mobile-sheet__metric">
                      <span>{summary.label}</span>
                      <strong>{summary.value}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {currentStep.id === 'products' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Ürün hazırlık kontrolü</h3>
              {operationChecks.length > 0 ? (
                <div className="sops-mobile-sheet__stack">
                  {operationChecks.map((check) => (
                    <article key={check.id} className="sops-mobile-sheet__note" data-tone={check.tone}>
                      <strong>{check.label}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
              <div className="sops-mobile-sheet__stack">
                {orderLines === null ? (
                  <p className="sops-mobile-sheet__empty">Ürünler yükleniyor…</p>
                ) : deliveryProducts.lines.length === 0 ? (
                  <p className="sops-mobile-sheet__empty">Teslim ürünü yok.</p>
                ) : (
                  deliveryProducts.lines.map((line) => (
                    <article key={line.id} className="sops-mobile-sheet__record">
                      <strong>{line.displayLabel}</strong>
                    </article>
                  ))
                )}
              </div>
              {deliveryProducts.lines.length > 0 ? (
                <p className="sops-mobile-sheet__hint">
                  Toplam ürün: <strong>{formatDeliveryQtyLabel(deliveryProducts.totalQuantity)}</strong>
                </p>
              ) : null}
            </section>
          ) : null}

          {currentStep.id === 'vehicle' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Araç seçimi</h3>
              <label className="sops-mobile-sheet__field">
                <span>Araç</span>
                <select value={vehicle} onChange={(event) => setVehicle(event.target.value)}>
                  <option value="">Seçin</option>
                  {SHIPMENT_VEHICLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <p className="sops-mobile-sheet__hint">Mevcut seçim: {vehicle || 'Araç atanmadı'}</p>
            </section>
          ) : null}

          {currentStep.id === 'crew' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Personel / montaj ekibi seçimi</h3>
              <label className="sops-mobile-sheet__field">
                <span>Montaj ustası</span>
                <select value={crew1} onChange={(event) => setCrew1(event.target.value)}>
                  <option value="">Seçin</option>
                  {SHIPMENT_CREW_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sops-mobile-sheet__field">
                <span>Yardımcı ekip</span>
                <select value={crew2} onChange={(event) => setCrew2(event.target.value)}>
                  <option value="">Seçin</option>
                  {SHIPMENT_CREW_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <p className="sops-mobile-sheet__hint">Seçilen ekip: {[crew1, crew2].filter(Boolean).join(' · ') || 'Ekip atanmadı'}</p>
            </section>
          ) : null}

          {currentStep.id === 'datetime' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Tarih ve saat</h3>
              <MobileDateField label="Teslim tarihi" value={plannedDate} onChange={setPlannedDate} />
              <label className="sops-mobile-sheet__field">
                <span>Saat</span>
                <input type="time" value={plannedTime} onChange={(event) => setPlannedTime(event.target.value)} />
              </label>
            </section>
          ) : null}

          {currentStep.id === 'contact' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Adres ve iletişim</h3>
              <div className="sops-mobile-sheet__grid">
                <article>
                  <span>Telefon</span>
                  <strong>{stopModel.phone}</strong>
                </article>
                <article>
                  <span>Bölge</span>
                  <strong>{region || stopModel.region || 'Bölge belirsiz'}</strong>
                </article>
              </div>
              <article className="sops-mobile-sheet__record">
                <strong>Adres</strong>
                <p>{stopModel.address}</p>
              </article>
              <label className="sops-mobile-sheet__field">
                <span>İlçe</span>
                <input
                  list="sops-mobile-regions"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                  placeholder="Başiskele"
                />
                <datalist id="sops-mobile-regions">
                  {KNOWN_SHIPMENT_REGIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
              <label className="sops-mobile-sheet__field">
                <span>Mahalle</span>
                <input
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  placeholder="Mahalle"
                />
              </label>
              <label className="sops-mobile-sheet__field">
                <span>Müşteri notu</span>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Müşteri öğleden sonra evde…"
                />
              </label>
            </section>
          ) : null}

          {currentStep.id === 'save' ? (
            <section className="sops-mobile-sheet__section">
              <h3>Planı kaydet</h3>
              <div className="sops-mobile-sheet__grid">
                <article>
                  <span>Tarih</span>
                  <strong>{plannedDate ? formatShortDate(plannedDate) : '—'}</strong>
                </article>
                <article>
                  <span>Saat</span>
                  <strong>{normalizePlanTime(plannedTime) || '—'}</strong>
                </article>
                <article>
                  <span>Araç</span>
                  <strong>{vehicle || 'Araç atanmadı'}</strong>
                </article>
                <article>
                  <span>Ekip</span>
                  <strong>{[crew1, crew2].filter(Boolean).join(' · ') || 'Ekip atanmadı'}</strong>
                </article>
                <article>
                  <span>Bölge</span>
                  <strong>{region || 'Bölge belirsiz'}</strong>
                </article>
                <article>
                  <span>Risk</span>
                  <strong data-tone={riskTone(item.riskLabel)}>{item.riskLabel}</strong>
                </article>
              </div>
              {conflicts.vehicleWarnings.length > 0 || conflicts.crewWarnings.length > 0 ? (
                <div className="sops-mobile-sheet__stack">
                  {[...conflicts.vehicleWarnings, ...conflicts.crewWarnings].map((warning) => (
                    <article key={warning} className="sops-mobile-sheet__note" data-tone="warning">
                      <strong>{warning}</strong>
                    </article>
                  ))}
                </div>
              ) : null}
              {saveError ? (
                <p className="sops-mobile-sheet__error" role="alert">
                  {saveError}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        <footer className="sops-mobile-sheet__footer">
          <button type="button" className="sops-mobile-sheet__secondary" onClick={handleSecondaryAction}>
            {secondaryLabel}
          </button>
          <button
            type="button"
            className="sops-mobile-sheet__primary"
            onClick={() => void handlePrimaryAction()}
            disabled={saving}
          >
            {primaryLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
