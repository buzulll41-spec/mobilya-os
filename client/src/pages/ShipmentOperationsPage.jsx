import { memo, useEffect, useMemo, useRef, useState } from 'react'
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { erpOpsButtonClass } from '../lib/actionButtonVariants.js'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import ErpOpsWeekFilters from '../components/erp-ops/ErpOpsWeekFilters.jsx'
import ErpOpsDetailStrip from '../components/erp-ops/ErpOpsDetailStrip.jsx'
import ShipmentOpsPlannedTable from '../features/shipment-ops/ShipmentOpsPlannedTable.jsx'
import ShipmentPlanningCenterModal from '../features/shipment-ops/ShipmentPlanningCenterModal.jsx'
import ShipmentOpsMobilePlanSheet from '../features/shipment-ops/ShipmentOpsMobilePlanSheet.jsx'
import ShipmentDispatchSheetPrint from '../features/shipment-ops/ShipmentDispatchSheetPrint.jsx'
import ShipmentStopDetailPanel from '../features/shipment-ops/ShipmentStopDetailPanel.jsx'
import ShipmentDeliveryConfirmModal from '../features/shipment-ops/ShipmentDeliveryConfirmModal.jsx'
import ShipmentDeliveryFailModal from '../features/shipment-ops/ShipmentDeliveryFailModal.jsx'
import ShipmentDeliveryPostponeModal from '../features/shipment-ops/ShipmentDeliveryPostponeModal.jsx'
import { SHIPMENT_OPERATION_STATUS } from '../contracts/v1/shipmentStatuses.js'
import { buildShipmentAdvanceChain } from '../mappers/shipment/shipmentSimplifiedFlow.js'
import { applyShipmentStatusAdvance } from '../mappers/shipment/applyShipmentStatusAdvance.js'
import { shipmentStatusOrPlanned } from '../mappers/shipment/shipmentStatusLabel.js'
import {
  buildInitialPlanFromAgendaItem,
  buildShipmentOpsV3View,
} from '../mappers/shipment-ops/shipmentOpsAgendaViewModel.js'
import {
  SHIPMENT_HORIZON_LEFT_FILTERS,
  SHIPMENT_CONFIRMATION_FILTER,
  agendaItemToDetailStripRow,
  agendaItemToShipmentPlannedTableRow,
  buildShipmentHorizonMetrics,
} from '../features/shipment-ops/shipmentOpsCenterUi.js'
import { addDays } from '../data/constants.js'
import { formatCrewLabel } from '../state/shipmentPlanStore.js'
import { useShipmentPlans } from '../hooks/useShipmentPlans.jsx'
import { useOrders } from '../state/useOrders.js'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { MOBILE_FAB_EVENT } from '../constants/mobileFabActions.js'
import { isOfflineMode, runWithOfflineQueue } from '../services/offline/offlineMutationGate.js'
import { OFFLINE_MUTATION_TYPE } from '../services/offline/offlineCacheStore.js'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import { toastSuccess } from '../lib/toastBus.js'
import { getApiBaseUrl } from '../config/dataSource.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import { consumeOpsDeepLink } from '../lib/opsDeepLink.js'
import {
  confirmPlanDelivery,
  failPlanDelivery,
  postponePlanDelivery,
} from '../services/deliveryConfirmationClient.js'
import * as ordersClient from '../services/ordersClient.js'
import MobileStoreChipBar from '../components/mobile/MobileStoreChipBar.jsx'
import MobileStoreEmptyState from '../components/mobile/MobileStoreEmptyState.jsx'
import { useViewportTier } from '../hooks/useViewportTier.js'
import {
  isMobileDeliveredShipmentRow,
  MOBILE_SHIPMENT_PRIORITY_CHIPS,
} from '../mappers/mobile/mobileStoreOpsModel.js'
import { INSTALLATION_STATE_LABELS, labelFor } from '../mappers/operational/operationalStateLabelsTr.js'
import { buildShipmentStopDetailModel } from '../mappers/shipment-ops/buildShipmentStopDetailModel.js'
import '../styles/mos-erp-ops.css'
import '../styles/shipment-ops-mobile-edition.css'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../features/shipment-ops/shipmentOpsCenterUi.js').ShipmentHorizonId} ShipmentHorizonId */
/** @typedef {import('../features/shipment-ops/shipmentOpsCenterUi.js').ShipmentPlannedTableRow} ShipmentPlannedTableRow */

/**
 * @param {{
 *   shipmentRows: ShipmentRowVM[]
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   onOpenOrder?: (row: { id: string }, options?: import('../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   highlightOrderId?: string | null
 * }} props
 */
function ShipmentOperationsPage({
  shipmentRows,
  orders,
  listItemDtos,
  todayIso,
  onOpenOrder,
  highlightOrderId = null,
}) {
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [agendaHorizon, setAgendaHorizon] = useState(/** @type {ShipmentHorizonId} */ ('all'))
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))
  const [planItem, setPlanItem] = useState(/** @type {ShipmentAgendaItem | null} */ (null))
  const [dispatchSheetVehicle, setDispatchSheetVehicle] = useState(/** @type {string | null} */ (null))
  const [stopDetailItem, setStopDetailItem] = useState(/** @type {ShipmentAgendaItem | null} */ (null))
  const { plans, plansByOrderId, upsertPlan, createGroup, refreshPlans } = useShipmentPlans()
  const { refreshOrders, recordDispatchAdviceGenerated, recordDispatchRiskDetected, patchShipmentStatus, mutating } =
    useOrders()
  const [deliveryTarget, setDeliveryTarget] = useState(/** @type {ShipmentPlannedTableRow | null} */ (null))
  const [queueConfirmTarget, setQueueConfirmTarget] = useState(/** @type {ShipmentPlannedTableRow | null} */ (null))
  const [failTarget, setFailTarget] = useState(/** @type {ShipmentPlannedTableRow | null} */ (null))
  const [postponeTarget, setPostponeTarget] = useState(/** @type {ShipmentPlannedTableRow | null} */ (null))
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'
  const isTouchStore = viewportTier === 'phone' || viewportTier === 'tablet'
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const [mobileShipmentChip, setMobileShipmentChip] = useState('today')
  const adviceAuditKeyRef = useRef('')

  useEffect(() => {
    const filter = consumeOpsDeepLink('shipment-ops')
    if (filter === 'today') setAgendaHorizon('today')
    else if (filter === 'overdue') setAgendaHorizon('all')
    else if (filter === 'pending_confirm') setAgendaHorizon('pending_confirm')
  }, [])

  const rows = useMemo(
    () => (Array.isArray(shipmentRows) ? shipmentRows : []),
    [shipmentRows],
  )

  const rowByOrderId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows])
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders])
  const dtoById = useMemo(() => new Map(listItemDtos.map((d) => [d.id, d])), [listItemDtos])

  const view = useMemo(
    () =>
      buildShipmentOpsV3View({
        shipmentRows: rows,
        orders,
        listItemDtos,
        todayIso,
        selectedDate,
        agendaHorizon,
        plansByOrderId,
      }),
    [rows, orders, listItemDtos, todayIso, selectedDate, agendaHorizon, plansByOrderId],
  )

  const horizonMetrics = useMemo(
    () => buildShipmentHorizonMetrics(view.horizonCounts),
    [view.horizonCounts],
  )

  const scopedAgendaItems = useMemo(
    () =>
      filterItems(view.agendaItems, (item) =>
        getOrderPilotKind({
          id: item.orderId,
          orderNumber: item.orderNumber,
          customer: item.customer,
        }),
      ),
    [view.agendaItems, filterItems],
  )

  const filteredAgenda = scopedAgendaItems

  useEffect(() => {
    /** @param {Event} event */
    function onMobileFab(event) {
      const detail = /** @type {CustomEvent<{ intent?: string }>} */ (event).detail
      if (detail?.intent !== 'new-shipment') return
      const item = filteredAgenda[0]
      if (item) setPlanItem(item)
    }
    window.addEventListener(MOBILE_FAB_EVENT, onMobileFab)
    return () => window.removeEventListener(MOBILE_FAB_EVENT, onMobileFab)
  }, [filteredAgenda])

  const agendaById = useMemo(
    () => new Map(filteredAgenda.map((item) => [item.id, item])),
    [filteredAgenda],
  )

  const tableRows = useMemo(
    () => filteredAgenda.map((item) => agendaItemToShipmentPlannedTableRow(item, todayIso)),
    [filteredAgenda, todayIso],
  )

  const displayedTableRows = useMemo(() => {
    if (mobileShipmentChip !== 'delivered') return tableRows
    return tableRows.filter((row) => isMobileDeliveredShipmentRow(row))
  }, [tableRows, mobileShipmentChip])

  const mobileShipmentChips = useMemo(
    () => MOBILE_SHIPMENT_PRIORITY_CHIPS.map((c) => ({ id: c.id, label: c.label })),
    [],
  )

  const selectedDetailRow = useMemo(() => {
    if (!selectedRowId) return null
    const item = agendaById.get(selectedRowId)
    return item ? agendaItemToDetailStripRow(item) : null
  }, [selectedRowId, agendaById])

  const horizonFilterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of SHIPMENT_HORIZON_LEFT_FILTERS) {
      counts[f.id] = view.horizonCounts[f.id] ?? 0
    }
    counts[SHIPMENT_CONFIRMATION_FILTER.id] = view.horizonCounts.pending_confirm ?? 0
    return counts
  }, [view.horizonCounts])

  const confirmationMode = agendaHorizon === 'pending_confirm'

  /** @param {string} chipId */
  function handleMobileShipmentChip(chipId) {
    setMobileShipmentChip(chipId)
    const chip = MOBILE_SHIPMENT_PRIORITY_CHIPS.find((c) => c.id === chipId)
    if (!chip || chip.id === 'delivered') return
    selectHorizon(/** @type {ShipmentHorizonId} */ (chip.horizon))
  }

  const selectedRow = useMemo(
    () => displayedTableRows.find((r) => r.id === selectedRowId) ?? displayedTableRows[0] ?? null,
    [displayedTableRows, selectedRowId],
  )

  const planModalInitial = useMemo(() => {
    if (!planItem) return null
    const existing = plansByOrderId.get(planItem.orderId)
    return buildInitialPlanFromAgendaItem(planItem, existing, rowByOrderId.get(planItem.orderId))
  }, [planItem, plansByOrderId, rowByOrderId])

  useEffect(() => {
    if (displayedTableRows.length === 0) {
      setSelectedRowId(null)
      return
    }
    if (!displayedTableRows.some((r) => r.id === selectedRowId)) {
      setSelectedRowId(displayedTableRows[0].id)
    }
  }, [displayedTableRows, selectedRowId])

  useEffect(() => {
    if (!highlightOrderId) return
    const item = filteredAgenda.find((a) => a.orderId === highlightOrderId)
    if (item) setSelectedRowId(item.id)
  }, [highlightOrderId, filteredAgenda])

  /** @param {string} orderId */
  function openOrderDrawerFromAgenda(orderId) {
    if (!onOpenOrder) return
    const orderIds = filteredAgenda.map((a) => a.orderId)
    onOpenOrder(
      { id: orderId },
      {
        tab: 'shipment',
        source: 'shipment',
        queue: buildDrawerQueue({
          queueId: `shipment:${selectedDate}:${agendaHorizon}`,
          filterSnapshot: { date: selectedDate, filter: agendaHorizon },
          rowIds: orderIds,
          activeOrderId: orderId,
          source: 'shipment',
        }),
      },
    )
  }

  useEffect(() => {
    if (!view.advisor) return
    const key = `${selectedDate}-${view.advisor.health.score}-${view.advisor.savings.length}-${view.advisor.wait.length}-${view.advisor.risks.length}`
    if (adviceAuditKeyRef.current === key) return
    adviceAuditKeyRef.current = key

    const anchorOrderId =
      view.advisor.affectedOrderIds[0] || view.agendaItems[0]?.orderId || rows[0]?.id
    if (!anchorOrderId) return

    void recordDispatchAdviceGenerated({
      salesOrderId: anchorOrderId,
      selectedDate,
      healthScore: view.advisor.health.score,
      savingsCount: view.advisor.savings.length,
      waitCount: view.advisor.wait.length,
      riskCount: view.advisor.risks.length,
      orderIds: view.advisor.affectedOrderIds,
    })

    for (const risk of view.advisor.risks) {
      if (!risk.orderId) continue
      void recordDispatchRiskDetected({
        salesOrderId: risk.orderId,
        riskType: risk.riskType ?? 'unknown',
        title: risk.title,
        recommendation: risk.recommendation ?? '',
        selectedDate,
      })
    }
  }, [
    view.advisor,
    view.agendaItems,
    selectedDate,
    rows,
    recordDispatchAdviceGenerated,
    recordDispatchRiskDetected,
  ])

  /** @param {ShipmentAgendaItem} item */
  function handleOpenAgendaItem(item) {
    setStopDetailItem(item)
  }

  /** @param {{ group: import('../mappers/shipment-ops/shipmentOpportunityEngine.js').ShipmentOpportunityGroup, plans: import('../state/shipmentPlanStore.js').ShipmentPlan[] }} input */
  async function handleCreateGroup({ group, plans }) {
    const result = await createGroup({
      region: group.region,
      plannedDate: plans[0]?.plannedDate || selectedDate,
      vehicleName: plans[0]?.vehicle,
      crewPrimary: plans[0]?.crew1,
      crewSecondary: plans[0]?.crew2,
      estimatedSaving: group.estimatedSavings,
      orders: plans.map((p) => ({
        salesOrderId: p.orderId,
        plannedTime: p.plannedTime,
      })),
    })
    if (getApiBaseUrl()) {
      await refreshOrders()
    }
    return {
      id: result.id,
      groupNo: result.groupNo,
      region: result.region,
      vehicle: result.vehicleName ?? plans[0]?.vehicle ?? 'Araç 1',
      crewLabel: formatCrewLabel(result.crewPrimary ?? plans[0]?.crew1, result.crewSecondary ?? plans[0]?.crew2),
      plannedDate: result.plannedDate ?? plans[0]?.plannedDate,
      orderIds: result.orderIds ?? plans.map((p) => p.orderId),
      orderCount: result.totalOrders ?? plans.length,
      totalAmount: result.totalAmount ?? group.totalAmount,
      estimatedSavings: result.estimatedSaving ?? group.estimatedSavings,
      createdAt: result.createdAt ?? new Date().toISOString(),
    }
  }

  async function handleSavePlan(/** @type {import('../state/shipmentPlanStore.js').ShipmentPlan} */ plan) {
    if (isOfflineMode()) {
      await runWithOfflineQueue({
        type: OFFLINE_MUTATION_TYPE.UPSERT_SHIPMENT,
        payload: plan,
        entityKey: plan.orderId,
        onlineExecutor: async () => {
          await upsertPlan(plan)
        },
      })
      return
    }
    await upsertPlan(plan)
    if (getApiBaseUrl()) {
      await refreshOrders()
    }
  }

  /** @param {ShipmentPlannedTableRow} row */
  function openRow(row) {
    const item = agendaById.get(row.id)
    if (item) handleOpenAgendaItem(item)
  }

  /** @param {ShipmentAgendaItem} item */
  async function resolveShipmentIdForDispatch(item) {
    if (item.shipmentId && item.shipmentId !== item.orderId && item.shipmentId.startsWith('SHP-')) {
      return item.shipmentId
    }
    const existing = await ordersClient.getOrderShipments(item.orderId)
    if (existing[0]?.id) return existing[0].id

    const plan = plansByOrderId.get(item.orderId)
    const { shipment } = await ordersClient.postOrderShipment(item.orderId, {
      plannedDate: plan?.plannedDate || item.dateIso || todayIso,
      ...(plan?.crew1 || item.crewLabel
        ? { crewName: plan?.crew1 || item.crewLabel.split(' · ')[0] }
        : {}),
      ...(plan?.vehicle || item.hasVehicle
        ? { vehicleNote: plan?.vehicle || item.vehicleLabel }
        : {}),
      ...(plan?.note || item.planNote ? { note: plan?.note || item.planNote } : {}),
    })
    return shipment.id
  }

  /** @param {ShipmentPlannedTableRow} row */
  async function handleDispatch(row) {
    const item = agendaById.get(row.id)
    if (!item?.orderId) return
    const shipmentId = await resolveShipmentIdForDispatch(item)
    const current = shipmentStatusOrPlanned(row.shipmentStatus)
    const chain = buildShipmentAdvanceChain(current, SHIPMENT_OPERATION_STATUS.DISPATCHED)
    await applyShipmentStatusAdvance(patchShipmentStatus, item.orderId, shipmentId, {
      status: SHIPMENT_OPERATION_STATUS.DISPATCHED,
      advanceChain: chain,
    })
    await refreshOrders()
  }

  /** @param {ShipmentPlannedTableRow} row */
  function handleDeliver(row) {
    setDeliveryTarget(row)
  }

  /** @param {{ deliveredBy: string, vehicle: string, deliveredAt: string, note?: string, customerConfirmNote?: string }} payload */
  async function handleConfirmDelivery(payload) {
    if (!deliveryTarget) return
    const item = agendaById.get(deliveryTarget.id)
    if (!item?.shipmentId) return
    await patchShipmentStatus(item.orderId, item.shipmentId, {
      status: SHIPMENT_OPERATION_STATUS.DELIVERED,
      deliveredBy: payload.deliveredBy,
      vehicle: payload.vehicle,
      deliveredAt: payload.deliveredAt,
      ...(payload.note ? { deliveryNote: payload.note } : {}),
      ...(payload.customerConfirmNote ? { customerConfirmNote: payload.customerConfirmNote } : {}),
    })
    setDeliveryTarget(null)
    await refreshOrders()
  }

  /** @param {{ deliveredBy: string, vehicle: string, deliveredAt: string, note?: string, customerConfirmNote?: string }} payload */
  async function handleConfirmQueueDelivery(payload) {
    if (!queueConfirmTarget?.planId) return
    await confirmPlanDelivery(queueConfirmTarget.planId, {
      deliveredBy: payload.deliveredBy,
      vehicle: payload.vehicle,
      deliveredAt: payload.deliveredAt,
      ...(payload.note ? { deliveryNote: payload.note } : {}),
      ...(payload.customerConfirmNote ? { customerConfirmNote: payload.customerConfirmNote } : {}),
    })
    setQueueConfirmTarget(null)
    await refreshPlans()
    await refreshOrders()
  }

  /** @param {{ reason: string, note?: string }} payload */
  async function handleFailQueueDelivery(payload) {
    if (!failTarget?.planId) return
    await failPlanDelivery(failTarget.planId, payload)
    setFailTarget(null)
    await refreshPlans()
    await refreshOrders()
  }

  /** @param {{ newDate: string, note?: string }} payload */
  async function handlePostponeQueueDelivery(payload) {
    if (!postponeTarget?.planId) return
    await postponePlanDelivery(postponeTarget.planId, payload)
    setPostponeTarget(null)
    await refreshPlans()
    await refreshOrders()
  }

  /** @param {ShipmentPlannedTableRow} row */
  function planRow(row) {
    const item = agendaById.get(row.id)
    if (item) setPlanItem(item)
  }

  /** @param {ShipmentPlannedTableRow} row */
  function handlePhoneDeliver(row) {
    if (row.canConfirmDelivery) {
      setQueueConfirmTarget(row)
      return
    }
    if (row.canDeliver) {
      handleDeliver(row)
    }
  }

  /** @param {ShipmentHorizonId} horizon */
  function selectHorizon(horizon) {
    setAgendaHorizon(horizon)
    if (horizon === 'today') setSelectedDate(todayIso)
    else if (horizon === 'tomorrow') setSelectedDate(addDays(todayIso, 1))
  }

  /** @param {string} dateIso */
  function selectCalendarDate(dateIso) {
    setSelectedDate(dateIso)
    if (dateIso === todayIso) setAgendaHorizon('today')
    else if (dateIso === addDays(todayIso, 1)) setAgendaHorizon('tomorrow')
    else if (dateIso >= todayIso && dateIso <= addDays(todayIso, 6)) setAgendaHorizon('week')
    else if (dateIso > addDays(todayIso, 6)) setAgendaHorizon('future')
    else setAgendaHorizon('all')
  }

  const horizonEmptyMessage = confirmationMode
    ? 'Teslim onayı bekleyen sevk kaydı yok.'
    : agendaHorizon === 'today'
      ? 'Bugün için planlı sevk kaydı yok.'
      : agendaHorizon === 'tomorrow'
        ? 'Yarın için planlı sevk kaydı yok.'
        : agendaHorizon === 'week'
          ? 'Bu hafta için planlı sevk kaydı yok.'
          : agendaHorizon === 'future'
            ? 'Gelecek dönem için planlı sevk kaydı yok.'
            : 'Planlı sevk kaydı yok.'

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--shipment">
      <PageRefreshBar
        title="Sevk verilerini yenile"
        onRefresh={async () => {
          await Promise.all([refreshOrders(), refreshPlans()])
          setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
          toastSuccess('Sevk operasyonu yenilendi')
        }}
        refreshing={mutating}
        updatedAt={lastRefresh}
      />
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Sevk Operasyonu</h1>
          <span className="mos-erp-ops__sub">
            Tüm planlı sevkler · {tableRows.length} kayıt
          </span>
        </div>
        <div className="mos-erp-ops__head-actions">
          <PilotScopeToggle
            scope={scope}
            onScopeChange={setScope}
            canToggle={canToggle}
            hint={modeHint}
          />
          {view.vehiclePlan?.[0]?.vehicle ? (
            <button
              type="button"
              className={erpOpsButtonClass('Sevk fişi')}
              onClick={() => setDispatchSheetVehicle(view.vehiclePlan[0].vehicle)}
            >
              Sevk fişi
            </button>
          ) : null}
        </div>
      </header>

      <SectionErrorBoundary label="Sevk özeti">
      <ErpOpsSummaryStrip
        metrics={horizonMetrics}
        ariaLabel="Sevk planı KPI ve filtre"
        activeMetricId={agendaHorizon}
        summaryClassName="mos-erp-summary--cols-5 mos-erp-summary--horizon"
        onMetricClick={(id) => selectHorizon(/** @type {ShipmentHorizonId} */ (id))}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Sevk listesi">
      {isPhone ? (
        <div className="ship-ops-mobile">
          <MobileStoreChipBar
            items={mobileShipmentChips}
            activeId={mobileShipmentChip}
            onSelect={handleMobileShipmentChip}
            ariaLabel="Sevk hızlı filtreler"
          />
          <ErpOpsWeekFilters
            todayIso={todayIso}
            selectedDate={selectedDate}
            weekDays={view.weekDays}
            onSelectDate={selectCalendarDate}
          />
          {displayedTableRows.length === 0 ? (
            <MobileStoreEmptyState
              context="shipment"
              onPrimary={() => {
                const item = filteredAgenda[0]
                if (item) setPlanItem(item)
              }}
              onSecondary={() => selectHorizon('all')}
            />
          ) : (
            <div className="ship-ops-mobile__cards" aria-label="Sevk kart listesi">
              {displayedTableRows.map((row) => {
                const item = agendaById.get(row.id)
                if (!item) return null
                const dto = item ? dtoById.get(item.orderId) : undefined
                const order = item ? orderById.get(item.orderId) : undefined
                const plan = item ? plansByOrderId.get(item.orderId) : undefined
                const stopDetail = buildShipmentStopDetailModel({ item, order, listItemDto: dto, plan })
                const installLabel = labelFor(
                  INSTALLATION_STATE_LABELS,
                  dto?.operationalState?.installationState ?? 'NOT_REQUIRED',
                )
                const riskText = item?.riskLabel ?? 'Normal'
                const riskTone = riskText.toLowerCase().includes('normal')
                  ? 'success'
                  : riskText.toLowerCase().includes('kritik') || riskText.toLowerCase().includes('eksik')
                    ? 'critical'
                    : 'warning'
                return (
                  <details
                    key={row.id}
                    className={`ship-ops-mobile__card${selectedRow?.id === row.id ? ' is-active' : ''}`}
                    open={selectedRow?.id === row.id}
                    onToggle={(event) => {
                      const target = /** @type {HTMLDetailsElement} */ (event.currentTarget)
                      if (target.open) setSelectedRowId(row.id)
                    }}
                  >
                    <summary className="ship-ops-mobile__summary" onClick={() => setSelectedRowId(row.id)}>
                      <div className="ship-ops-mobile__card-head">
                        <div>
                          <p className="ship-ops-mobile__card-customer">{row.customer}</p>
                          <span className="ship-ops-mobile__card-order">{row.orderNumber}</span>
                        </div>
                        <div className="ship-ops-mobile__head-right">
                          <strong className="ship-ops-mobile__date-emphasis">{row.plannedDateLabel}</strong>
                          <span className="ship-ops-mobile__pill">{row.statusLabel}</span>
                        </div>
                      </div>
                    </summary>
                    <div className="ship-ops-mobile__rows">
                      <div className="ship-ops-mobile__row">
                        <span>Teslim tarihi</span>
                        <strong>{row.plannedDateLabel}</strong>
                      </div>
                      <div className="ship-ops-mobile__row">
                        <span>Rota</span>
                        <strong>{row.region} · {row.vehicleLabel}</strong>
                      </div>
                      <div className="ship-ops-mobile__row">
                        <span>Montaj durumu</span>
                        <strong>{installLabel}</strong>
                      </div>
                      <div className="ship-ops-mobile__row">
                        <span>Risk / uyarı</span>
                        <strong data-tone={riskTone}>{riskText}</strong>
                      </div>
                      <div className="ship-ops-mobile__row">
                        <span>Adres</span>
                        {stopDetail.mapsHref ? (
                          <a
                            className="ship-ops-mobile__link"
                            href={stopDetail.mapsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {stopDetail.address}
                          </a>
                        ) : (
                          <strong>{stopDetail.address}</strong>
                        )}
                      </div>
                      <div className="ship-ops-mobile__row">
                        <span>Telefon</span>
                        {stopDetail.phoneDialHref ? (
                          <a
                            className="ship-ops-mobile__link"
                            href={stopDetail.phoneDialHref}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {stopDetail.phone}
                          </a>
                        ) : (
                          <strong>{stopDetail.phone}</strong>
                        )}
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          )}

          {selectedRow ? (
            (() => {
              const item = agendaById.get(selectedRow.id)
              if (!item) return null
              const detail = buildShipmentStopDetailModel({
                item,
                order: orderById.get(item.orderId),
                listItemDto: dtoById.get(item.orderId),
                plan: plansByOrderId.get(item.orderId),
              })
              return (
                <footer className="ship-ops-mobile__footer" aria-label="Sevk hızlı aksiyonlar">
                  {detail.mapsHref ? (
                    <a
                      className="ship-ops-mobile__action"
                      href={detail.mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Navigasyon
                    </a>
                  ) : (
                    <button type="button" className="ship-ops-mobile__action" disabled>
                      Navigasyon
                    </button>
                  )}

                  {detail.phoneDialHref ? (
                    <a className="ship-ops-mobile__action" href={detail.phoneDialHref}>
                      Ara
                    </a>
                  ) : (
                    <button type="button" className="ship-ops-mobile__action" disabled>
                      Ara
                    </button>
                  )}

                  <button
                    type="button"
                    className="ship-ops-mobile__action ship-ops-mobile__action--primary"
                    disabled={!selectedRow.canDeliver && !selectedRow.canConfirmDelivery}
                    onClick={() => handlePhoneDeliver(selectedRow)}
                  >
                    Teslim Et
                  </button>

                  <button
                    type="button"
                    className="ship-ops-mobile__action"
                    onClick={() => {
                      if (onOpenOrder) openOrderDrawerFromAgenda(item.orderId)
                      else handleOpenAgendaItem(item)
                    }}
                  >
                    Eksik Parça
                  </button>

                  <button
                    type="button"
                    className="ship-ops-mobile__action"
                    onClick={() => handleOpenAgendaItem(item)}
                  >
                    Fotoğraf
                  </button>
                </footer>
              )
            })()
          ) : null}
        </div>
      ) : (
      <div className="mos-erp-ops__workspace">
        {isTouchStore ? (
          <div className="mos-store-ops-mobile-only mos-erp-ops__mobile-bar">
            <MobileStoreChipBar
              items={mobileShipmentChips}
              activeId={mobileShipmentChip}
              onSelect={handleMobileShipmentChip}
              ariaLabel="Sevk hızlı filtreler"
            />
          </div>
        ) : null}

        <aside className="mos-erp-filters" aria-label="Sevk filtreleri">
          <ErpOpsWeekFilters
            todayIso={todayIso}
            selectedDate={selectedDate}
            weekDays={view.weekDays}
            onSelectDate={selectCalendarDate}
          />
          <ErpOpsLeftFilters
            embedded
            groups={[
              { title: 'Planlı sevkler', options: SHIPMENT_HORIZON_LEFT_FILTERS },
              { title: 'Teslim onayı', options: [SHIPMENT_CONFIRMATION_FILTER] },
            ]}
            activeFilter={agendaHorizon}
            filterCounts={horizonFilterCounts}
            onFilterChange={(id) => selectHorizon(/** @type {ShipmentHorizonId} */ (id))}
          />
        </aside>

        <div className="mos-erp-ops__main">
          <ErpOpsDetailStrip
            row={selectedDetailRow}
            actionLabel={onOpenOrder ? 'Sipariş' : 'Detay'}
            onOpen={() => {
              if (!selectedDetailRow) return
              const item = agendaById.get(selectedDetailRow.id)
              if (item && onOpenOrder) openOrderDrawerFromAgenda(item.orderId)
              else if (selectedRow) openRow(selectedRow)
            }}
          />

          <section className="mos-erp-ops__table-panel" aria-label="Planlı sevk listesi">
            {isTouchStore && displayedTableRows.length === 0 ? (
              <MobileStoreEmptyState
                context="shipment"
                onPrimary={() => {
                  const item = filteredAgenda[0]
                  if (item) setPlanItem(item)
                }}
                onSecondary={() => selectHorizon('all')}
              />
            ) : (
            <ShipmentOpsPlannedTable
              rows={displayedTableRows}
              selectedRowId={selectedRow?.id ?? null}
              mutating={mutating}
              mode={confirmationMode ? 'confirmation' : 'default'}
              onSelectRow={(row) => setSelectedRowId(row.id)}
              onOpenRow={(row) => planRow(row)}
              onDispatch={(row) => void handleDispatch(row)}
              onDeliver={handleDeliver}
              onConfirmDelivery={setQueueConfirmTarget}
              onFailDelivery={setFailTarget}
              onPostponeDelivery={setPostponeTarget}
              emptyMessage={horizonEmptyMessage}
            />
            )}
          </section>
        </div>
      </div>
      )}
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Sevk modalleri">
      {planItem && planModalInitial ? (
        isPhone ? (
          <ShipmentOpsMobilePlanSheet
            open
            item={planItem}
            initialPlan={planModalInitial}
            allPlans={plans}
            order={orderById.get(planItem.orderId)}
            listItemDto={listItemDtos.find((d) => d.id === planItem.orderId)}
            onSave={handleSavePlan}
            onClose={() => setPlanItem(null)}
          />
        ) : (
          <ShipmentPlanningCenterModal
            item={planItem}
            initialPlan={planModalInitial}
            allPlans={plans}
            order={orderById.get(planItem.orderId)}
            listItemDto={listItemDtos.find((d) => d.id === planItem.orderId)}
            onSave={handleSavePlan}
            onClose={() => setPlanItem(null)}
          />
        )
      ) : null}

      {dispatchSheetVehicle ? (
        <ShipmentDispatchSheetPrint
          open
          vehicle={dispatchSheetVehicle}
          selectedDate={selectedDate}
          agendaItems={view.agendaItems}
          orders={orders}
          listItemDtos={listItemDtos}
          plansByOrderId={plansByOrderId}
          onClose={() => setDispatchSheetVehicle(null)}
        />
      ) : null}

      <ShipmentStopDetailPanel
        open={Boolean(stopDetailItem)}
        item={stopDetailItem}
        order={stopDetailItem ? orderById.get(stopDetailItem.orderId) : undefined}
        listItemDto={stopDetailItem ? dtoById.get(stopDetailItem.orderId) : undefined}
        plan={stopDetailItem ? plansByOrderId.get(stopDetailItem.orderId) : undefined}
        onClose={() => setStopDetailItem(null)}
      />

      {deliveryTarget ? (
        <ShipmentDeliveryConfirmModal
          open
          customerName={deliveryTarget.customer}
          orderNumber={deliveryTarget.orderNumber}
          defaultVehicle={deliveryTarget.defaultVehicle ?? ''}
          defaultPersonnel={deliveryTarget.defaultCrew ?? ''}
          defaultDate={agendaById.get(deliveryTarget.id)?.dateIso ?? selectedDate}
          defaultTime={agendaById.get(deliveryTarget.id)?.timeLabel !== '—' ? agendaById.get(deliveryTarget.id)?.timeLabel : ''}
          mutating={mutating}
          onClose={() => setDeliveryTarget(null)}
          onConfirm={handleConfirmDelivery}
        />
      ) : null}

      {queueConfirmTarget ? (
        <ShipmentDeliveryConfirmModal
          open
          customerName={queueConfirmTarget.customer}
          orderNumber={queueConfirmTarget.orderNumber}
          defaultVehicle={queueConfirmTarget.defaultVehicle ?? ''}
          defaultPersonnel={queueConfirmTarget.defaultCrew ?? ''}
          defaultDate={agendaById.get(queueConfirmTarget.id)?.dateIso ?? selectedDate}
          defaultTime={
            agendaById.get(queueConfirmTarget.id)?.timeLabel !== '—'
              ? agendaById.get(queueConfirmTarget.id)?.timeLabel
              : ''
          }
          mutating={mutating}
          onClose={() => setQueueConfirmTarget(null)}
          onConfirm={handleConfirmQueueDelivery}
        />
      ) : null}

      {failTarget ? (
        <ShipmentDeliveryFailModal
          open
          customerName={failTarget.customer}
          orderNumber={failTarget.orderNumber}
          mutating={mutating}
          onClose={() => setFailTarget(null)}
          onConfirm={handleFailQueueDelivery}
        />
      ) : null}

      {postponeTarget ? (
        <ShipmentDeliveryPostponeModal
          open
          customerName={postponeTarget.customer}
          orderNumber={postponeTarget.orderNumber}
          defaultDate={todayIso}
          mutating={mutating}
          onClose={() => setPostponeTarget(null)}
          onConfirm={handlePostponeQueueDelivery}
        />
      ) : null}
      </SectionErrorBoundary>
    </div>
  )
}

export default memo(ShipmentOperationsPage)
