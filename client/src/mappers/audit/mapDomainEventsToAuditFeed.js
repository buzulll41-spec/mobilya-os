import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { auditModuleLabelTr } from '../../contracts/v1/auditModule.js'
import { extractAuditFieldsFromEvent } from '../../lib/audit/recordAuditEvent.js'
import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { shipmentStatusLabel } from '../shipment/shipmentStatusLabel.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @typedef {Object} AuditFeedItem
 * @property {string} id
 * @property {string} at ISO
 * @property {string} timeLabel
 * @property {string} title
 * @property {string} description
 * @property {string | null} actor
 * @property {string} type
 * @property {'payment' | 'shipment' | 'ssh' | 'order' | 'risk' | 'task' | 'document' | 'system' | 'supply' | 'incoming' | 'supplier_ledger' | 'product'} category
 * @property {string} categoryLabel
 * @property {string} module
 * @property {string} moduleLabel
 * @property {string} recordId
 * @property {string | null} oldValue
 * @property {string | null} newValue
 */

/** @type {Record<string, string>} */
const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Nakit',
  [PAYMENT_METHOD.CARD]: 'Kart',
  [PAYMENT_METHOD.TRANSFER]: 'Havale / EFT',
  [PAYMENT_METHOD.CHECK]: 'Çek',
  [PAYMENT_METHOD.MAIL_ORDER]: 'Mail order',
  [PAYMENT_METHOD.OTHER]: 'Diğer',
}

/** @param {unknown} method */
function paymentMethodLabelTr(method) {
  if (method == null || method === '') return null
  const key = String(method).toUpperCase()
  return PAYMENT_METHOD_LABELS[key] ?? String(method)
}

/** @param {string} type */
function auditCategoryForType(type) {
  switch (type) {
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
    case DOMAIN_EVENT_TYPE.PAYMENT_PENDING:
    case 'payment.approved':
    case 'payment.rejected':
    case 'mailOrder.pending':
    case 'mailOrder.approved':
    case 'mailOrder.rejected':
      return /** @type {const} */ ('payment')
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL:
    case DOMAIN_EVENT_TYPE.SHIPMENT_LOADED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED:
    case DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED:
    case DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE:
    case DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCH_SHEET_PRINTED:
    case 'shipment.dispatch_sheet_printed':
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED:
    case 'shipment.plan.created':
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_UPDATED:
    case 'shipment.plan.updated':
    case DOMAIN_EVENT_TYPE.SHIPMENT_GROUP_CREATED:
    case 'shipment.group.created':
    case DOMAIN_EVENT_TYPE.SHIPMENT_GROUP_APPLIED:
    case 'shipment.group.applied':
    case DOMAIN_EVENT_TYPE.DISPATCH_AUTO_PLANNED:
    case 'dispatch.auto_planned':
      return /** @type {const} */ ('shipment')
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED:
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED:
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED:
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT:
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED:
      return /** @type {const} */ ('ssh')
    case DOMAIN_EVENT_TYPE.ORDER_LIFECYCLE_CHANGED:
    case DOMAIN_EVENT_TYPE.ORDER_PLACED:
    case DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED:
    case DOMAIN_EVENT_TYPE.DELIVERY_FAILED:
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
    case DOMAIN_EVENT_TYPE.DELIVERY_CONFIRMED:
    case DOMAIN_EVENT_TYPE.DELIVERY_POSTPONED:
    case 'delivery.confirmed':
    case 'delivery.failed':
    case 'delivery.postponed':
      return /** @type {const} */ ('order')
    case DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT:
    case 'supply.order.sent':
    case DOMAIN_EVENT_TYPE.SUPPLY_ORDER_REVERTED:
    case 'supply.order.reverted':
      return /** @type {const} */ ('supply')
    case DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED:
    case 'incoming_goods.recorded':
      return /** @type {const} */ ('incoming')
    case DOMAIN_EVENT_TYPE.SUPPLIER_LEDGER_ENTRY:
    case 'supplier_ledger.entry':
      return /** @type {const} */ ('supplier_ledger')
    case DOMAIN_EVENT_TYPE.PRODUCT_MASTER_UPDATED:
    case 'product.updated':
      return /** @type {const} */ ('product')
    case DOMAIN_EVENT_TYPE.RISK_ESCALATED:
    case DOMAIN_EVENT_TYPE.DISPATCH_RISK_DETECTED:
    case 'dispatch.risk_detected':
      return /** @type {const} */ ('risk')
    case DOMAIN_EVENT_TYPE.TASK_CREATED:
    case DOMAIN_EVENT_TYPE.TASK_COMPLETED:
      return /** @type {const} */ ('task')
    case DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED:
      return /** @type {const} */ ('document')
    default:
      return /** @type {const} */ ('system')
  }
}

/** @param {AuditFeedItem['category']} category */
export function auditCategoryLabelTr(category) {
  switch (category) {
    case 'payment':
      return 'Ödeme'
    case 'shipment':
      return 'Sevk'
    case 'ssh':
      return 'SSH'
    case 'order':
      return 'Sipariş'
    case 'risk':
      return 'Risk'
    case 'task':
      return 'Görev'
    case 'document':
      return 'Belge'
    case 'supply':
      return 'Tedarik'
    case 'incoming':
      return 'Gelen Ürün'
    case 'supplier_ledger':
      return 'Tedarikçi Cari'
    case 'product':
      return 'Ürün Master'
    default:
      return 'Sistem'
  }
}

/**
 * @param {DomainEventDto} e
 * @returns {string | null}
 */
export function extractEventActor(e) {
  const p = e.payload ?? {}
  const oa = p.operationActor
  if (oa && typeof oa === 'object' && !Array.isArray(oa)) {
    const o = /** @type {Record<string, unknown>} */ (oa)
    const name =
      typeof o.actorName === 'string'
        ? o.actorName
        : typeof o.actor === 'string'
          ? o.actor
          : ''
    const role = typeof o.role === 'string' ? o.role : ''
    if (name.trim()) return role ? `${name.trim()} (${role})` : name.trim()
  }
  if (typeof p.printedBy === 'string' && p.printedBy.trim()) return p.printedBy.trim()
  if (typeof p.actor === 'string' && p.actor.trim()) return p.actor.trim()
  return null
}

/**
 * @param {DomainEventDto} e
 * @returns {string}
 */
function auditDescriptionForEvent(e) {
  const p = e.payload ?? {}
  if (e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED) {
    const amt =
      p.amount != null && !Number.isNaN(Number(p.amount)) ? formatTry(Number(p.amount)) : null
    const method = paymentMethodLabelTr(p.method ?? p.paymentMethod)
    return [amt, method].filter(Boolean).join(' · ')
  }
  if (e.type === 'policy.override' || e.type === DOMAIN_EVENT_TYPE.POLICY_OVERRIDE) {
    const reason = p.reason != null ? String(p.reason) : ''
    return reason || 'Politika istisnası uygulandı'
  }
  if (e.type === DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED || e.type === 'incoming_goods.recorded') {
    const title = p.productTitle != null ? String(p.productTitle) : ''
    const qty = p.qty != null ? `${p.qty} adet` : ''
    return [title, qty, p.purposeLabel != null ? String(p.purposeLabel) : ''].filter(Boolean).join(' · ')
  }
  if (e.type === DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT || e.type === 'supply.order.sent') {
    const channel = p.channel != null ? String(p.channel) : ''
    const lineTitle = p.lineTitle != null ? String(p.lineTitle) : ''
    return [lineTitle, channel ? `Kanal: ${channel}` : ''].filter(Boolean).join(' · ') || 'Tedarik emri verildi'
  }
  if (e.type === DOMAIN_EVENT_TYPE.ORDER_PLACED || e.type === 'order.placed') {
    const customer = p.customerName != null ? String(p.customerName) : ''
    const lineCount = p.lineCount != null ? `${p.lineCount} kalem` : ''
    return [customer, lineCount].filter(Boolean).join(' · ') || 'Yeni sipariş kaydı'
  }
  if (e.type === DOMAIN_EVENT_TYPE.ORDER_LIFECYCLE_CHANGED) {
    const from = p.from != null ? String(p.from) : '—'
    const to = p.to != null ? String(p.to) : '—'
    return `${from} → ${to}`
  }
  if (e.type === DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED) {
    return 'Müşteri sözleşmesi çıktısı alındı'
  }
  if (e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCH_SHEET_PRINTED || e.type === 'shipment.dispatch_sheet_printed') {
    const vehicle = p.vehicleName != null ? String(p.vehicleName) : ''
    const date = p.plannedDate != null ? formatShortDate(String(p.plannedDate)) : ''
    return [vehicle, date].filter(Boolean).join(' · ') || 'Araç çıkış fişi yazdırıldı'
  }
  if (e.type === DOMAIN_EVENT_TYPE.DISPATCH_ADVICE_GENERATED || e.type === 'dispatch.advice.generated') {
    const score = p.healthScore != null ? String(p.healthScore) : ''
    return score ? `Operasyon sağlığı ${score}/100` : 'Operasyon tavsiyesi üretildi'
  }
  if (e.type === DOMAIN_EVENT_TYPE.DISPATCH_AUTO_PLANNED || e.type === 'dispatch.auto_planned') {
    const vehicle = p.vehicleName != null ? String(p.vehicleName) : ''
    const region = p.region != null ? String(p.region) : ''
    return [region, vehicle].filter(Boolean).join(' · ') || 'Grup sevk planı uygulandı'
  }
  if (e.type === DOMAIN_EVENT_TYPE.DISPATCH_RISK_DETECTED || e.type === 'dispatch.risk_detected') {
    const title = p.title != null ? String(p.title) : ''
    const rec = p.recommendation != null ? String(p.recommendation) : ''
    return [title, rec].filter(Boolean).join(' · ') || 'Operasyon riski kaydedildi'
  }
  if (
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_LOADED ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED ||
    e.type === DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED ||
    e.type === DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE
  ) {
    const from = p.fromStatus != null ? shipmentStatusLabel(String(p.fromStatus)) : ''
    const to = p.toStatus != null ? shipmentStatusLabel(String(p.toStatus)) : ''
    const transition = from && to ? `${from} → ${to}` : to || from
    const date = p.plannedShipDate ?? p.plannedDate
    const dateLabel = date ? `Plan: ${formatShortDate(String(date))}` : ''
    const issue = p.issueNote != null ? String(p.issueNote) : ''
    return [transition, dateLabel, issue].filter(Boolean).join(' · ') || domainEventTypeLabelTr(e.type)
  }
  if (e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED) {
    const title = typeof p.title === 'string' ? p.title : 'Eksik parça'
    const qty = p.quantity != null ? `${p.quantity} adet` : ''
    return [title, qty].filter(Boolean).join(' · ')
  }
  if (
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED
  ) {
    const title = p.title != null ? String(p.title) : ''
    const from = p.fromStatus != null ? String(p.fromStatus) : ''
    const to = p.toStatus != null ? String(p.toStatus) : ''
    const transition = from && to ? `${from} → ${to}` : ''
    return [title, transition].filter(Boolean).join(' · ')
  }
  if (e.type === DOMAIN_EVENT_TYPE.RISK_ESCALATED) {
    return typeof p.reason === 'string' ? p.reason : 'Risk seviyesi güncellendi'
  }
  if (e.type === DOMAIN_EVENT_TYPE.TASK_CREATED && typeof p.title === 'string') {
    return String(p.title)
  }
  if (e.type === DOMAIN_EVENT_TYPE.TASK_COMPLETED) {
    const reason = p.reason != null ? String(p.reason) : ''
    return reason || 'Görev kapatıldı'
  }
  if (typeof p.reason === 'string' && p.reason.trim()) return p.reason.trim()
  if (typeof p.note === 'string' && p.note.trim()) return p.note.trim()
  return ''
}

/**
 * @param {DomainEventDto[]} events
 * @param {string} orderId
 * @returns {AuditFeedItem[]}
 */
export function mapDomainEventsToAuditFeed(events, orderId) {
  return events
    .filter((e) => e.aggregateId === orderId)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((e) => {
      const at = e.occurredAt
      const auditFields = extractAuditFieldsFromEvent(e)
      const desc = auditDescriptionForEvent(e) || auditFields.description
      const category = auditCategoryForType(e.type)
      return {
        id: e.id,
        at,
        timeLabel: formatShortDate(at.slice(0, 10)) + (at.length > 10 ? ` ${at.slice(11, 16)}` : ''),
        title: domainEventTypeLabelTr(e.type),
        description: desc,
        actor: extractEventActor(e),
        type: e.type,
        category,
        categoryLabel: auditCategoryLabelTr(category),
        module: auditFields.module,
        moduleLabel: auditModuleLabelTr(auditFields.module),
        recordId: auditFields.recordId,
        oldValue: auditFields.oldValue,
        newValue: auditFields.newValue,
      }
    })
}
