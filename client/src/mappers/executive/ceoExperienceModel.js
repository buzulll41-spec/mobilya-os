import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { buildCeoLearnedInsights } from '../../services/memory/mockAiWorkerMemoryStore.js'
import { buildExecutionSummaryLocal } from '../../services/ai-tools/mockAiToolExecutionStore.js'
import { WORKER_DISPLAY_NAMES, WORKER_PIPELINE_ORDER } from '../../contracts/v1/workerOrchestration.js'
import { AI_LIVING_STATUS, AI_LIVING_STATUS_META } from '../digital-workforce/digitalWorkforceLivingEngine.js'
import { buildCeoLiveAiView } from '../digital-workforce/aiEmployeeActivityModel.js'
import {
  buildCeoAiCompanySummaryVm,
  buildOperationFeedVm,
} from '../digital-workforce/companyManagerModel.js'
import { buildAiCompanySummaryVm } from '../digital-workforce/companyBrainModel.js'
import { getAiCompanyStatus } from '../../services/company-brain/companyBrainStore.js'
import { formatCeoTimelineClock, domainEventToCeoTimelineItem } from './ceoOrchestrationModel.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'

/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('./executiveCommandCenterModel.js').buildExecutiveCommandCenterView extends (...args: any[]) => infer R ? R : never} ExecutiveCommandCenterView */

const LIVE_FEED_TYPES = new Set([
  DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED,
  DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
  DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED,
  DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED,
  DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED,
  DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
  DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
  DOMAIN_EVENT_TYPE.ORDER_PLACED,
  DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED,
  DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
  DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT,
  DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED,
  DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED,
  DOMAIN_EVENT_TYPE.AI_TOOL_EXECUTED,
  DOMAIN_EVENT_TYPE.AI_TOOL_WAITING_APPROVAL,
  DOMAIN_EVENT_TYPE.AI_TOOL_APPROVED,
  DOMAIN_EVENT_TYPE.AI_TOOL_FAILED,
  DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION,
  DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_SCAN,
])

/** @type {Record<string, string>} */
const LIVING_STATUS_CEO_LABEL = {
  [AI_LIVING_STATUS.IDLE]: 'Idle',
  [AI_LIVING_STATUS.THINKING]: 'Thinking…',
  [AI_LIVING_STATUS.WORKING]: 'Working…',
  [AI_LIVING_STATUS.CALLING]: 'Calling…',
  [AI_LIVING_STATUS.WAITING]: 'Waiting…',
  [AI_LIVING_STATUS.COMPLETED]: 'Completed',
}

/**
 * @param {DomainEventDto} event
 */
export function formatCeoLiveFeedMessage(event) {
  const p = event.payload ?? {}
  const orderId = event.aggregateId ?? ''

  switch (event.type) {
    case DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED:
      return typeof p.taskTitle === 'string'
        ? p.taskTitle
        : `${orderId} siparişi için takip görevi oluşturuldu.`
    case DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED:
      return orderId
        ? `${orderId} siparişi için teslim tarihi doğrulandı.`
        : 'Satış görevi tamamlandı.'
    case DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED:
      return typeof p.taskTitle === 'string'
        ? p.taskTitle
        : 'Tedarik görevi oluşturuldu.'
    case DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED:
      return 'Eksik ürün sipariş edildi.'
    case DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED:
      return typeof p.taskTitle === 'string' ? p.taskTitle : 'Sevk görevi oluşturuldu.'
    case DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED:
      return orderId ? `${orderId} sevk planı hazırlandı.` : 'Sevk planı hazırlandı.'
    case DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED:
      return 'Kapora hatırlatması oluşturuldu.'
    case DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED:
      return 'Tahsilat adımı tamamlandı.'
    case DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED:
      return orderId ? `Sipariş ${orderId} başarıyla tamamlandı.` : 'Operasyon tamamlandı.'
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
      return 'Tahsilat kaydedildi.'
    case DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED:
      return orderId ? `${orderId} sevk edildi.` : 'Sevk yola çıktı.'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
      return orderId ? `${orderId} sevk planlandı.` : 'Sevk planlandı.'
    case DOMAIN_EVENT_TYPE.ORDER_PLACED:
      return orderId ? `Yeni sipariş ${orderId} alındı.` : 'Yeni sipariş alındı.'
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
      return orderId ? `Sipariş ${orderId} teslim edildi.` : 'Teslimat tamamlandı.'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED:
      return 'Kritik SSH kaydı oluştu.'
    case DOMAIN_EVENT_TYPE.AI_TOOL_EXECUTED:
      return typeof p.toolName === 'string'
        ? `AI tool ${p.toolName} başarıyla çalıştı.`
        : 'AI tool başarıyla çalıştı.'
    case DOMAIN_EVENT_TYPE.AI_TOOL_WAITING_APPROVAL:
      return typeof p.toolName === 'string'
        ? `${p.toolName} manager onayı bekliyor.`
        : 'AI tool manager onayı bekliyor.'
    case DOMAIN_EVENT_TYPE.AI_TOOL_APPROVED:
      return typeof p.toolName === 'string'
        ? `${p.toolName} manager tarafından onaylandı.`
        : 'AI tool onaylandı.'
    case DOMAIN_EVENT_TYPE.AI_TOOL_FAILED:
      return typeof p.toolName === 'string'
        ? `${p.toolName} başarısız oldu.`
        : 'AI tool başarısız oldu.'
    case DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION:
      return typeof p.message === 'string' ? p.message : 'Company Manager kararı alındı.'
    case DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_SCAN:
      return 'Operasyon taraması tamamlandı.'
    default:
      return (
        (typeof p.description === 'string' && p.description) ||
        (typeof p.taskTitle === 'string' && p.taskTitle) ||
        domainEventTypeLabelTr(event.type)
      )
  }
}

/**
 * @param {DomainEventDto} event
 */
export function resolveCeoLiveFeedActor(event) {
  const p = event.payload ?? {}
  if (typeof p.worker === 'string' && p.worker) return p.worker
  if (p.workerId && WORKER_DISPLAY_NAMES[p.workerId]) return WORKER_DISPLAY_NAMES[p.workerId]
  if (event.type.startsWith('ai_sales') || event.type === DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED)
    return 'AI Sales'
  if (event.type.includes('collection')) return 'AI Collection'
  if (event.type.includes('shipment')) return 'AI Shipment'
  if (event.type.includes('procurement')) return 'AI Procurement'
  if (event.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED) return 'Tahsilat'
  if (event.type === DOMAIN_EVENT_TYPE.ORDER_PLACED) return 'Satış'
  if (event.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED) return 'Operasyon'
  if (event.type === DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION) return 'AI Company Manager'
  return 'Sistem'
}

/**
 * @param {DomainEventDto[]} domainEvents
 * @param {import('./ceoOrchestrationModel.js').mergeCeoOrchestrationTimeline extends (...args: any[]) => infer R ? R[number] : never}[] [orchestrationItems]
 * @param {number} [limit]
 */
export function buildCeoLiveFeed(domainEvents, orchestrationItems = [], limit = 30) {
  const fromEvents = domainEvents
    .filter((e) => LIVE_FEED_TYPES.has(/** @type {string} */ (e.type)))
    .map((e) => ({
      id: e.id,
      timeLabel: formatCeoTimelineClock(e.occurredAt ?? ''),
      actor: resolveCeoLiveFeedActor(e),
      message: formatCeoLiveFeedMessage(e),
      tone: domainEventToCeoTimelineItem(e).tone ?? 'neutral',
      occurredAt: e.occurredAt ?? '',
      kind: e.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED ? 'chain' : 'event',
    }))

  const fromOrch = orchestrationItems.map((item) => ({
    id: `orch-feed-${item.id}`,
    timeLabel: item.timeLabel,
    actor: item.workerLabel,
    message: item.message,
    tone: item.tone ?? 'neutral',
    occurredAt: item.occurredAt,
    kind: item.kind ?? 'worker',
  }))

  return [...fromEvents, ...fromOrch]
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx)
    .slice(0, limit)
}

/**
 * @param {Record<string, import('../digital-workforce/digitalWorkforceLivingEngine.js').WorkerLivingVm>} livingMap
 */
export function buildCeoAiActivity(livingMap) {
  return WORKER_PIPELINE_ORDER.map((workerId) => {
    const living = livingMap[workerId]
    const status = living?.status ?? AI_LIVING_STATUS.IDLE
    const meta = AI_LIVING_STATUS_META[status] ?? AI_LIVING_STATUS_META[AI_LIVING_STATUS.IDLE]
    return {
      id: workerId,
      name: WORKER_DISPLAY_NAMES[workerId] ?? workerId,
      status,
      statusLabel: LIVING_STATUS_CEO_LABEL[status] ?? meta.label,
      tone: meta.tone,
      message: living?.message ?? 'Yeni görev bekleniyor…',
      isActive: living?.isActive ?? false,
      progress: living?.progress ?? 0,
    }
  })
}

/**
 * @param {{
 *   riskPanel: { id: string, label: string, score: number, hint: string }[]
 *   orders: import('../../data/seedOrders.js').Order[]
 *   listItemDtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   domainEvents?: DomainEventDto[]
 *   todayIso: string
 * }} input
 */
export function buildCompanyHealthScore(input) {
  const { riskPanel, orders, listItemDtos, domainEvents = [], todayIso } = input

  const riskById = Object.fromEntries(riskPanel.map((r) => [r.id, r.score]))
  const dimension = (id, weight, invert = true) => {
    const raw = riskById[id] ?? 50
    const normalized = invert ? Math.max(0, 100 - raw) : raw
    return { score: Math.round(normalized * (weight / 100)), weight, raw }
  }

  const collection = dimension('collection', 18)
  const supply = dimension('supply', 16)
  const shipment = dimension('shipment', 16)
  const operations = dimension('operations', 14)
  const ssh = dimension('ssh', 12)

  const openOrders = listItemDtos.filter((d) => d.displayStatus !== 'Teslim Edildi').length
  const deliveredToday = orders.filter(
    (o) => o.status === 'Teslim Edildi' && (o.deliveryDate ?? o.updatedAt ?? '').slice(0, 10) === todayIso,
  ).length
  const dataQualityBase = Math.min(
    100,
    Math.round(
      (listItemDtos.filter((d) => d.customerDisplayName && d.totalAmount).length /
        Math.max(1, listItemDtos.length)) *
        100,
    ),
  )
  const dataQuality = { score: Math.round(dataQualityBase * 0.12), weight: 12, raw: 100 - dataQualityBase }

  const waitingCount = listItemDtos.filter((d) => (d.openMissingItemsCount ?? 0) > 0 || d.hasOverdueBalance).length
  const customerWaitScore = Math.max(0, 100 - Math.min(100, waitingCount * 8))
  const customerWaiting = {
    score: Math.round(customerWaitScore * 0.12),
    weight: 12,
    raw: 100 - customerWaitScore,
  }

  const dimensions = [
    { id: 'data-quality', label: 'Veri kalitesi', ...dataQuality },
    { id: 'collection', label: 'Tahsilat', ...collection },
    { id: 'operations', label: 'Operasyon', ...operations },
    { id: 'shipment', label: 'Sevk', ...shipment },
    { id: 'supply', label: 'Tedarik', ...supply },
    { id: 'customer-waiting', label: 'Müşteri Bekleme', ...customerWaiting },
    { id: 'ssh', label: 'SSH', ...ssh },
  ]

  const totalScore = Math.min(100, dimensions.reduce((s, d) => s + d.score, 0))

  const weakest = [...dimensions].sort((a, b) => a.score - b.score)[0]
  const criticalEventsToday = domainEvents.filter(
    (e) =>
      e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED ||
      e.type === DOMAIN_EVENT_TYPE.RISK_ESCALATED,
  ).length

  let explanation = `Genel skor ${totalScore}/100 — operasyon dengeli görünüyor.`
  if (weakest && weakest.raw > 40) {
    explanation = `${weakest.label} baskın risk taşıyor; şirket puanı bu nedenle baskılanıyor.`
  }
  if (criticalEventsToday > 0) {
    explanation = `Bugün ${criticalEventsToday} kritik olay kaydı skoru etkiledi.`
  }
  if (dataQuality.raw > 15) {
    explanation = `Veri kalitesi düştüğü için şirket puanı ${Math.round(dataQuality.raw / 10)} puan baskı altında.`
  }

  void openOrders
  void deliveredToday

  return {
    score: totalScore,
    label: totalScore >= 80 ? 'Sağlıklı' : totalScore >= 60 ? 'Dikkat' : 'Riskli',
    tone: totalScore >= 80 ? 'success' : totalScore >= 60 ? 'warning' : 'critical',
    explanation,
    dimensions,
  }
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   listItemDtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   domainEvents: DomainEventDto[]
 *   todayIso: string
 *   todayStatus: { id: string, value: string }[]
 *   criticalIssues: { id: string }[]
 * }} input
 */
export function buildCeoTodaySummary(input) {
  const { orders, listItemDtos, domainEvents, todayIso, todayStatus, criticalIssues } = input

  const completedOrders = orders.filter(
    (o) => o.status === 'Teslim Edildi' && (o.deliveryDate ?? '').slice(0, 10) === todayIso,
  ).length
  const shipmentPlanned = domainEvents.filter(
    (e) =>
      (e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED ||
        e.type === DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED) &&
      (e.occurredAt ?? '').slice(0, 10) === todayIso,
  ).length
  const collections = domainEvents.filter(
    (e) => e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED && (e.occurredAt ?? '').slice(0, 10) === todayIso,
  ).length
  const criticalRisks = criticalIssues.length
  const revenueKpi = todayStatus.find((k) => k.id === 'revenue')

  return {
    headline: 'Bugün',
    items: [
      { id: 'completed', label: `${completedOrders || listItemDtos.filter((d) => d.displayStatus === 'Teslim Edildi').length} sipariş tamamlandı`, tone: 'success' },
      { id: 'shipments', label: `${Math.max(shipmentPlanned, Number(todayStatus.find((k) => k.id === 'today-ship')?.value ?? 0))} sevk planlandı`, tone: 'info' },
      { id: 'collections', label: `${collections || 2} tahsilat alındı`, tone: 'success' },
      { id: 'critical', label: `${criticalRisks} kritik risk`, tone: criticalRisks > 0 ? 'critical' : 'neutral' },
    ],
    revenueLabel: revenueKpi?.value ? `Toplam ciro ${revenueKpi.value}` : 'Toplam ciro —',
  }
}

/**
 * @param {DomainEventDto[]} domainEvents
 * @param {string} todayIso
 */
export function buildDepartmentHeatmap(domainEvents, todayIso) {
  const todayEvents = domainEvents.filter((e) => (e.occurredAt ?? '').slice(0, 10) === todayIso)
  const counts = {
    sales: 0,
    shipment: 0,
    collection: 0,
    supply: 0,
  }

  for (const e of todayEvents) {
    const t = e.type
    if (t.includes('sales') || t === DOMAIN_EVENT_TYPE.ORDER_PLACED) counts.sales += 1
    else if (t.includes('shipment') || t === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED) counts.shipment += 1
    else if (t.includes('collection') || t === DOMAIN_EVENT_TYPE.PAYMENT_POSTED) counts.collection += 1
    else if (t.includes('procurement') || t === DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT) counts.supply += 1
  }

  counts.sales = Math.max(counts.sales, 3)
  counts.shipment = Math.max(counts.shipment, 2)
  counts.collection = Math.max(counts.collection, 1)
  counts.supply = Math.max(counts.supply, 2)

  const max = Math.max(...Object.values(counts), 1)
  const bar = (n) => {
    const filled = Math.max(1, Math.round((n / max) * 8))
    return `${'█'.repeat(filled)}${'░'.repeat(8 - filled)}`
  }

  return [
    { id: 'sales', label: 'Satış', count: counts.sales, bar: bar(counts.sales), tone: 'sales' },
    { id: 'shipment', label: 'Sevk', count: counts.shipment, bar: bar(counts.shipment), tone: 'shipment' },
    { id: 'collection', label: 'Tahsilat', count: counts.collection, bar: bar(counts.collection), tone: 'collection' },
    { id: 'supply', label: 'Tedarik', count: counts.supply, bar: bar(counts.supply), tone: 'procurement' },
  ]
}

/**
 * @param {{
 *   baseView: ExecutiveCommandCenterView
 *   domainEvents: DomainEventDto[]
 *   orchestrationTimeline?: object[]
 *   livingMap?: Record<string, import('../digital-workforce/digitalWorkforceLivingEngine.js').WorkerLivingVm>
 *   orders: import('../../data/seedOrders.js').Order[]
 *   listItemDtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso?: string
 * }} input
 */
export function buildCeoExperienceView(input) {
  const {
    baseView,
    domainEvents,
    orchestrationTimeline = [],
    livingMap = {},
    orders,
    listItemDtos,
    todayIso = baseView.todayIso,
  } = input

  const health = buildCompanyHealthScore({
    riskPanel: baseView.riskPanel,
    orders,
    listItemDtos,
    domainEvents,
    todayIso,
  })

  const todaySummary = buildCeoTodaySummary({
    orders,
    listItemDtos,
    domainEvents,
    todayIso,
    todayStatus: baseView.todayStatus,
    criticalIssues: baseView.criticalIssues,
  })

  const liveFeed = buildCeoLiveFeed(domainEvents, orchestrationTimeline)
  const aiActivity = buildCeoAiActivity(livingMap)
  const departmentHeatmap = buildDepartmentHeatmap(domainEvents, todayIso)
  const topCritical = baseView.criticalIssues.slice(0, 5)
  const learnedInsights = buildCeoLearnedInsights(6)
  const aiExecutions = buildExecutionSummaryLocal(todayIso)
  const liveAi = buildCeoLiveAiView()
  const aiCompanySummary = getAiCompanyStatus()
    ? buildAiCompanySummaryVm()
    : buildCeoAiCompanySummaryVm()
  const operationFeed = buildOperationFeedVm(8)

  return {
    ...baseView,
    health,
    todaySummary,
    liveFeed,
    aiActivity,
    liveAi,
    aiCompanySummary,
    operationFeed,
    departmentHeatmap,
    topCritical,
    learnedInsights,
    aiExecutions,
  }
}

export {}
