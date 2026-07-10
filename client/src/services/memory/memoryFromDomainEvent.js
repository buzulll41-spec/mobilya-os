/**
 * FAZ 41 — Domain event → memory drafts (client).
 */

import { MEMORY_ENTITY_TYPE, MEMORY_IMPORTANCE } from '../../contracts/v1/aiWorkerMemory.js'

export const WORKER_CODE = {
  SALES: 'AI_SALES_FOLLOW_UP',
  COLLECTION: 'AI_COLLECTION',
  SHIPMENT: 'AI_SHIPMENT',
  PROCUREMENT: 'AI_PROCUREMENT',
}

/**
 * @typedef {import('../../contracts/v1/aiWorkerMemory.js').MemoryEntityType} MemoryEntityType
 * @typedef {import('../../contracts/v1/aiWorkerMemory.js').MemoryImportance} MemoryImportance
 * @typedef {{
 *   workerCode: string
 *   entityType: MemoryEntityType
 *   entityId: string
 *   memoryType: MemoryEntityType
 *   title: string
 *   content: string
 *   importance: MemoryImportance
 *   sourceEvent?: string
 *   dedupeKey?: string
 * }} CreateMemoryDraft
 * @typedef {{
 *   customerName?: string
 *   customerId?: string
 *   orderLabel?: string
 *   supplierName?: string
 *   supplierId?: string
 *   productName?: string
 * }} MemoryEventContext
 */

function str(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function resolveCustomerId(ctx) {
  return ctx.customerId ?? ctx.customerName ?? 'unknown-customer'
}

function resolveOrderLabel(ctx, orderId) {
  return ctx.orderLabel ?? orderId
}

/** @param {CreateMemoryDraft} partial */
function draft(partial) {
  const dedupeKey =
    partial.dedupeKey ??
    `${partial.workerCode}:${partial.memoryType}:${partial.entityId}:${partial.sourceEvent ?? partial.title}`
  return { ...partial, dedupeKey }
}

/** @param {string} orderId @param {MemoryEventContext} ctx @param {string} sourceEvent */
function paymentDelayDrafts(orderId, ctx, sourceEvent) {
  const label = resolveOrderLabel(ctx, orderId)
  const customer = ctx.customerName ?? 'Müşteri'
  return [
    draft({
      workerCode: WORKER_CODE.COLLECTION,
      entityType: MEMORY_ENTITY_TYPE.ORDER,
      entityId: orderId,
      memoryType: MEMORY_ENTITY_TYPE.PAYMENT,
      title: 'Tahsilat gecikmesi',
      content: `${label} tahsilat gecikmesi nedeniyle risk oluşturdu.`,
      importance: MEMORY_IMPORTANCE.HIGH,
      sourceEvent,
    }),
    draft({
      workerCode: WORKER_CODE.COLLECTION,
      entityType: MEMORY_ENTITY_TYPE.CUSTOMER,
      entityId: resolveCustomerId(ctx),
      memoryType: MEMORY_ENTITY_TYPE.CUSTOMER,
      title: 'Tahsilat davranışı',
      content: `${customer} ödemelerde gecikme sinyali gösteriyor.`,
      importance: MEMORY_IMPORTANCE.NORMAL,
      sourceEvent,
    }),
  ]
}

/**
 * @param {{ id: string, type: string, aggregateId: string, payload?: Record<string, unknown> }} event
 * @param {MemoryEventContext} [ctx]
 * @returns {CreateMemoryDraft[]}
 */
export function buildMemoriesFromDomainEvent(event, ctx = {}) {
  const orderId = event.aggregateId
  const sourceEvent = event.id
  const type = event.type
  const payload = event.payload ?? {}
  const customer = ctx.customerName ?? (str(payload.customerName) || 'Müşteri')
  const label = resolveOrderLabel(ctx, orderId)
  const enrichedCtx = { ...ctx, customerName: customer }

  switch (type) {
    case 'order.placed':
      return [
        draft({
          workerCode: WORKER_CODE.SALES,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.ORDER,
          title: 'Sipariş oluşturuldu',
          content: `${label} siparişi oluşturuldu — ${customer}.`,
          importance: MEMORY_IMPORTANCE.NORMAL,
          sourceEvent,
        }),
      ]

    case 'payment.posted':
      return [
        draft({
          workerCode: WORKER_CODE.COLLECTION,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.PAYMENT,
          title: 'Tahsilat alındı',
          content: `${label} için tahsilat kaydedildi.`,
          importance: MEMORY_IMPORTANCE.NORMAL,
          sourceEvent,
        }),
      ]

    case 'payment.pending':
    case 'payment.rejected':
      return paymentDelayDrafts(orderId, enrichedCtx, sourceEvent)

    case 'risk.escalated': {
      const reason = str(payload.reason)
      const signals = Array.isArray(payload.signals) ? payload.signals.map(String) : []
      const isCollection =
        reason.includes('payment') ||
        reason.includes('collection') ||
        signals.some((s) => s.includes('payment') || s.includes('tahsilat'))
      const isShipment =
        reason.includes('shipment') ||
        reason.includes('dispatch') ||
        signals.some((s) => s.includes('shipment') || s.includes('termin'))

      /** @type {CreateMemoryDraft[]} */
      const out = []

      if (isCollection) {
        out.push(
          draft({
            workerCode: WORKER_CODE.COLLECTION,
            entityType: MEMORY_ENTITY_TYPE.ORDER,
            entityId: orderId,
            memoryType: MEMORY_ENTITY_TYPE.ORDER,
            title: 'Kritik tahsilat riski',
            content: `${label} tahsilat gecikmesi nedeniyle kritik risk oluşturdu.`,
            importance: MEMORY_IMPORTANCE.CRITICAL,
            sourceEvent,
          }),
        )
      }

      if (isShipment || signals.includes('termin_overdue')) {
        out.push(
          draft({
            workerCode: WORKER_CODE.SHIPMENT,
            entityType: MEMORY_ENTITY_TYPE.ORDER,
            entityId: orderId,
            memoryType: MEMORY_ENTITY_TYPE.SHIPMENT,
            title: 'Sevk gecikmesi',
            content: `${label} sevk/termin gecikmesi sinyali alındı.`,
            importance: MEMORY_IMPORTANCE.HIGH,
            sourceEvent,
          }),
          draft({
            workerCode: WORKER_CODE.SALES,
            entityType: MEMORY_ENTITY_TYPE.CUSTOMER,
            entityId: resolveCustomerId(enrichedCtx),
            memoryType: MEMORY_ENTITY_TYPE.CUSTOMER,
            title: 'Termin hassasiyeti',
            content: `${customer} termin gecikmelerinde hassas davranıyor.`,
            importance: MEMORY_IMPORTANCE.HIGH,
            sourceEvent,
          }),
        )
      }

      return out
    }

    case 'dispatch.risk_detected':
    case 'shipment.partial':
      return [
        draft({
          workerCode: WORKER_CODE.SHIPMENT,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.SHIPMENT,
          title: 'Sevk gecikmesi',
          content: `${label} sevkiyatında gecikme/kısmi sevk kaydı var.`,
          importance: MEMORY_IMPORTANCE.HIGH,
          sourceEvent,
        }),
      ]

    case 'supply.order.sent':
    case 'incoming_goods.recorded': {
      const supplier = ctx.supplierName ?? (str(payload.supplierName) || 'Tedarikçi')
      const supplierId = ctx.supplierId ?? (str(payload.supplierId) || supplier)
      return [
        draft({
          workerCode: WORKER_CODE.PROCUREMENT,
          entityType: MEMORY_ENTITY_TYPE.SUPPLIER,
          entityId: supplierId,
          memoryType: MEMORY_ENTITY_TYPE.SUPPLIER,
          title: 'Tedarik gecikmesi',
          content: `${supplier} tedarik sürecinde gecikme sinyali gösteriyor.`,
          importance: MEMORY_IMPORTANCE.HIGH,
          sourceEvent,
        }),
      ]
    }

    case 'installation.issue':
      return [
        draft({
          workerCode: WORKER_CODE.SALES,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.SERVICE,
          title: 'SSH açıldı',
          content: `${label} için servis/SSH kaydı açıldı.`,
          importance: MEMORY_IMPORTANCE.HIGH,
          sourceEvent,
        }),
      ]

    case 'sales.follow_up.call_logged':
      return [
        draft({
          workerCode: WORKER_CODE.SALES,
          entityType: MEMORY_ENTITY_TYPE.CUSTOMER,
          entityId: resolveCustomerId(enrichedCtx),
          memoryType: MEMORY_ENTITY_TYPE.CUSTOMER,
          title: 'Müşteri tekrar arandı',
          content: `${customer} tekrar arandı — satış takibi devam ediyor.`,
          importance: MEMORY_IMPORTANCE.NORMAL,
          sourceEvent,
        }),
      ]

    case 'order_line.committed_ship_by_changed':
      return [
        draft({
          workerCode: WORKER_CODE.SALES,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.ORDER,
          title: 'Termin değişti',
          content: `${label} termin tarihi güncellendi.`,
          importance: MEMORY_IMPORTANCE.NORMAL,
          sourceEvent,
        }),
        draft({
          workerCode: WORKER_CODE.SALES,
          entityType: MEMORY_ENTITY_TYPE.CUSTOMER,
          entityId: resolveCustomerId(enrichedCtx),
          memoryType: MEMORY_ENTITY_TYPE.CUSTOMER,
          title: 'Termin hassasiyeti',
          content: `${customer} termin gecikmelerinde hassas davranıyor.`,
          importance: MEMORY_IMPORTANCE.HIGH,
          sourceEvent,
        }),
      ]

    case 'missing_item.created':
      return [
        draft({
          workerCode: WORKER_CODE.PROCUREMENT,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.PRODUCT,
          title: 'Ürün eksik geldi',
          content: `${label} için eksik ürün kaydı açıldı${
            ctx.productName ? ` (${ctx.productName})` : ''
          }.`,
          importance: MEMORY_IMPORTANCE.HIGH,
          sourceEvent,
        }),
      ]

    case 'order.lifecycle_changed': {
      const status = str(payload.status ?? payload.toStatus).toLowerCase()
      if (!status.includes('iptal') && !status.includes('cancel')) return []
      return [
        draft({
          workerCode: WORKER_CODE.SALES,
          entityType: MEMORY_ENTITY_TYPE.ORDER,
          entityId: orderId,
          memoryType: MEMORY_ENTITY_TYPE.ORDER,
          title: 'Sipariş iptal',
          content: `${label} siparişi iptal edildi.`,
          importance: MEMORY_IMPORTANCE.CRITICAL,
          sourceEvent,
        }),
      ]
    }

    default:
      return []
  }
}

/** @returns {CreateMemoryDraft[]} */
export function buildDemoSeedMemories() {
  return [
    draft({
      workerCode: WORKER_CODE.SALES,
      entityType: MEMORY_ENTITY_TYPE.CUSTOMER,
      entityId: 'Ayşe Yılmaz',
      memoryType: MEMORY_ENTITY_TYPE.CUSTOMER,
      title: 'Termin hassasiyeti',
      content: 'Ayşe Yılmaz termin gecikmelerinde hassas davranıyor.',
      importance: MEMORY_IMPORTANCE.HIGH,
      sourceEvent: 'seed-customer-ayse',
      dedupeKey: 'seed:customer:ayse',
    }),
    draft({
      workerCode: WORKER_CODE.PROCUREMENT,
      entityType: MEMORY_ENTITY_TYPE.SUPPLIER,
      entityId: 'Nova Home',
      memoryType: MEMORY_ENTITY_TYPE.SUPPLIER,
      title: 'Geç teslimat paterni',
      content: 'Nova Home son 3 siparişte geç teslimat yaptı.',
      importance: MEMORY_IMPORTANCE.HIGH,
      sourceEvent: 'seed-supplier-nova',
      dedupeKey: 'seed:supplier:nova',
    }),
    draft({
      workerCode: WORKER_CODE.COLLECTION,
      entityType: MEMORY_ENTITY_TYPE.ORDER,
      entityId: 'S-24089',
      memoryType: MEMORY_ENTITY_TYPE.ORDER,
      title: 'Kritik tahsilat riski',
      content: 'S-24089 tahsilat gecikmesi nedeniyle kritik risk oluşturdu.',
      importance: MEMORY_IMPORTANCE.CRITICAL,
      sourceEvent: 'seed-order-s24089',
      dedupeKey: 'seed:order:s24089',
    }),
    draft({
      workerCode: WORKER_CODE.PROCUREMENT,
      entityType: MEMORY_ENTITY_TYPE.SUPPLIER,
      entityId: 'Vega Mobilya',
      memoryType: MEMORY_ENTITY_TYPE.SUPPLIER,
      title: 'Tekrarlayan gecikme',
      content: 'Vega Mobilya tedarik sürecinde tekrar gecikme sinyali gösteriyor.',
      importance: MEMORY_IMPORTANCE.CRITICAL,
      sourceEvent: 'seed-supplier-vega',
      dedupeKey: 'seed:supplier:vega',
    }),
  ]
}

export {}
