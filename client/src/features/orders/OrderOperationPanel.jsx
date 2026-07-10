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
import { ORDER_STATUSES } from '../../data/index.js'
import { DEMO_TODAY } from '../../data/constants.js'
import { SHIPMENT_DELIVERY_TYPE } from '../../constants/shipmentDeliveryTypes.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { mapDomainEventsToTimelineSteps } from '../../mappers/timeline/mapDomainEventsToTimelineSteps.js'
import { useOrders } from '../../state/useOrders.js'
import OrderPanelPaymentsTable from './panel/OrderPanelPaymentsTable.jsx'
import OrderPanelHistoryOps from './panel/OrderPanelHistoryOps.jsx'
import OrderPanelLifecycleTimeline from './panel/OrderPanelLifecycleTimeline.jsx'
import OrderPanelSshOps from './panel/OrderPanelSshOps.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { buildRiskDrawerModel } from '../../mappers/risk/riskDrawerUi.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import {
  buildPanelHeaderKpis,
  ORDER_PANEL_TABS,
  resolveOrderPanelTab,
} from '../../mappers/order/orderOperationPanelModel.js'
import { buildNextAction } from '../../mappers/order/orderCommandCenterModel.js'
import { formatShortDate } from '../../utils/dates.js'
import {
  formatCustomerIdentityCompact,
  formatCustomerPhonesCompact,
} from './newOrderWizardModel.js'
import OperationCommandKpis from './command/OperationCommandKpis.jsx'
import OperationNextActionCard from './command/OperationNextActionCard.jsx'
import OrderPanelProductsTable from './panel/OrderPanelProductsTable.jsx'
import OrderCustomerErpDrawer from './panel/OrderCustomerErpDrawer.jsx'
import OrderPanelTabIcon from './panel/OrderPanelTabIcon.jsx'
import OrderPanelRecentMoves from './panel/OrderPanelRecentMoves.jsx'
import OrderPanelShipmentOps from './panel/OrderPanelShipmentOps.jsx'
import { IconClose } from '../../components/Icons.jsx'
import ShipmentPlanningCenterModal from '../shipment-ops/ShipmentPlanningCenterModal.jsx'
import { useShipmentPlans } from '../../hooks/useShipmentPlans.jsx'
import {
  buildAgendaItemFromOrder,
  buildInitialPlanFromAgendaItem,
} from '../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import '../../styles/order-operation-panel.css'

/** @typedef {import('../../data/seedOrders.js').Order} Order */

/** @typedef {import('../../contracts/orderDrawer.js').OrderDrawerSource} OrderDrawerSource */

/**
 * @param {{
 *   order: Order | null
 *   open: boolean
 *   onClose: () => void
 *   onOpenShipmentOperation?: (order: Order) => void
 *   initialTab?: string
 *   initialSection?: string
 *   drawerSource?: OrderDrawerSource | null
 *   canGoPrev?: boolean
 *   canGoNext?: boolean
 *   onGoPrev?: () => void
 *   onGoNext?: () => void
 *   queuePositionLabel?: string | null
 * }} props
 */
export default function OrderOperationPanel({
  order,
  open,
  onClose,
  onOpenShipmentOperation,
  initialTab,
  initialSection,
  drawerSource = null,
  canGoPrev = false,
  canGoNext = false,
  onGoPrev,
  onGoNext,
  queuePositionLabel = null,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.altKey && e.key === 'ArrowRight' && canGoNext && onGoNext) {
        e.preventDefault()
        onGoNext()
      }
      if (e.altKey && e.key === 'ArrowLeft' && canGoPrev && onGoPrev) {
        e.preventDefault()
        onGoPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, canGoNext, canGoPrev, onGoNext, onGoPrev])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !order) return null

  const initialActiveTab = resolveOrderPanelTab(initialTab, initialSection)

  return (
    <OrderOperationPanelSurface
      key={`${order.id}-${initialActiveTab}`}
      order={order}
      onClose={onClose}
      onOpenShipmentOperation={onOpenShipmentOperation}
      initialActiveTab={initialActiveTab}
      drawerSource={drawerSource}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      onGoPrev={onGoPrev}
      onGoNext={onGoNext}
      queuePositionLabel={queuePositionLabel}
    />
  )
}

/**
 * @param {{
 *   order: Order
 *   onClose: () => void
 *   onOpenShipmentOperation?: (order: Order) => void
 *   initialActiveTab?: string
 *   drawerSource?: OrderDrawerSource | null
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
  initialActiveTab = 'overview',
  drawerSource = null,
  canGoPrev = false,
  canGoNext = false,
  onGoPrev,
  onGoNext,
  queuePositionLabel = null,
}) {
  const { user } = useAuth()
  const { goToNextOrderWithDtos, canGoNext: queueCanGoNext } = useOrderDrawer()
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

  useEffect(() => {
    setCustomerDrawerOpen(false)
  }, [order.id])

  const listItemDto = useMemo(
    () => salesOrderListItemDtos.find((d) => d.id === order.id),
    [salesOrderListItemDtos, order],
  )

  const shipmentPlan = plansByOrderId.get(order.id)
  const planAgendaItem = useMemo(() => {
    const base = buildAgendaItemFromOrder(order, listItemDto, shipmentPlan)
    if (!sshPlanTarget) return base
    return {
      ...base,
      productSummary: `SSH / Eksik Parça Sevki — ${sshPlanTarget.title}`,
      deliveryTypeLabel: 'SSH / Eksik Parça Sevki',
    }
  }, [order, listItemDto, shipmentPlan, sshPlanTarget])

  const planModalInitial = useMemo(() => {
    const base = buildInitialPlanFromAgendaItem(planAgendaItem, shipmentPlan, undefined)
    if (!sshPlanTarget) return base
    return {
      ...base,
      deliveryType: SHIPMENT_DELIVERY_TYPE.MISSING_PART_DELIVERY,
      missingItemId: sshPlanTarget.id,
      missingItemTitle: sshPlanTarget.title,
      note: base.note || `${sshPlanTarget.title} — SSH / eksik parça sevki`,
    }
  }, [planAgendaItem, shipmentPlan, sshPlanTarget])

  const steps = useMemo(
    () => mapDomainEventsToTimelineSteps(order, domainEvents, DEMO_TODAY),
    [order, domainEvents],
  )

  const riskModel = useMemo(
    () => buildRiskDrawerModel(listItemDto, order, DEMO_TODAY),
    [listItemDto, order],
  )

  const rem = remainingBalance(order)
  const paidPct = order.amount > 0 ? Math.round(((order.amount - rem) / order.amount) * 100) : 0
  const headerKpis = useMemo(() => buildPanelHeaderKpis(order, rem, DEMO_TODAY), [order, rem])
  const orderNo = listItemDto?.orderNumber ?? order.id

  const nextAction = useMemo(
    () => buildNextAction(order, listItemDto, rem, riskModel),
    [order, listItemDto, rem, riskModel],
  )

  const customerPhones = formatCustomerPhonesCompact(order)
  const customerIdentity = formatCustomerIdentityCompact(order)
  const addressLine = order.notes?.match(/Adres:\s*([^\n]+)/i)?.[1]?.trim() ?? null

  const orderDateLabel = order.orderDate ? formatShortDate(order.orderDate) : null

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
    setActiveTab(initialActiveTab)
  }, [initialActiveTab, order.id])

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
      await updateOrder(order.id, { status: next })
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

  return (
    <div className="oop-root" role="presentation">
      <button type="button" className="oop-backdrop" aria-label="Kapat" onClick={onClose} />
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
              Müşteri kartı
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
                    {statusError ? (
                      <p className="oop-error oop-error--inline" role="alert">
                        {statusError}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button type="button" className="oop-btn oop-btn--ghost oop-btn--close-text" onClick={onClose}>
              Kapat
            </button>
            <button type="button" className="oop-close" onClick={onClose} aria-label="Kapat">
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
                orderId={order.id}
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
                  await postOrderPayment(order.id, body)
                  setPaymentRefresh((k) => k + 1)
                }}
                onPaymentsChanged={() => {
                  setPaymentRefresh((k) => k + 1)
                  void refreshOrders()
                }}
                onSaveAndNext={async (body) => {
                  await postOrderPayment(order.id, body)
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
                onPlanClick={() => {
                  setSshPlanTarget(null)
                  setPlanModalOpen(true)
                }}
                onOpenShipmentOperation={
                  onOpenShipmentOperation ? () => onOpenShipmentOperation(order.id) : undefined
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
                onPostMissingItem={(body) => postOrderMissingItem(order.id, body)}
                onPatchMissingItemStatus={(id, body) => patchMissingItemStatus(order.id, id, body)}
                onMarkMissingItemReadyForShipment={(id, body) =>
                  markMissingItemReadyForShipment(order.id, id, body)
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
        />
      </aside>
    </div>
  )
}
