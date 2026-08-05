import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../state/AuthProvider.jsx'
import {
  canViewDrawerTab,
  canChangeOrderStatus,
  canEditDrawerTab,
  canPostOrderPayment,
  resolveDrawerPrimaryCta,
} from '../../constants/orderDrawerPermissions.js'
import { useOrderDrawer } from '../../state/OrderDrawerProvider.jsx'
import {
  computeGlobalOperationLocks,
  blocksShipmentPlanning,
} from '../../mappers/order/globalOperationLocks.js'
import { buildOrderDrawerHeaderModel } from '../../mappers/order/orderLifecycleProjection.js'
import OrderDrawerSummaryStrip from './drawer/OrderDrawerSummaryStrip.jsx'
import OrderDrawerLockBanner from './drawer/OrderDrawerLockBanner.jsx'
import { ORDER_STATUSES, formatTry } from '../../data/index.js'
import { DEMO_TODAY } from '../../data/constants.js'
import { SHIPMENT_DELIVERY_TYPE } from '../../constants/shipmentDeliveryTypes.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { mapDomainEventsToTimelineSteps } from '../../mappers/timeline/mapDomainEventsToTimelineSteps.js'
import { useOrders } from '../../state/useOrders.js'
import OrderPanelPaymentsTable from './panel/OrderPanelPaymentsTable.jsx'
import OrderPanelHistoryOps from './panel/OrderPanelHistoryOps.jsx'
import OrderPanelLifecycleTimeline from './panel/OrderPanelLifecycleTimeline.jsx'
import OrderPanelSshOps from './panel/OrderPanelSshOps.jsx'
import OrderPanelFinanceCard from './panel/OrderPanelFinanceCard.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { buildRiskDrawerModel } from '../../mappers/risk/riskDrawerUi.js'
import { buildCompactHorizontalStatusFlowSteps } from '../../mappers/order/orderOperationPanelModel.js'
import {
  buildPanelHeaderKpis,
  formatDueDateDaysLabel,
  ORDER_PANEL_TABS,
  resolveOrderPanelTab,
} from '../../mappers/order/orderOperationPanelModel.js'
import { buildNextAction } from '../../mappers/order/orderCommandCenterModel.js'
import { formatCustomerIdentityCompact, formatCustomerPhonesCompact } from './newOrderWizardModel.js'
import OperationCommandKpis from './command/OperationCommandKpis.jsx'
import OperationNextActionCard from './command/OperationNextActionCard.jsx'
import OrderPanelRecentMoves from './panel/OrderPanelRecentMoves.jsx'
import OrderPanelTabIcon from './panel/OrderPanelTabIcon.jsx'
import OrderCustomerErpDrawer from './panel/OrderCustomerErpDrawer.jsx'
import { IconClose } from '../../components/Icons.jsx'
import {
  buildAgendaItemFromOrder,
  buildInitialPlanFromAgendaItem,
} from '../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import { useCompactPhoneViewport, useViewportTier } from '../../hooks/useViewportTier.js'
import { buildOrderPanelProductRows } from '../../mappers/order/orderPanelProductsModel.js'
import { useShipmentPlans } from '../../hooks/useShipmentPlans.jsx'
import * as ordersClient from '../../services/ordersClient.js'
import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import { MISSING_ITEM_STATUS } from '../../contracts/v1/missingItemStatuses.js'
import { formatCrewLabel } from '../../state/shipmentPlanStore.js'
import '../../styles/order-operation-panel.css'
import { formatShortDate } from '../../utils/dates.js'
/** @typedef {import('../../data/seedOrders.js').Order} Order */

function resolveTelHref(phone) {
  const value = String(phone ?? '').trim()
  if (!value) return null
  return `tel:${value.replace(/[^\d+]/g, '')}`
}

function OrderOperationPanel(props) {
  if (!props?.order) return null
  return <OrderOperationPanelSurface {...props} />
}

export default OrderOperationPanel

function splitNoteLines(raw) {
  return String(raw ?? '')
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function diffDays(dateIso, todayIso) {
  if (!dateIso || !todayIso) return null
  const left = new Date(`${dateIso}T12:00:00`)
  const right = new Date(`${todayIso}T12:00:00`)
  if (Number.isNaN(left.getTime()) || Number.isNaN(right.getTime())) return null
  return Math.round((left.getTime() - right.getTime()) / 86400000)
}

function buildDeterministicAiSignals({ order, dto, rem, todayIso, telHref, shipmentPlan }) {
  const signals = []
  const dueDiff = diffDays(order.dueDate ?? order.shipmentDate ?? null, todayIso)
  if (rem > 0) {
    signals.push({
      id: 'collection',
      label: 'Tahsilat gerekli',
      detail: `Kalan bakiye ${formatTry(rem)}. Bu sipariş için ödeme görünür durumda.`,
      action: 'Tahsilat Al',
      href: '#/orders?tab=payments',
      tone: 'warning',
    })
  }
  if (shipmentPlan?.plannedDate) {
    signals.push({
      id: 'shipment',
      label: 'Teslimat planı',
      detail: `Plan tarihi ${formatShortDate(shipmentPlan.plannedDate)}${shipmentPlan?.vehicle ? `, araç: ${shipmentPlan.vehicle}` : ''}.`,
      action: 'Teslimatı Güncelle',
      target: 'delivery',
      tone: 'neutral',
    })
  } else {
    signals.push({
      id: 'plan',
      label: 'Teslimat planı yok',
      detail: 'Bu sipariş için sevk tarihi görünmüyor. Planlama alanına git.',
      action: 'Teslimatı Güncelle',
      target: 'delivery',
      tone: 'critical',
    })
  }
  if (dto?.openMissingItemsCount > 0) {
    signals.push({
      id: 'missing',
      label: 'Eksik parça açık',
      detail: `${dto.openMissingItemsCount} açık eksik parça var. Servis akışı takip edilmeli.`,
      action: 'İşleme Git',
      target: 'attachments',
      tone: 'warning',
    })
  }
  if (dueDiff != null && dueDiff <= 2) {
    signals.push({
      id: 'contact',
      label: 'Yakın termin',
      detail: `Termin ${dueDiff === 0 ? 'bugün' : dueDiff === 1 ? 'yarın' : `${dueDiff} gün içinde`}.`,
      action: 'Ara',
      href: telHref ?? undefined,
      tone: 'critical',
    })
  }
  signals.push({
    id: 'note',
    label: 'Not bırak',
    detail: 'Sahadan hızlı bir not ekleyerek durumu güncelle.',
    action: 'Not Ekle',
    target: 'notes',
    tone: 'neutral',
  })
  return signals.slice(0, 4)
}

function buildMobileNoteItems(order, dto, recentMoves) {
  const lines = splitNoteLines(order.notes)
  const items = []
  if (dto?.customerDisplayName) items.push(dto.customerDisplayName)
  lines.slice(0, 2).forEach((line) => items.push(line))
  recentMoves.slice(0, 1).forEach((move) => items.push(`${move.label}${move.at ? ` · ${move.at}` : ''}`))
  return items.slice(0, 3)
}

function buildAttachmentItems(order, dto, shipmentPlan) {
  return [
    { id: 'photo', label: 'Fotoğraflar', detail: order.referenceNo ? `Sipariş #${order.referenceNo}` : 'Saha kanıtı', tone: 'success' },
    { id: 'doc', label: 'Belgeler', detail: dto?.customerDisplayName ? dto.customerDisplayName : 'Müşteri evrakı', tone: 'neutral' },
    { id: 'contract', label: 'Sözleşme', detail: shipmentPlan?.plannedDate ? formatShortDate(shipmentPlan.plannedDate) : 'İmzalanmadı', tone: 'warning' },
    { id: 'measurements', label: 'Ölçü dosyaları', detail: order.product ?? 'Ürün ölçü notu', tone: 'neutral' },
  ]
}
/**
 * @param {{
 *   order: Order
 *   onClose: () => void
 *   onOpenShipmentOperation?: (orderId: string) => void
 *   onOpenContract?: (order: Order) => void
 *   onOpenOrderModal?: () => void
 *   initialActiveTab?: string
 *   drawerSource?: string | null
 *   canGoPrev?: boolean
 *   canGoNext?: boolean
 *   onGoPrev?: () => void
 *   onGoNext?: () => void
 *   queuePositionLabel?: string | null
 * }} props
 */
function OrderOperationPanelSurface({
  order,
  onClose,
  onOpenShipmentOperation,
  onOpenContract,
  onOpenOrderModal,
  initialActiveTab = 'overview',
  drawerSource = null,
  canGoPrev = false,
  canGoNext = false,
  onGoPrev,
  onGoNext,
  queuePositionLabel = null,
}) {
  const viewportTier = useViewportTier()
  const isCompactPhone = useCompactPhoneViewport()
  const isPhone = viewportTier === 'phone'
  const orderId = order?.id ?? null
  const hasOrder = Boolean(orderId)
  const { user } = useAuth()
  const { openOrderDrawer, goToNextOrderWithDtos, canGoNext: queueCanGoNext } = useOrderDrawer()
  const {
    updateOrder,
    postOrderPayment,
    postOrderMissingItem,
    patchMissingItemStatus,
    markMissingItemReadyForShipment,
    mutating,
    domainEvents,
    salesOrderListItemDtos,
    refreshOrders,
  } = useOrders()
  const { plans, plansByOrderId, upsertPlan } = useShipmentPlans()
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [sshPlanTarget, setSshPlanTarget] = useState(
    /** @type {{ id: string, title: string } | null} */ (null),
  )

  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState(/** @type {string | null} */ (null))
  const [actionsOpen, setActionsOpen] = useState(false)
  const [receivingRefresh, setReceivingRefresh] = useState(0)
  const [paymentRefresh, setPaymentRefresh] = useState(0)
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false)
  const [mobileActionSheetOpen, setMobileActionSheetOpen] = useState(false)
  const [mobileProductRows, setMobileProductRows] = useState(/** @type {ReturnType<typeof buildOrderPanelProductRows>} */ ([]))
  const [mobileProductsLoading, setMobileProductsLoading] = useState(false)
  const [mobileProductsError, setMobileProductsError] = useState(/** @type {string | null} */ (null))
  const [phoneScenarioBusy, setPhoneScenarioBusy] = useState(false)
  const [phoneScenarioCursor, setPhoneScenarioCursor] = useState(0)
  const [phoneScenarioClosed, setPhoneScenarioClosed] = useState(false)

  useEffect(() => {
    if (!orderId) return
    setCustomerDrawerOpen(false)
    setPhoneScenarioCursor(0)
    setPhoneScenarioClosed(false)
  }, [orderId])

  const listItemDto = useMemo(
    () => salesOrderListItemDtos.find((d) => d.id === orderId),
    [salesOrderListItemDtos, orderId],
  )

  useEffect(() => {
    if (!isCompactPhone) return undefined
    let cancelled = false
    setMobileProductsLoading(true)
    setMobileProductsError(null)
    Promise.all([ordersClient.getOrderLines(orderId), ordersClient.getOrderMissingItems(orderId)])
      .then(([lines, missingItems]) => {
        if (cancelled) return
        const missingLineIds = new Set(
          (Array.isArray(missingItems) ? missingItems : [])
            .map((item) => item.orderLineId ?? item.lineId)
            .filter(Boolean),
        )
        setMobileProductRows(
          buildOrderPanelProductRows(Array.isArray(lines) ? lines : [], [], missingLineIds),
        )
      })
      .catch((err) => {
        if (!cancelled) {
          setMobileProductRows([])
          setMobileProductsError(err instanceof Error ? err.message : 'Ürün kartları yüklenemedi')
        }
      })
      .finally(() => {
        if (!cancelled) setMobileProductsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isCompactPhone, orderId])

  const shipmentPlan = hasOrder ? plansByOrderId.get(orderId) : undefined
  const planAgendaItem = useMemo(() => {
    if (!hasOrder) return null
    const base = buildAgendaItemFromOrder(order, listItemDto, shipmentPlan)
    if (!sshPlanTarget) return base
    return {
      ...base,
      productSummary: `SSH / Eksik Parça Sevki — ${sshPlanTarget.title}`,
      deliveryTypeLabel: 'SSH / Eksik Parça Sevki',
    }
  }, [hasOrder, order, listItemDto, shipmentPlan, sshPlanTarget])

  const planModalInitial = useMemo(() => {
    if (!hasOrder || !planAgendaItem) return null
    const base = buildInitialPlanFromAgendaItem(planAgendaItem, shipmentPlan, undefined)
    if (!sshPlanTarget) return base
    return {
      ...base,
      deliveryType: SHIPMENT_DELIVERY_TYPE.MISSING_PART_DELIVERY,
      missingItemId: sshPlanTarget.id,
      missingItemTitle: sshPlanTarget.title,
      note: base.note || `${sshPlanTarget.title} — SSH / eksik parça sevki`,
    }
  }, [hasOrder, planAgendaItem, shipmentPlan, sshPlanTarget])

  const steps = useMemo(
    () => (hasOrder ? mapDomainEventsToTimelineSteps(order, domainEvents, DEMO_TODAY) : []),
    [hasOrder, order, domainEvents],
  )

  const riskModel = useMemo(
    () => (hasOrder ? buildRiskDrawerModel(listItemDto, order, DEMO_TODAY) : { summary: null, bullets: [] }),
    [hasOrder, listItemDto, order],
  )

  const rem = hasOrder ? remainingBalance(order) : 0
  const paidPct = hasOrder && order.amount > 0 ? Math.round(((order.amount - rem) / order.amount) * 100) : 0
  const headerKpis = useMemo(() => {
    if (!hasOrder) return []
    const dueDays = order.dueDate ? diffDays(order.dueDate, DEMO_TODAY) : null
    const overdue = typeof dueDays === 'number' ? dueDays < 0 : false
    return [
      { id: 'amount', label: 'Toplam tutar', value: formatTry(order.amount), tone: 'money', emphasis: true },
      { id: 'deposit', label: 'Kapora', value: formatTry(Math.max(order.amount - rem, 0)), tone: rem > 0 ? 'warn' : 'default', emphasis: rem > 0 },
      { id: 'balance', label: 'Kalan bakiye', value: formatTry(rem), tone: rem > 0 ? 'warn' : 'default', emphasis: rem > 0 },
      { id: 'dueDate', label: 'Teslim tarihi', value: order.dueDate ? formatShortDate(order.dueDate) : 'Plan yok', sub: order.dueDate ? formatDueDateDaysLabel(order.dueDate, DEMO_TODAY) : undefined, tone: overdue ? 'warn' : 'date', emphasis: overdue },
      { id: 'status', label: 'Sipariş durumu', value: order.status, tone: 'ops', showAsBadge: true, badgeTone: order.status === 'Teslim Edildi' ? 'success' : 'info' },
    ]
  }, [hasOrder, order, rem])
  const orderNo = listItemDto?.orderNumber ?? orderId ?? ''

  const nextAction = useMemo(() => {
    if (!hasOrder) return null
    const openMissing = (listItemDto?.openMissingItemsCount ?? 0) > 0
    if (openMissing) {
      return { title: 'Eksik parçaları kontrol et', description: `${listItemDto?.openMissingItemsCount ?? 1} açık SSH kaydı var.`, suggestion: 'Sevk öncesi açık SSH kayıtlarını kapatın.', ctaLabel: 'SSH takibini aç', tone: 'critical', action: 'tab', tabTarget: 'ssh' }
    }
    if (rem > 0) {
      return { title: 'Kapora eksik', description: `${formatTry(rem)} tahsil edilmeli.`, suggestion: 'Müşteriden tahsilatı tamamlayın.', ctaLabel: 'Tahsilat Al', tone: 'warning', action: 'payment', tabTarget: 'payments' }
    }
    if (!order.shipmentDate && order.status !== 'Teslim Edildi') {
      return { title: 'Teslimat planı yapılacak', description: 'Sevk tarihi henüz atanmadı.', suggestion: 'Tarihi ve ekibi planlayın.', ctaLabel: 'Teslimatı aç', tone: 'primary', action: 'shipment', tabTarget: 'shipment' }
    }
    return { title: 'Takip et', description: riskModel.summary ?? 'Sipariş akışı izleniyor.', suggestion: 'Durumu kontrol edin.', ctaLabel: 'Detaya git', tone: 'primary', action: 'tab', tabTarget: 'overview' }
  }, [hasOrder, listItemDto, rem, order, riskModel])

  const customerPhones = hasOrder ? formatCustomerPhonesCompact(order) : null
  const customerIdentity = hasOrder ? formatCustomerIdentityCompact(order) : null
  const addressLine = hasOrder ? order.notes?.match(/Adres:\s*([^\n]+)/i)?.[1]?.trim() ?? null : null
  const telHref = hasOrder ? resolveTelHref(order.phone ?? order.phone2 ?? null) : null
  const aiSignals = hasOrder
    ? buildDeterministicAiSignals({
        order,
        dto: listItemDto,
        rem,
        todayIso: DEMO_TODAY,
        telHref,
        shipmentPlan,
      })
    : []
  const aiPrimarySignal = aiSignals[0] ?? null
  const aiOtherSignalsCount = aiSignals.length > 1 ? aiSignals.length - 1 : 0
  const noteItems = hasOrder ? buildMobileNoteItems(order, listItemDto, []) : []
  const attachmentItems = hasOrder ? buildAttachmentItems(order, listItemDto, shipmentPlan) : []
  const statusFlowSteps = hasOrder ? buildCompactHorizontalStatusFlowSteps(listItemDto, order) : []
  const deliveryDateLabel = hasOrder
    ? shipmentPlan?.plannedDate
      ? formatShortDate(shipmentPlan.plannedDate)
      : order.shipmentDate
        ? formatShortDate(order.shipmentDate)
        : 'Planlanmadı'
    : 'Planlanmadı'
  const vehicleLabel = hasOrder ? shipmentPlan?.vehicle?.trim() || 'Araç atanmadı' : 'Araç atanmadı'
  const crewLabel = hasOrder ? (shipmentPlan ? formatCrewLabel(shipmentPlan.crew1, shipmentPlan.crew2) || 'Ekip atanmadı' : 'Ekip atanmadı') : 'Ekip atanmadı'
  const deliveryStatusLabel = hasOrder
    ? shipmentPlan?.status?.trim() || (order.status === 'Teslim Edildi' ? 'Tamamlandı' : 'Plan bekliyor')
    : 'Plan bekliyor'

  const orderDateLabel = hasOrder && order.orderDate ? formatShortDate(order.orderDate) : null
  const mobileDueDateLabel = hasOrder
    ? order.dueDate
      ? formatShortDate(order.dueDate)
      : order.shipmentDate
        ? formatShortDate(order.shipmentDate)
        : 'Planlanmadi'
    : 'Planlanmadi'

  const recentMoves = useMemo(() => {
    const formatMoveDate = (step) => {
      if (step.groupLabel) return step.groupLabel
      const raw = step.dateLabel ?? ''
      const sep = raw.indexOf(' · ')
      return sep >= 0 ? raw.slice(0, sep) : raw || '—'
    }
    const formatMoveLabel = (label) => {
      const sep = label.indexOf(' — ')
      return sep >= 0 ? label.slice(0, sep) : label
    }
    return steps
      .filter((s) => s.state === 'done')
      .slice(-3)
      .map((s) => ({
        id: s.key,
        label: formatMoveLabel(s.label),
        at: formatMoveDate(s),
      }))
  }, [steps])

  const sshCount = listItemDto?.openMissingItemsCount ?? 0

  const operationLocks = useMemo(
    () => computeGlobalOperationLocks(order, listItemDto, DEMO_TODAY),
    [order, listItemDto],
  )

  const drawerHeader = useMemo(
    () => buildOrderDrawerHeaderModel(order, listItemDto, rem, DEMO_TODAY),
    [order, listItemDto, rem],
  )

  const primaryCta = useMemo(
    () =>
      resolveDrawerPrimaryCta(
        user?.role,
        order,
        listItemDto,
        rem,
        riskModel,
        operationLocks,
        drawerSource,
      ),
    [user?.role, order, listItemDto, rem, riskModel, operationLocks, drawerSource],
  )

  const visibleTabs = useMemo(
    () => ORDER_PANEL_TABS.filter((t) => canViewDrawerTab(user?.role, /** @type {any} */ (t.id))),
    [user?.role],
  )

  const shipmentPlanBlocked = blocksShipmentPlanning(operationLocks)
  const paymentsReadOnly = !canPostOrderPayment(user?.role)

  useEffect(() => {
    setActiveTab(isCompactPhone ? 'overview' : initialActiveTab)
  }, [initialActiveTab, orderId, isCompactPhone])

  /** @param {string} tabId */
  function goToTab(tabId) {
    const resolved = resolveOrderPanelTab(tabId, undefined)
    if (!canViewDrawerTab(user?.role, /** @type {any} */ (resolved))) return
    setActiveTab(resolved)
  }

  function handlePrimaryCta() {
    if (!primaryCta.disabled) goToTab(primaryCta.tab)
  }

  async function handleStatusChange(next) {
    if (next === order.status) return
    setStatusError(null)
    setStatusSaving(true)
    try {
      await updateOrder(orderId, { status: next })
      setActionsOpen(false)
    } catch (err) {
      setStatusError(formatApiErrorMessage(err))
    } finally {
      setStatusSaving(false)
    }
  }

  function handleNextActionCta() {
    switch (nextAction.action) {
      case 'ssh':
        goToTab('ssh')
        break
      case 'payment':
        goToTab('payments')
        break
      case 'shipment':
        goToTab('shipment')
        break
      case 'status':
        setActionsOpen(true)
        break
      case 'tab':
        if (nextAction.tabTarget) goToTab(nextAction.tabTarget)
        break
      default:
        break
    }
  }

  const openMissing = (listItemDto?.openMissingItemsCount ?? 0) > 0

  const phoneScenarioSteps = useMemo(() => {
    const steps = [
      { id: 'kapora', label: 'Kapora', tab: 'payments' },
      { id: 'production', label: 'Üretim', tab: 'products' },
      { id: 'supply', label: 'Tedarik', tab: 'products' },
      { id: 'shipment', label: 'Sevk', tab: 'shipment' },
      { id: 'delivery', label: 'Teslim', tab: 'shipment' },
    ]
    if ((listItemDto?.openMissingItemsCount ?? 0) > 0) {
      steps.push({ id: 'ssh', label: 'SSH', tab: 'ssh' })
    }
    steps.push({ id: 'service', label: 'Servis', tab: 'ssh' })
    steps.push({ id: 'missing_part', label: 'Eksik Parça', tab: 'ssh' })
    steps.push({ id: 'close', label: 'Operasyonu kapat', tab: undefined })
    return steps
  }, [listItemDto])

  const phoneScenarioCurrent = phoneScenarioSteps[Math.min(phoneScenarioCursor, phoneScenarioSteps.length - 1)]

  useEffect(() => {
    if (!isPhone || !isCompactPhone) return
    if (phoneScenarioCursor <= 0) return
    if (!phoneScenarioCurrent?.tab) return
    const target = resolveOrderPanelTab(phoneScenarioCurrent.tab, undefined)
    if (target !== activeTab && canViewDrawerTab(user?.role, /** @type {any} */ (target))) {
      setActiveTab(target)
    }
  }, [isPhone, isCompactPhone, phoneScenarioCurrent, activeTab, user?.role, phoneScenarioCursor])

  function handlePanelClose() {
    if (isPhone) {
      window.location.hash = '#/operation-map'
    }
    onClose()
  }

  useEffect(() => {
    if (!isPhone || !isCompactPhone) return
    if (phoneScenarioBusy) return
    if (phoneScenarioClosed) return
    if (phoneScenarioCurrent?.id !== 'close') return
    setPhoneScenarioClosed(true)
    window.location.hash = '#/operation-map'
    onClose()
  }, [isPhone, isCompactPhone, phoneScenarioBusy, phoneScenarioClosed, phoneScenarioCurrent, onClose])

  const phoneScenarioActionLabel = useMemo(() => {
    if (!phoneScenarioCurrent) return 'Devam'
    switch (phoneScenarioCurrent.id) {
      case 'kapora':
        return 'Kaporayi kaydet'
      case 'production':
        return 'Uretime al'
      case 'supply':
        return 'Tedarigi tamamla'
      case 'shipment':
        return 'Sevki planla'
      case 'delivery':
        return 'Teslime gec'
      case 'ssh':
        return 'SSH kapat'
      case 'service':
        return 'Servis oluştur'
      case 'missing_part':
        return 'Eksik parça oluştur'
      case 'close':
        return 'Operasyonu kapat'
      default:
        return 'Devam'
    }
  }, [phoneScenarioCurrent])

  async function handlePhoneScenarioAdvance() {
    if (!phoneScenarioCurrent) return
    setPhoneScenarioBusy(true)
    try {
      switch (phoneScenarioCurrent.id) {
        case 'kapora': {
          if (rem > 0.009) {
            const depositAmount = Math.min(rem, Math.max(1_000, Math.round(order.amount * 0.1)))
            await postOrderPayment(orderId, {
              amount: depositAmount,
              method: PAYMENT_METHOD.CASH,
              note: 'Mobil operasyon tek akis kapora',
            })
            setPaymentRefresh((k) => k + 1)
          }
          goToTab('products')
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        }
        case 'production':
          await handleStatusChange('Üretimde')
          goToTab('products')
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        case 'supply':
          await handleStatusChange('Sevke Hazır')
          goToTab('shipment')
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        case 'shipment': {
          if (!shipmentPlan) {
            const autoPlan = {
              ...planModalInitial,
              plannedDate: planModalInitial.plannedDate || order.shipmentDate || order.dueDate || DEMO_TODAY,
              plannedTime: planModalInitial.plannedTime || '10:00',
              note: planModalInitial.note || 'Mobil operasyon tek akis otomatik sevk plani',
            }
            await upsertPlan(autoPlan)
            if (getApiBaseUrl()) {
              await refreshOrders()
            }
          }
          await handleStatusChange('Sevk Planlandı')
          goToTab('shipment')
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        }
        case 'delivery':
          await handleStatusChange('Teslim Edildi')
          goToTab('ssh')
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        case 'ssh': {
          const missingItems = await ordersClient.getOrderMissingItems(orderId)
          const openItems = missingItems.filter((item) => item.status !== MISSING_ITEM_STATUS.RESOLVED)
          for (const item of openItems) {
            await patchMissingItemStatus(orderId, item.id, {
              status: MISSING_ITEM_STATUS.RESOLVED,
              resolutionNote: 'Mobil operasyon tek akis SSH kapanisi',
            })
          }
          goToTab('overview')
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        }
        case 'service': {
          const openServiceItem = (listItemDto?.openMissingItemsCount ?? 0) === 0
            ? null
            : (await ordersClient.getOrderMissingItems(orderId)).find((item) => item.status !== MISSING_ITEM_STATUS.RESOLVED) ?? null
          if (openServiceItem) {
            await patchMissingItemStatus(orderId, openServiceItem.id, {
              status: MISSING_ITEM_STATUS.ORDERED,
              supplierNote: 'Servis için yönlendirildi',
            })
          }
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        }
        case 'missing_part': {
          const missingItems = await ordersClient.getOrderMissingItems(orderId)
          const target = missingItems.find((item) => item.status !== MISSING_ITEM_STATUS.RESOLVED)
          if (target) {
            await patchMissingItemStatus(orderId, target.id, {
              status: MISSING_ITEM_STATUS.ARRIVED,
              resolutionNote: 'Eksik parça süreci ilerletildi',
            })
            await markMissingItemReadyForShipment(orderId, target.id, {
              note: 'Eksik parça sevke hazır',
            })
          }
          setPhoneScenarioCursor((value) => Math.min(value + 1, phoneScenarioSteps.length - 1))
          break
        }
        case 'close':
          setPhoneScenarioClosed(true)
          window.location.hash = '#/operation-map'
          onClose()
          break
        default:
          break
      }
    } finally {
      setPhoneScenarioBusy(false)
    }
  }

  function MobileAccordionCard({ id, title, subtitle, children }) {
    const open = activeTab === id
    const panelId = `oop-mobile-card-panel-${id}`
    return (
      <section className={`oop-mobile-card${open ? ' is-open' : ''}`} aria-label={title}>
        <button
          type="button"
          className="oop-mobile-card__head"
          onClick={() => setActiveTab(open ? 'overview' : id)}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <div className="oop-mobile-card__head-copy">
            <span className="oop-mobile-card__title">{title}</span>
            {subtitle ? <span className="oop-mobile-card__sub">{subtitle}</span> : null}
          </div>
          <span className="oop-mobile-card__chev" aria-hidden>
            ▾
          </span>
        </button>
        <div id={panelId} className={`oop-mobile-card__body-wrap${open ? ' is-open' : ''}`}>
          <div className="oop-mobile-card__body">{children}</div>
        </div>
      </section>
    )
  }

  if (isCompactPhone) {
    const openMissingCount = listItemDto?.openMissingItemsCount ?? 0
    const financialLines = [
      { label: 'Toplam', value: order.amount, format: 'money' },
      { label: 'Tahsilat', value: order.amount - rem, format: 'money' },
      { label: 'Kalan', value: rem, format: 'money', accent: true },
    ]

    function scrollToMobileSection(sectionId) {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setMobileActionSheetOpen(false)
    }

    return (
      <div className="oop-root oop-root--mobile" role="presentation">
        <button type="button" className="oop-backdrop" aria-label="Kapat" onClick={handlePanelClose} />
        <aside className="oop-panel oop-panel--mobile" aria-label="Sipariş operasyon paneli" role="dialog" aria-modal="true">
          <header className="oop-mobile-head oop-mobile-head--master">
            <div className="oop-mobile-head__copy">
              <p className="oop-mobile-head__eyebrow">Sipariş Detayı</p>
              <button type="button" className="oop-mobile-head__customer" onClick={() => setCustomerDrawerOpen(true)}>
                {drawerHeader.customerName}
              </button>
              <p className="oop-mobile-head__meta">
                <span className="oop-mobile-head__order-no">{drawerHeader.orderNumber}</span>
                {queuePositionLabel ? <span>· {queuePositionLabel}</span> : null}
                <span>· {orderDateLabel ?? '—'}</span>
              </p>
              <a className="oop-mobile-head__contact" href={telHref ?? undefined}>
                {customerPhones || 'Telefon yok'}{customerIdentity ? ` · ${customerIdentity}` : ''}
              </a>
              {addressLine ? <p className="oop-mobile-head__address">{addressLine}</p> : null}
            </div>
            <div className="oop-mobile-head__actions">
              <button type="button" className="oop-mobile-head__menu-btn" onClick={() => setMobileActionSheetOpen(true)} aria-label="Diğer işlemler">
                ⋯
              </button>
              <button type="button" className="oop-close" onClick={handlePanelClose} aria-label="Kapat">
                <IconClose />
              </button>
            </div>
          </header>

          <div className="oop-mobile-body oop-mobile-body--master">
            <section className="oop-mobile-section oop-mobile-section--status" aria-label="Sipariş durumu">
              <div className="oop-mobile-status-head">
                <span className={`oop-risk-pill oop-risk-pill--${drawerHeader.riskSeverity.toLowerCase()}`}>
                  {drawerHeader.riskLabel}
                </span>
                <StatusBadge status={drawerHeader.displayStatus} />
              </div>
              <p className="oop-mobile-status-copy">{drawerHeader.milestoneLabel}</p>
              <div className="oop-mobile-critical" aria-label="Hızlı özet">
                <div className="oop-mobile-critical__item">
                  <span className="oop-mobile-critical__label">Kim?</span>
                  <strong className="oop-mobile-critical__value" title={drawerHeader.customerName}>{drawerHeader.customerName}</strong>
                </div>
                <div className="oop-mobile-critical__item">
                  <span className="oop-mobile-critical__label">Ne aldı?</span>
                  <strong className="oop-mobile-critical__value" title={order.product}>{order.product}</strong>
                </div>
                <div className="oop-mobile-critical__item oop-mobile-critical__item--accent">
                  <span className="oop-mobile-critical__label">Kalan bakiye</span>
                  <strong className="oop-mobile-critical__value oop-mobile-critical__value--numeric">{formatTry(rem)}</strong>
                </div>
              </div>
              <dl className="oop-mobile-summary-grid" aria-label="Müşteri özeti">
                <div className="oop-mobile-summary-grid__item">
                  <dt>Toplam</dt>
                  <dd>{formatTry(order.amount)}</dd>
                </div>
                <div className="oop-mobile-summary-grid__item">
                  <dt>Kapora</dt>
                  <dd>{formatTry(Math.max(order.amount - rem, 0))}</dd>
                </div>
                <div className="oop-mobile-summary-grid__item">
                  <dt>Kalan</dt>
                  <dd>{formatTry(rem)}</dd>
                </div>
                <div className="oop-mobile-summary-grid__item">
                  <dt>Teslim</dt>
                  <dd>{deliveryDateLabel}</dd>
                </div>
                <div className="oop-mobile-summary-grid__item oop-mobile-summary-grid__item--badge">
                  <dt>Durum</dt>
                  <dd>{drawerHeader.displayStatus}</dd>
                </div>
              </dl>
            </section>

            <section className="oop-mobile-section" aria-label="EVTREND AI">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">EVTREND AI</h3>
                  <p className="oop-mobile-section__sub">Bugün yapılması gereken tek iş</p>
                </div>
              </header>
              {aiPrimarySignal ? (
                <article className={`oop-mobile-ai-card is-${aiPrimarySignal.tone}`}>
                  <div>
                    <p className="oop-mobile-ai-card__label">{aiPrimarySignal.label}</p>
                    <p className="oop-mobile-ai-card__detail">{aiPrimarySignal.detail}</p>
                  </div>
                  <div className="oop-mobile-ai-card__actions">
                    {aiPrimarySignal.href ? (
                      <a className="oop-mobile-ai-card__action" href={aiPrimarySignal.href}>{aiPrimarySignal.action}</a>
                    ) : (
                      <button type="button" className="oop-mobile-ai-card__action" onClick={() => aiPrimarySignal.target ? scrollToMobileSection(`oop-mobile-${aiPrimarySignal.target}`) : null}>{aiPrimarySignal.action}</button>
                    )}
                  </div>
                </article>
              ) : null}
              {aiOtherSignalsCount > 0 ? <button type="button" className="oop-mobile-section__jump" onClick={() => scrollToMobileSection('oop-mobile-payments')}>Diğer öneriler</button> : null}
            </section>

            <section id="oop-mobile-overview" className="oop-mobile-section oop-mobile-section--status" aria-label="Sipariş akışı">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Sipariş akışı</h3>
                  <p className="oop-mobile-section__sub">Aşamayı tek bakışta gör</p>
                </div>
                <button type="button" className="oop-mobile-section__jump" onClick={() => scrollToMobileSection('oop-mobile-products')}>
                  Ürünlere atla
                </button>
              </header>
              <ol className="oop-mobile-flow" aria-label="Sipariş aşamaları">
                {statusFlowSteps.map((step, index) => (
                  <li key={step.id} className={`oop-mobile-flow__step is-${step.state}`}>
                    <span className="oop-mobile-flow__node" aria-hidden>{index + 1}</span>
                    <span className="oop-mobile-flow__label">{step.label}</span>
                    {step.hint ? <span className="oop-mobile-flow__hint">{step.hint}</span> : null}
                  </li>
                ))}
              </ol>
            </section>

            <section id="oop-mobile-products" className="oop-mobile-section" aria-label="Ürün kartları">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Ürün kartları</h3>
                  <p className="oop-mobile-section__sub">Sipariş kalemleri ve durumları</p>
                </div>
                <button type="button" className="oop-mobile-section__jump" onClick={() => scrollToMobileSection('oop-mobile-payments')}>
                  Ödemeye atla
                </button>
              </header>
              {mobileProductsLoading ? <p className="oop-mobile-empty">Ürün kartları yükleniyor...</p> : null}
              {mobileProductsError ? <p className="oop-mobile-empty oop-mobile-empty--error">{mobileProductsError}</p> : null}
              {!mobileProductsLoading && !mobileProductsError && mobileProductRows.length === 0 ? (
                <p className="oop-mobile-empty">Bu sipariş için ürün satırı bulunamadı.</p>
              ) : null}
              <div className="oop-mobile-product-list">
                {mobileProductRows.map((row) => (
                  <article key={row.id} className={`oop-mobile-product-card is-${String(row.rowTone ?? 'ready')}`}>
                    <div className="oop-mobile-product-card__head">
                      <div className="oop-mobile-product-card__copy">
                        <h4 className="oop-mobile-product-card__title">{row.title}</h4>
                        {row.configHint ? <p className="oop-mobile-product-card__config">{row.configHint}</p> : null}
                      </div>
                      <span className="oop-mobile-product-card__badge">{row.statusLabel ?? row.stageLabel ?? 'Durum yok'}</span>
                    </div>
                    <dl className="oop-mobile-product-card__meta">
                      <div>
                        <dt>Sipariş</dt>
                        <dd>{row.qtyOrdered ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Hazır</dt>
                        <dd>{row.qtyReceived ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Kalem durumu</dt>
                        <dd>{row.arrivalLabel ?? '—'}</dd>
                      </div>
                      <div>
                        <dt>Atölye</dt>
                        <dd>{row.warehouseEntryLabel ?? '—'}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section id="oop-mobile-payments" className="oop-mobile-section" aria-label="Ödeme özeti">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Ödeme</h3>
                  <p className="oop-mobile-section__sub">Tahsilat ve bakiye</p>
                </div>
              </header>
              <div className="oop-mobile-money-grid">
                {financialLines.map((line) => (
                  <div key={line.label} className={`oop-mobile-money-card${line.accent ? ' is-accent' : ''}`}>
                    <span>{line.label}</span>
                    <strong>{formatTry(line.value)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section id="oop-mobile-delivery" className="oop-mobile-section" aria-label="Teslimat durumu">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Teslimat</h3>
                  <p className="oop-mobile-section__sub">Plan, araç ve ekip bilgileri</p>
                </div>
              </header>
              <div className="oop-mobile-delivery-grid">
                <div className="oop-mobile-delivery-item">
                  <span>Plan tarihi</span>
                  <strong>{deliveryDateLabel}</strong>
                </div>
                <div className="oop-mobile-delivery-item">
                  <span>Teslimat durumu</span>
                  <strong>{deliveryStatusLabel}</strong>
                </div>
                <div className="oop-mobile-delivery-item">
                  <span>Adres</span>
                  <strong>{addressLine ?? 'Adres notu yok'}</strong>
                </div>
                <div className="oop-mobile-delivery-item">
                  <span>Personel / araç</span>
                  <strong>{crewLabel} · {vehicleLabel}</strong>
                </div>
              </div>
            </section>

            <section id="oop-mobile-ssh" className="oop-mobile-section" aria-label="Servis ve SSH">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Servis / SSH</h3>
                  <p className="oop-mobile-section__sub">Eksik parça ve servis notları</p>
                </div>
              </header>
              <p className="oop-mobile-empty">
                {openMissingCount > 0
                  ? `${openMissingCount} açık eksik parça var. Servis akışı takip edilmeli.`
                  : 'Açık servis kaydı görünmüyor.'}
              </p>
            </section>

            <section id="oop-mobile-notes" className="oop-mobile-section" aria-label="Notlar">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Notlar</h3>
                  <p className="oop-mobile-section__sub">Sahadan hızlı kayıtlar</p>
                </div>
              </header>
              {noteItems.length > 0 ? (
                <ul className="oop-mobile-note-list">
                  {noteItems.map((note) => <li key={note}>{note}</li>)}
                </ul>
              ) : (
                <p className="oop-mobile-empty">Henüz not yok.</p>
              )}
            </section>

            <section id="oop-mobile-attachments" className="oop-mobile-section" aria-label="Ekler">
              <header className="oop-mobile-section__head">
                <div>
                  <h3 className="oop-mobile-section__title">Ekler</h3>
                  <p className="oop-mobile-section__sub">Fotoğraf, belge ve sözleşme izleri</p>
                </div>
              </header>
              <div className="oop-mobile-attachment-grid">
                {attachmentItems.map((item) => (
                  <div key={item.id} className={`oop-mobile-attachment-card is-${item.tone}`}>
                    <span>{item.label}</span>
                    <strong>{item.detail}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="oop-mobile-actions oop-mobile-actions--master" aria-label="Hızlı işlemler">
            {telHref ? (
              <a className="oop-mobile-actions__btn oop-mobile-actions__btn--primary" href={telHref}>
                Ara
              </a>
            ) : (
              <button type="button" className="oop-mobile-actions__btn oop-mobile-actions__btn--primary" disabled>Ara</button>
            )}
            <button
              type="button"
              className="oop-mobile-actions__btn oop-mobile-actions__btn--secondary"
              onClick={() => setMobileActionSheetOpen((value) => !value)}
            >
              İşlem Yap
            </button>
          </footer>

          {mobileActionSheetOpen ? (
            <div className="oop-mobile-action-sheet" role="dialog" aria-label="İşlem menüsü">
              <button type="button" className="oop-mobile-action-sheet__backdrop" aria-label="Kapat" onClick={() => setMobileActionSheetOpen(false)} />
              <div className="oop-mobile-action-sheet__panel">
                {[
                  { id: 'payments', label: 'Tahsilat' },
                  { id: 'delivery', label: 'Teslimat' },
                  { id: 'ssh', label: 'Servis' },
                  { id: 'notes', label: 'Not' },
                  { id: 'attachments', label: 'Fotoğraf' },
                  { id: 'attachments', label: 'Belge' },
                ].map((item) => (
                  <button
                    key={`${item.id}-${item.label}`}
                    type="button"
                    className="oop-mobile-action-sheet__item"
                    onClick={() => scrollToMobileSection(`oop-mobile-${item.id}`)}
                  >
                    {item.label}
                  </button>
                ))}
                <button type="button" className="oop-mobile-action-sheet__item oop-mobile-action-sheet__item--ghost" onClick={() => onOpenContract?.(order)}>
                  Sözleşme
                </button>
              </div>
            </div>
          ) : null}

          <OrderCustomerErpDrawer
            open={customerDrawerOpen}
            onClose={() => setCustomerDrawerOpen(false)}
            customer={order.customer}
            order={order}
            orderNo={orderNo}
            listItemDto={listItemDto}
            phone={order.phone}
            phone2={order.phone2}
            addressLine={addressLine}
            orderDateLabel={orderDateLabel}
            onOpenOrder={(orderId) => openOrderDrawer(orderId, { source: 'orders' })}
            onOpenOrderModal={onOpenOrderModal}
          />
        </aside>
      </div>
    )
  }

  if (!hasOrder) return null

  return (
    <div className="oop-root" role="presentation">
      <button type="button" className="oop-backdrop" aria-label="Kapat" onClick={handlePanelClose} />
      <aside className="oop-panel" aria-label="Sipariş operasyon paneli" role="dialog" aria-modal="true">
        <header className="oop-head">
          <div className="oop-head__main">
            <div className="oop-head__title-row">
              <button
                type="button"
                className="oop-title oop-title--customer-link"
                onClick={() => setCustomerDrawerOpen(true)}
              >
                {drawerHeader.customerName}
              </button>
              <p className="oop-sub">
                <span className="oop-order-no">{drawerHeader.orderNumber}</span>
                <span className="oop-milestone">{drawerHeader.milestoneLabel}</span>
                <span
                  className={`oop-risk-pill oop-risk-pill--${drawerHeader.riskSeverity.toLowerCase()}`}
                >
                  {drawerHeader.riskLabel}
                </span>
                <StatusBadge status={drawerHeader.displayStatus} />
              </p>
            </div>
            <OrderDrawerSummaryStrip cells={drawerHeader.summaryCells} />
            <dl className="oop-head__meta">
              <div className="oop-head__meta-row">
                <dt>İletişim</dt>
                <dd>
                  {customerPhones || 'Telefon yok'}
                  {customerIdentity ? (
                    <>
                      {' · '}
                      <span className="oop-customer-id">{customerIdentity}</span>
                    </>
                  ) : null}
                </dd>
              </div>
              {queuePositionLabel ? (
                <div className="oop-head__meta-row">
                  <dt>Kuyruk</dt>
                  <dd>{queuePositionLabel}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="oop-head__actions">
            <button
              type="button"
              className="oop-btn oop-btn--ghost"
              disabled={!canGoPrev}
              onClick={onGoPrev}
              title="Önceki kayıt (Alt+←)"
            >
              ← Önceki
            </button>
            <button
              type="button"
              className="oop-btn oop-btn--ghost"
              disabled={!canGoNext}
              onClick={onGoNext}
              title="Sonraki kayıt (Alt+→)"
            >
              Sonraki →
            </button>
            <button
              type="button"
              className={`oop-btn oop-btn--${primaryCta.tab === 'payments' ? 'ghost' : primaryCta.variant === 'primary' ? 'primary' : 'ghost'}${primaryCta.tab === 'payments' ? ' oop-btn--tone-payment' : ''}`}
              disabled={primaryCta.disabled}
              title={primaryCta.disabledReason}
              onClick={handlePrimaryCta}
            >
              {primaryCta.label}
            </button>
            <button
              type="button"
              className="oop-btn oop-btn--ghost oop-btn--tone-customer"
              onClick={() => setCustomerDrawerOpen(true)}
            >
              Müşteri merkezi
            </button>
            <button
              type="button"
              className="oop-btn oop-btn--ghost"
              onClick={() => onOpenContract?.(order)}
            >
              Sözleşme
            </button>
            <button
              type="button"
              className="oop-btn oop-btn--ghost"
              onClick={() => onOpenContract?.(order)}
            >
              Yazdır
            </button>
            <button
              type="button"
              className="oop-btn oop-btn--ghost"
              onClick={() => onOpenContract?.(order)}
            >
              PDF / Paylaş
            </button>
            {canChangeOrderStatus(user?.role) ? (
              <div className="oop-actions-menu">
                <button
                  type="button"
                  className="oop-btn oop-btn--ghost oop-btn--tone-ops"
                  aria-expanded={actionsOpen}
                  onClick={() => setActionsOpen((v) => !v)}
                >
                  İşlemler ▾
                </button>
                {actionsOpen ? (
                  <div className="oop-actions-dropdown" role="menu">
                    <p className="oop-actions-label">Sipariş durumu</p>
                    {ORDER_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="menuitem"
                        className={`oop-actions-item${s === order.status ? ' oop-actions-item--active' : ''}`}
                        disabled={statusSaving || mutating}
                        onClick={() => void handleStatusChange(s)}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      className="oop-actions-item"
                      disabled={statusSaving || mutating}
                      onClick={() => {
                        setActionsOpen(false)
                        handlePanelClose()
                      }}
                    >
                      Operasyonu kapat
                    </button>
                    {statusError ? (
                      <p className="oop-error oop-error--inline" role="alert">
                        {statusError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button type="button" className="oop-btn oop-btn--ghost oop-btn--close-text" onClick={handlePanelClose}>
              Kapat
            </button>
            <button type="button" className="oop-close" onClick={handlePanelClose} aria-label="Kapat">
              <IconClose />
            </button>
          </div>
        </header>

        <nav className="oop-tabs oop-tabs--pill oop-tabs--coded oop-tabs-sticky" aria-label="Sipariş detay sekmeleri">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id
            const isSshTab = tab.id === 'ssh'
            const sshSuffix =
              isSshTab && sshCount > 0 ? (
                <span className="oop-tab-badge" aria-hidden>
                  {sshCount}
                </span>
              ) : null
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`oop-tab oop-tab--${tab.id}${isActive ? ' oop-tab--active' : ''}${isSshTab && sshCount > 0 ? ' oop-tab--ssh-alert' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <OrderPanelTabIcon tabId={tab.id} />
                <span className="oop-tab__label">{tab.label}</span>
                {sshSuffix}
              </button>
            )
          })}
        </nav>

        <div className={`oop-body${activeTab === 'overview' ? ' oop-body--overview' : ''}`}>
          {isPhone ? (
            <div className="oop-ssh-banner" role="status" aria-label="Operasyon tek akış">
              <p>
                <strong>{phoneScenarioCurrent?.label}</strong> adımı aktif.
              </p>
              <button
                type="button"
                className="oop-btn oop-btn--ghost oop-btn--sm"
                disabled={phoneScenarioBusy}
                onClick={() => {
                  void handlePhoneScenarioAdvance()
                }}
              >
                {phoneScenarioBusy ? 'Calisiyor…' : phoneScenarioActionLabel}
              </button>
            </div>
          ) : null}
          <OrderDrawerLockBanner
            locks={operationLocks}
            onGoSsh={openMissing && activeTab !== 'ssh' ? () => goToTab('ssh') : undefined}
          />
          {openMissing && activeTab !== 'ssh' ? (
            <div className="oop-ssh-banner" role="status">
              <p>
                <strong>{listItemDto?.openMissingItemsCount} eksik parça</strong> açık — SSH sekmesinden
                takip edin.
              </p>
              <button
                type="button"
                className="oop-btn oop-btn--ghost oop-btn--sm"
                onClick={() => goToTab('ssh')}
              >
                SSH sekmesine git
              </button>
            </div>
          ) : null}

          {activeTab === 'overview' ? (
            <div className="oop-tab-panel oop-tab-panel--overview" role="tabpanel" aria-label="Genel Bakış">
              <OperationCommandKpis cards={headerKpis} />

              <OperationNextActionCard action={nextAction} onCta={handleNextActionCta} />

              <OrderPanelRecentMoves moves={recentMoves} onViewAll={() => goToTab('history')} />
            </div>
          ) : null}

          {activeTab === 'products' ? (
            <div className="oop-tab-panel" role="tabpanel" aria-label="Ürünler">
              <OrderPanelProductsTable
                orderId={orderId}
                customerName={order.customer ?? ''}
                orderNotes={order.notes ?? ''}
                refreshKey={receivingRefresh}
                canReceive={canEditDrawerTab(user?.role, 'products')}
                canViewIncomingLink={canViewDrawerTab(user?.role, 'products')}
                onReceivingSaved={() => {
                  setReceivingRefresh((k) => k + 1)
                  void refreshOrders()
                }}
              />
            </div>
          ) : null}

          {activeTab === 'payments' ? (
            <div className="oop-tab-panel" role="tabpanel" aria-label="Ödemeler">
              <OrderPanelPaymentsTable
                order={order}
                rem={rem}
                paidPct={paidPct}
                mutating={mutating}
                readOnly={paymentsReadOnly}
                refreshKey={paymentRefresh}
                domainEvents={domainEvents}
                showSaveAndNext={drawerSource === 'collection' && queueCanGoNext}
                onPostPayment={async (body) => {
                  await postOrderPayment(orderId, body)
                  setPaymentRefresh((k) => k + 1)
                }}
                onPaymentsChanged={() => {
                  setPaymentRefresh((k) => k + 1)
                  void refreshOrders()
                }}
                onSaveAndNext={async (body) => {
                  await postOrderPayment(orderId, body)
                  setPaymentRefresh((k) => k + 1)
                  goToNextOrderWithDtos(salesOrderListItemDtos)
                }}
              />
            </div>
          ) : null}

          {activeTab === 'shipment' ? (
            <div className="oop-tab-panel" role="tabpanel" aria-label="Sevk & Montaj">
              <OrderPanelShipmentOps
                order={order}
                listItemDto={listItemDto}
                shipmentPlan={shipmentPlan}
                rem={rem}
                planBlocked={shipmentPlanBlocked}
                planBlockedMessage={operationLocks.find((l) => l.blocks)?.message}
                onCompletePhoneDelivery={async () => {
                  await handleStatusChange('Teslim Edildi')
                  goToTab('ssh')
                }}
                onPlanClick={() => {
                  setSshPlanTarget(null)
                  setPlanModalOpen(true)
                }}
                onOpenShipmentOperation={
                  onOpenShipmentOperation ? () => onOpenShipmentOperation(orderId) : undefined
                }
              />
            </div>
          ) : null}

          {activeTab === 'ssh' ? (
            <div className="oop-tab-panel" role="tabpanel" aria-label="SSH / Eksik Parça">
              <OrderPanelSshOps
                order={order}
                listItemDto={listItemDto}
                mutating={mutating}
                domainEvents={domainEvents}
                canPlanShipment={canEditDrawerTab(user?.role, 'shipment') || canEditDrawerTab(user?.role, 'ssh')}
                onPlanShipment={(item) => {
                  setSshPlanTarget({ id: item.id, title: item.title })
                  setPlanModalOpen(true)
                }}
                onPostMissingItem={(body) => postOrderMissingItem(orderId, body)}
                onPatchMissingItemStatus={(id, body) => patchMissingItemStatus(orderId, id, body)}
                onMarkMissingItemReadyForShipment={(id, body) =>
                  markMissingItemReadyForShipment(orderId, id, body)
                }
              />
            </div>
          ) : null}

          {activeTab === 'timeline' ? (
            <div className="oop-tab-panel" role="tabpanel" aria-label="Timeline">
              <OrderPanelLifecycleTimeline
                order={order}
                listItemDto={listItemDto}
                domainEvents={domainEvents}
                todayIso={DEMO_TODAY}
                onNavigateTab={goToTab}
              />
            </div>
          ) : null}

          {activeTab === 'history' ? (
            <div className="oop-tab-panel" role="tabpanel" aria-label="İşlem Geçmişi">
              <OrderPanelHistoryOps order={order} domainEvents={domainEvents} />
            </div>
          ) : null}
        </div>

        {planModalOpen ? (
          <ShipmentPlanningCenterModal
            item={planAgendaItem}
            initialPlan={planModalInitial}
            allPlans={plans}
            order={order}
            listItemDto={listItemDto}
            onSave={async (plan) => {
              await upsertPlan(plan)
              if (getApiBaseUrl()) {
                await refreshOrders()
              }
            }}
            onClose={() => {
              setSshPlanTarget(null)
              setPlanModalOpen(false)
            }}
          />
        ) : null}

        <OrderCustomerErpDrawer
          open={customerDrawerOpen}
          onClose={() => setCustomerDrawerOpen(false)}
          customer={order.customer}
          order={order}
          orderNo={orderNo}
          listItemDto={listItemDto}
          phone={order.phone}
          phone2={order.phone2}
          addressLine={addressLine}
          orderDateLabel={orderDateLabel}
          onOpenOrder={(orderId) => openOrderDrawer(orderId, { source: 'orders' })}
          onOpenOrderModal={onOpenOrderModal}
        />
      </aside>
    </div>
  )
}
