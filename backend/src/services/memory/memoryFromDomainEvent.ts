/**
 * FAZ 41 — Domain event → AI worker memory drafts.
 */

import {
  MEMORY_ENTITY_TYPE,
  MEMORY_IMPORTANCE,
  type CreateMemoryInput,
  type MemoryImportance,
} from '../../contracts/aiWorkerMemoryDto.js'

export type DomainEventLike = {
  id: string
  type: string
  aggregateId: string
  occurredAt: string | Date
  payload?: Record<string, unknown>
}

export type MemoryEventContext = {
  customerName?: string
  customerId?: string
  orderLabel?: string
  supplierName?: string
  supplierId?: string
  productName?: string
}

export const WORKER_CODE = {
  SALES: 'AI_SALES_FOLLOW_UP',
  COLLECTION: 'AI_COLLECTION',
  SHIPMENT: 'AI_SHIPMENT',
  PROCUREMENT: 'AI_PROCUREMENT',
} as const

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function resolveCustomerId(ctx: MemoryEventContext): string {
  return ctx.customerId ?? ctx.customerName ?? 'unknown-customer'
}

function resolveOrderLabel(ctx: MemoryEventContext, orderId: string): string {
  return ctx.orderLabel ?? orderId
}

function draft(
  partial: CreateMemoryInput & { dedupeKey?: string },
): CreateMemoryInput & { dedupeKey: string } {
  const dedupeKey =
    partial.dedupeKey ??
    `${partial.workerCode}:${partial.memoryType}:${partial.entityId}:${partial.sourceEvent ?? partial.title}`
  return { ...partial, dedupeKey }
}

function paymentDelayDrafts(
  orderId: string,
  ctx: MemoryEventContext,
  sourceEvent: string,
): Array<CreateMemoryInput & { dedupeKey: string }> {
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
 * Tek domain event'ten sıfır veya daha fazla memory taslağı üretir.
 */
export function buildMemoriesFromDomainEvent(
  event: DomainEventLike,
  ctx: MemoryEventContext = {},
): Array<CreateMemoryInput & { dedupeKey: string }> {
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

      const out: Array<CreateMemoryInput & { dedupeKey: string }> = []

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

export function buildDemoSeedMemories(): Array<CreateMemoryInput & { dedupeKey: string }> {
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

export const WORKER_ID_TO_CODE: Record<string, string> = {
  'dw-sales-follow-up': WORKER_CODE.SALES,
  'dw-collection': WORKER_CODE.COLLECTION,
  'dw-shipment': WORKER_CODE.SHIPMENT,
  'dw-procurement': WORKER_CODE.PROCUREMENT,
}

export const WORKER_CODE_LABELS: Record<string, string> = {
  AI_SALES_FOLLOW_UP: 'AI Sales',
  AI_COLLECTION: 'AI Collection',
  AI_SHIPMENT: 'AI Shipment',
  AI_PROCUREMENT: 'AI Procurement',
}

export function resolveWorkerCode(workerId: string): string {
  return WORKER_ID_TO_CODE[workerId] ?? workerId
}

export function importanceTone(importance: MemoryImportance): string {
  switch (importance) {
    case MEMORY_IMPORTANCE.CRITICAL:
      return 'critical'
    case MEMORY_IMPORTANCE.HIGH:
      return 'warning'
    case MEMORY_IMPORTANCE.LOW:
      return 'muted'
    default:
      return 'info'
  }
}
