import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { isTerminOverdue } from '../../utils/orderFinance.js'
import { FINANCIAL_STATE_LABELS, labelFor } from '../operational/operationalStateLabelsTr.js'
import { riskSeverityBadgeLabelTr } from '../risk/riskDrawerUi.js'
import { shipmentQueueCardStatusLabel } from '../shipment/shipmentOperationUx.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {'done' | 'current' | 'pending' | 'warning'} FlowStepState
 * @typedef {{ id: string, label: string, state: FlowStepState, hint?: string }} StatusFlowStep
 */

/**
 * @param {Order} order
 * @param {number} remaining
 */
export function paymentStatusLabelTr(order, remaining) {
  if (order.paid || remaining <= 0.009) return 'Ödendi'
  const paid = order.paidAmount ?? 0
  if (paid > 0.009) return 'Kısmi ödeme'
  return 'Ödenmedi'
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {Order} order
 * @returns {StatusFlowStep[]}
 */
export function buildOrderStatusFlowSteps(dto, order) {
  const op = dto?.operationalState
  const openMissing = (dto?.openMissingItemsCount ?? 0) > 0
  const paid =
    Boolean(order.paid) ||
    (dto ? Number.parseFloat(dto.amountDue?.amount ?? '999') <= 0.009 : false) ||
    (order.paidAmount ?? 0) > 0.009

  /** @param {boolean} done @param {boolean} current */
  const state = (done, current) => {
    if (current) return /** @type {const} */ ('current')
    if (done) return /** @type {const} */ ('done')
    return /** @type {const} */ ('pending')
  }

  const productionDone =
    op?.productionState === 'READY' || order.status === 'Hazır' || order.status === 'Teslim Edildi'
  const fulfillmentActive =
    (dto?.shipmentSummaryOpenCount ?? 0) > 0 ||
    (dto?.inTransitShipmentCount ?? 0) > 0 ||
    Boolean(order.shipmentDate)
  const fulfillmentDone = order.status === 'Teslim Edildi' || op?.fulfillmentState === 'DELIVERED'
  const installDone = op?.installationState === 'DONE' || order.status === 'Teslim Edildi'

  return [
    {
      id: 'placed',
      label: 'Sipariş oluşturuldu',
      state: 'done',
      hint: order.orderDate,
    },
    {
      id: 'payment',
      label: paid ? 'Ödeme alındı' : 'Ödeme bekleniyor',
      state: state(paid, !paid && !openMissing),
    },
    {
      id: 'missing',
      label: openMissing ? 'Eksik ürün bekleniyor' : 'Eksik ürün yok',
      state: openMissing ? 'warning' : state(!openMissing, false),
    },
    {
      id: 'production',
      label: productionDone ? 'Üretim hazır' : 'Üretim tamamlanacak',
      state: state(productionDone, !productionDone && paid && !openMissing),
    },
    {
      id: 'fulfillment',
      label: fulfillmentDone ? 'Sevk / teslim tamamlandı' : 'Sevk / teslim edilecek',
      state: state(
        fulfillmentDone,
        !fulfillmentDone && productionDone && (fulfillmentActive || paid),
      ),
      hint: dto
        ? shipmentQueueCardStatusLabel(undefined, {
            installationPending: dto.installationPending,
            hasShipmentIssue: dto.hasShipmentIssue,
          })
        : undefined,
    },
    {
      id: 'install',
      label: installDone ? 'Montaj tamamlandı' : 'Montaj bekleniyor',
      state: state(installDone, fulfillmentDone && !installDone),
    },
  ]
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildFinancialSummaryLines(dto, order, remaining) {
  const total = order.amount
  const paid = order.paid ? total : (order.paidAmount ?? 0)
  return [
    { label: 'Satış tutarı', value: total, format: 'money' },
    { label: 'Tahsil edilen', value: paid, format: 'money' },
    { label: 'Kalan bakiye', value: remaining, format: 'money', accent: remaining > 0.009 },
    {
      label: 'Finans durumu',
      value: dto?.operationalState
        ? labelFor(FINANCIAL_STATE_LABELS, dto.operationalState.financialState)
        : paymentStatusLabelTr(order, remaining),
      format: 'text',
    },
  ]
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {import('../risk/riskDrawerUi.js').RiskDrawerModel} riskModel
 */
export function buildRiskPriorityLines(dto, riskModel) {
  const severity = dto?.currentRiskSeverity ?? RISK_SEVERITY.NONE
  return [
    {
      label: 'Risk seviyesi',
      value: riskModel.state === 'loading' ? 'Yükleniyor…' : riskSeverityBadgeLabelTr(severity),
    },
    {
      label: 'Özet',
      value: riskModel.summary ?? 'Risk değerlendiriliyor',
    },
  ]
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function buildHighlightBullets(dto, order, riskModel) {
  /** @type {string[]} */
  const items = []
  if ((dto?.openMissingItemsCount ?? 0) > 0) {
    items.push(`${dto.openMissingItemsCount} açık eksik ürün kaydı`)
  }
  if (dto?.hasOverdueBalance) {
    items.push('Gecikmiş ödeme bakiyesi var')
  }
  if (dto?.riskSignalOverduePartialShipment) {
    items.push('Termin gecikmesi ve kısmi sevk birlikte')
  }
  if (dto?.hasShipmentIssue) {
    items.push('Sevk / montajda sorun bildirildi')
  }
  if (dto?.installationPending) {
    items.push('Montaj bekleniyor')
  }
  if (riskModel.elevated && riskModel.bullets.length) {
    items.push(riskModel.bullets[0])
  }
  if (!items.length) {
    items.push('Öne çıkan operasyon uyarısı yok')
  }
  if (order.notes?.trim()) {
    items.push('Sipariş notu mevcut')
  }
  return items.slice(0, 5)
}

/** @typedef {{ id: string, label: string }} OrderPanelTab */

/** @type {OrderPanelTab[]} */
export const ORDER_PANEL_TABS = [
  { id: 'overview', label: 'Genel Bakış' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'products', label: 'Ürünler' },
  { id: 'payments', label: 'Ödemeler' },
  { id: 'shipment', label: 'Sevk & Montaj' },
  { id: 'ssh', label: 'SSH / Eksik Parça' },
  { id: 'history', label: 'İşlem Geçmişi' },
]

/** Geriye dönük uyumluluk — overview hariç eski bölüm kimlikleri */
export const ORDER_PANEL_SECTIONS = ORDER_PANEL_TABS.filter((t) => t.id !== 'overview')

/**
 * @param {string | undefined} initialTab
 * @param {string | undefined} initialSection
 * @returns {string}
 */
export function resolveOrderPanelTab(initialTab, initialSection) {
  const raw = initialSection ?? initialTab
  if (!raw) return 'overview'
  if (raw === 'ssh') return 'ssh'
  if (raw === 'notes') return 'products'
  if (ORDER_PANEL_TABS.some((t) => t.id === raw)) return raw
  return 'overview'
}

/**
 * Dashboard yatay akış — 5 adım.
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {Order} order
 */
export function buildCompactHorizontalStatusFlowSteps(dto, order) {
  const full = buildOrderStatusFlowSteps(dto, order)
  /** @type {Record<string, (step: StatusFlowStep) => string>} */
  const labelFor = {
    placed: () => 'Sipariş oluşturuldu',
    payment: (step) => (step.state === 'done' ? 'Ödeme alındı' : 'Ödeme bekleniyor'),
    production: (step) => (step.state === 'done' ? 'Üretim tamamlandı' : 'Üretim tamamlanacak'),
    fulfillment: (step) => (step.state === 'done' ? 'Sevk tamamlandı' : 'Sevk planlandı'),
    install: (step) => (step.state === 'done' ? 'Montaj tamamlandı' : 'Montaj bekleniyor'),
  }
  const ids = ['placed', 'payment', 'production', 'fulfillment', 'install']
  return ids.map((id) => {
    const step = full.find((s) => s.id === id) ?? { id, label: id, state: /** @type {const} */ ('pending') }
    return {
      id: step.id,
      label: labelFor[id](step),
      state: step.state,
    }
  })
}

/** @typedef {import('./orderCommandCenterModel.js').CommandKpiCard} CommandKpiCard */

/**
 * @param {string} status
 * @returns {import('./orderCommandCenterModel.js').CommandKpiBadgeTone}
 */
export function orderStatusBadgeTone(status) {
  if (status === 'Hazır') return 'ready'
  if (status === 'Teslim Edildi') return 'done'
  if (status === 'Eksik Var') return 'critical'
  return 'wait'
}

/**
 * @param {string} dueDate ISO date
 * @param {string} todayIso ISO date
 */
export function formatDueDateDaysLabel(dueDate, todayIso) {
  const due = new Date(`${dueDate}T12:00:00`)
  const today = new Date(`${todayIso}T12:00:00`)
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (diff > 0) return `(+${diff} gün)`
  if (diff < 0) return `(${diff} gün)`
  return '(bugün)'
}

/**
 * Genel Bakış KPI şeridi — 4 sade metrik (V9).
 * @param {Order} order
 * @param {number} remaining
 * @param {string} todayIso
 * @returns {CommandKpiCard[]}
 */
export function buildPanelHeaderKpis(order, remaining, todayIso) {
  const overdue = isTerminOverdue(order, todayIso)

  return [
    {
      id: 'amount',
      icon: '',
      label: 'Toplam tutar',
      value: formatTry(order.amount),
      tone: 'money',
      emphasis: true,
    },
    {
      id: 'balance',
      icon: '',
      label: 'Kalan ödeme',
      value: formatTry(remaining),
      tone: remaining > 0.009 ? 'warn' : 'default',
      emphasis: remaining > 0.009,
    },
    {
      id: 'dueDate',
      icon: '',
      label: 'Teslim tarihi',
      value: order.dueDate ? formatShortDate(order.dueDate) : 'Plan yok',
      sub: order.dueDate ? formatDueDateDaysLabel(order.dueDate, todayIso) : undefined,
      tone: overdue ? 'warn' : 'date',
      emphasis: overdue,
    },
    {
      id: 'status',
      icon: '',
      label: 'Sipariş durumu',
      value: order.status,
      tone: 'ops',
      showAsBadge: true,
      badgeTone: orderStatusBadgeTone(order.status),
    },
  ]
}

/**
 * Genel bakış — sipariş özeti kartı satırları.
 * @param {Order} order
 * @param {string} orderNo
 */
export function buildOrderContactSummaryRows(order, orderNo) {
  const noteText = order.notes?.trim() ?? ''
  const address =
    noteText.match(/Adres:\s*([^\n]+)/i)?.[1]?.trim() ??
    noteText.match(/Teslimat:\s*([^\n]+)/i)?.[1]?.trim() ??
    '—'
  const contact =
    order.contactName?.trim() ||
    noteText.match(/Yetkili:\s*([^\n]+)/i)?.[1]?.trim() ||
    '—'

  return [
    { label: 'Sipariş no', value: orderNo },
    { label: 'Müşteri', value: order.customer },
    { label: 'Yetkili', value: contact },
    {
      label: 'Telefon',
      value: order.phone?.trim() || order.phone2?.trim() || '—',
    },
    { label: 'Adres', value: address },
    {
      label: 'Not',
      value: noteText ? (noteText.length > 120 ? `${noteText.slice(0, 120)}…` : noteText) : '—',
    },
  ]
}
