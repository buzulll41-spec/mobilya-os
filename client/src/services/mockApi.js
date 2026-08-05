/**
 * Mock HTTP katmanı — ileride `fetch` / OpenAPI client ile değiştirilir.
 * Arayüz: `services/ordersClient.js` üzerinden tüketilir.
 */
import { DEMO_TODAY } from '../data/constants.js'
import { ORDER_SHIPMENT_DISPLAY } from '../lib/orderShipmentDisplayStatus.js'
import { initialOrders } from '../data/seedOrders.js'
import { parseCustomerExtraFromNotes } from '../features/orders/newOrderWizardModel.js'
import {
  buildDefaultShipmentPlanSelection,
  computeShipmentPlanLinesFromSeeds,
  orderHasRemainingAfterPlan,
  validateShipmentPlanSelection,
} from '../mappers/shipment/computeShipmentPlanLines.js'
import { projectLegacyOrderToListItemDto } from './orderListItemProjection.js'
import { rebuildOperationalTasksFromDtos } from './operationalTaskSync.js'
import {
  findShipmentById,
  getAllShipmentsSnapshot,
  getLineSeedsForSalesOrder,
  getShipmentsForSalesOrder,
  hydrateShipmentStore,
  resetMockShipmentStore,
  upsertShipment,
} from './mockShipmentStore.js'
import {
  appendPaymentTransaction,
  getAllPaymentsSnapshot,
  hydratePaymentStore,
  resetMockPaymentStore,
  updatePaymentTransaction,
} from './mockPaymentStore.js'
import { paymentAutoApprovesForRole, canApprovePayments } from '../lib/paymentApprovalPolicy.js'
import { canCreateSalesOrder } from '../constants/orderDrawerPermissions.js'
import { getCurrentAuthUser, buildOperationActorPayload } from '../lib/operationActor.js'
import { AUDIT_MODULE, recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import {
  appendDomainEvent as appendDomainEventToStore,
  getAllDomainEventsSnapshot,
  hydrateDomainEventStore,
  resetMockDomainEventStore,
} from './mockDomainEventStore.js'
import { persistMockSession, readMockSession, clearMockSession } from './mockSessionPersistence.js'
import {
  getAllOrderLinesSnapshot,
  getOrderLinesForSalesOrder,
  hydrateOrderLineStore,
  resetMockOrderLineStore,
  setOrderLinesForSalesOrder,
  confirmSupplySentForOrderLines,
  revertWarehouseArrivalForOrderLine,
} from './mockOrderLineStore.js'
import { buildOrderLineIds } from '../domain/order/orderLineCreate.js'
import { normalizeCreateOrderInput } from '../domain/order/normalizeCreateOrder.js'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_KIND, PAYMENT_TRANSACTION_STATUS } from '../contracts/v1/enums.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { numberToMoney } from '../mappers/moneyHelpers.js'
import { resetMockAuditEventStore } from './mockAuditEventStore.js'
import { resetMockTaskStore, getAllTasksSnapshot } from './mockTaskStore.js'
import {
  getAllMissingItemsSnapshot,
  getMissingItemsForOrder,
  hydrateMissingItemStore,
  resetMockMissingItemStore,
  upsertMissingItem,
} from './mockMissingItemStore.js'
import { resetMockSupplierStore, findSupplierById } from './mockSupplierStore.js'
import { resetMockProductStore } from './mockProductStore.js'
import { appendLedgerDraft, resetMockSupplierLedgerStore, updateLedgerEntryByPaymentId } from './mockSupplierLedgerStore.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../contracts/v1/supplierLedgerEntryTypes.js'
import {
  SUPPLIER_LEDGER_SOURCE,
  SUPPLIER_LEDGER_STATUS,
  formatMailOrderLedgerDescription,
} from '../contracts/v1/supplierLedgerStatuses.js'
import { bootstrapMockOrderLinesFromOrders } from './mockOrderLineBootstrap.js'
import { applyDerivedStatusToMockOrder } from './syncMockOrderDisplayStatus.js'

const DELIVERED_STATUS = 'Teslim Edildi'

import {
  canTransitionMissingItemStatus,
  isMissingItemStatus,
  MISSING_ITEM_STATUS,
} from '../contracts/v1/missingItemStatuses.js'
import {
  canTransitionShipmentStatus,
  isShipmentOperationStatus,
  SHIPMENT_OPERATION_STATUS,
  shipmentEventTypeForStatus,
} from '../contracts/v1/shipmentStatuses.js'
import { buildMockShipmentQueue } from './mockShipmentQueue.js'
import { mapShipmentQueueToRowVMs } from '../mappers/shipment/mapShipmentQueueItemToRowVM.js'
import { buildShipmentAdvanceChain } from '../mappers/shipment/shipmentSimplifiedFlow.js'
import { shipmentStatusOrPlanned } from '../mappers/shipment/shipmentStatusLabel.js'
import {
  loadAllShipmentPlans,
  saveShipmentPlan,
  saveShipmentPlansBatch,
} from '../state/shipmentPlanStore.js'
import { SHIPMENT_PLAN_STATUS } from '../constants/shipmentPlanStatuses.js'
import { shouldPromoteToConfirmationQueue } from '../mappers/shipment/deliveryConfirmationQueue.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

function cloneList(/** @type {Order[]} */ rows) {
  return rows.map((o) => ({ ...o }))
}

/** Bellek içi “sunucu” — getOrders / mutasyonlar tutarlı kalsın */
let memoryOrders = cloneList(initialOrders)

function snapshotMockSession() {
  persistMockSession({
    orders: memoryOrders,
    orderLines: getAllOrderLinesSnapshot(),
    payments: getAllPaymentsSnapshot(),
    domainEvents: getAllDomainEventsSnapshot(),
    missingItems: getAllMissingItemsSnapshot(),
    shipments: getAllShipmentsSnapshot(),
  })
}

/** Satır depo/sevke hazır durumundan sipariş status alanını günceller. */
export function syncMockOrderDisplayStatusById(orderId) {
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) return null
  const next = applyDerivedStatusToMockOrder(memoryOrders[i])
  if (next.status === memoryOrders[i].status) return next.status
  memoryOrders[i] = next
  snapshotMockSession()
  return next.status
}

function hydrateMockFromSession() {
  const saved = readMockSession()
  if (!saved) return
  memoryOrders = cloneList(/** @type {Order[]} */ (saved.orders))
  hydratePaymentStore(/** @type {import('../contracts/v1/payment.js').PaymentTransactionDto[]} */ (saved.payments))
  hydrateDomainEventStore(/** @type {import('../contracts/v1/domainEvent.js').DomainEventDto[]} */ (saved.domainEvents))
  if (Array.isArray(saved.missingItems)) {
    hydrateMissingItemStore(/** @type {import('../contracts/v1/missingItem.js').MissingItemDto[]} */ (saved.missingItems))
  }
  if (Array.isArray(saved.shipments)) {
    hydrateShipmentStore(/** @type {import('../contracts/v1/shipment.js').ShipmentDto[]} */ (saved.shipments))
  }
  if (saved.orderLines && typeof saved.orderLines === 'object') {
    hydrateOrderLineStore(/** @type {Record<string, import('./mockOrderLineStore.js').OrderLineSeed[]>} */ (saved.orderLines))
  }
}

hydrateMockFromSession()
bootstrapMockOrderLinesFromOrders(memoryOrders)

/** Demo / liste projection öncesi sipariş satırlarının dolu olmasını sağlar. */
export function ensureMockOrderLinesBootstrapped() {
  bootstrapMockOrderLinesFromOrders(memoryOrders)
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Test / demo sıfırlama */
export function resetMockOrdersStore() {
  memoryOrders = cloneList(initialOrders)
  resetMockOrderLineStore()
  resetMockShipmentStore()
  resetMockPaymentStore()
  resetMockDomainEventStore()
  resetMockAuditEventStore()
  resetMockTaskStore()
  resetMockMissingItemStore()
  resetMockSupplierStore()
  resetMockSupplierLedgerStore()
  resetMockProductStore()
  clearMockSession()
}

/**
 * @param {number} [ms]
 */
async function fakeLatency(ms = 280) {
  await sleep(ms)
}

/**
 * @param {Order} order
 */
export function upsertMockRiskOrder(order) {
  const i = memoryOrders.findIndex((o) => o.id === order.id)
  if (i === -1) memoryOrders.unshift(order)
  else memoryOrders[i] = { ...memoryOrders[i], ...order }
}

/**
 * Tüm siparişler (liste wire DTO — sevkiyat derived summary dahil).
 * @returns {Promise<SalesOrderListItemDto[]>}
 */
export async function getOrders() {
  await fakeLatency(320)
  const list = memoryOrders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  rebuildOperationalTasksFromDtos(list, DEMO_TODAY)
  return list
}

/**
 * Sevk sayfası kuyruğu — mock shipment kayıtlarından (GET /v1/shipments parity).
 * @returns {Promise<import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]>}
 */
export async function getShipmentQueue() {
  await fakeLatency(120)
  const orders = await getOrders()
  const items = buildMockShipmentQueue(memoryOrders)
  return mapShipmentQueueToRowVMs(items, orders)
}

/**
 * Bellek siparişleri üzerinden görevleri yeniden üretir (mutasyon sonrası).
 */
export function syncAllOperationalTasks() {
  const list = memoryOrders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  rebuildOperationalTasksFromDtos(list, DEMO_TODAY)
}

/**
 * @param {Record<string, unknown>} draft
 */
function pickDraftCustomerExtra(draft) {
  const fromNotes =
    'notes' in draft && typeof draft.notes === 'string'
      ? parseCustomerExtraFromNotes(draft.notes)
      : {}
  /** @type {Record<string, string | undefined>} */
  const out = { ...fromNotes }
  for (const key of ['phone2', 'nationalId', 'taxNumber', 'taxOffice']) {
    if (key in draft && draft[key]) out[key] = String(draft[key])
  }
  return out
}

/**
 * @param {Omit<Order, 'id' | 'orderDate'> | import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} draft
 * @returns {Promise<Order>}
 */
export async function createOrder(draft) {
  await fakeLatency(420)
  if (!canCreateSalesOrder(getCurrentAuthUser()?.role)) {
    throw new Error('Bu işlem için yetkiniz yok')
  }
  const normalized = normalizeCreateOrderInput(draft)
  const orderId = `S-${Date.now()}`
  const lineIds = buildOrderLineIds(orderId, normalized.lines.length)

  /** @type {Order} */
  const row = {
    customer: normalized.customerName,
    product: normalized.productTitle,
    subtotalAmount: normalized.subtotalAmount,
    discountAmount: normalized.discountAmount,
    discountType: normalized.discountType,
    totalAmount: normalized.totalAmount,
    amount: normalized.totalAmount,
    remainingAmount: normalized.remainingAmount,
    paidAmount: normalized.paidAmount > 0 ? normalized.paidAmount : undefined,
    paid: normalized.isFullyPaid,
    status: normalized.status,
    orderDate: DEMO_TODAY,
    id: orderId,
    ...(draft && typeof draft === 'object' && 'phone' in draft && draft.phone
      ? { phone: String(/** @type {{ phone: string }} */ (draft).phone) }
      : {}),
    ...(draft && typeof draft === 'object' && 'dueDate' in draft && /** @type {{ dueDate?: string }} */ (draft).dueDate
      ? {
          dueDate: String(/** @type {{ dueDate: string }} */ (draft).dueDate),
          shipmentDate:
            'shipmentDate' in draft && /** @type {{ shipmentDate?: string }} */ (draft).shipmentDate
              ? String(/** @type {{ shipmentDate: string }} */ (draft).shipmentDate)
              : undefined,
        }
      : {}),
    ...(draft && typeof draft === 'object' && 'salesPerson' in draft && /** @type {{ salesPerson?: string }} */ (draft).salesPerson
      ? { salesPerson: String(/** @type {{ salesPerson: string }} */ (draft).salesPerson) }
      : {}),
    ...(draft && typeof draft === 'object' && 'notes' in draft && /** @type {{ notes?: string }} */ (draft).notes
      ? { notes: String(/** @type {{ notes: string }} */ (draft).notes) }
      : {}),
    ...(draft && typeof draft === 'object' && 'cost' in draft && typeof /** @type {{ cost?: number }} */ (draft).cost === 'number'
      ? { cost: /** @type {{ cost: number }} */ (draft).cost }
      : {}),
    ...(draft && typeof draft === 'object' ? pickDraftCustomerExtra(/** @type {Record<string, unknown>} */ (draft)) : {}),
  }

  setOrderLinesForSalesOrder(
    orderId,
    normalized.lines.map((ln, i) => ({
      id: lineIds[i],
      salesOrderId: orderId,
      title: ln.title,
      qtyOrdered: ln.quantity.toFixed(2),
      qtyReceived: '0',
      unitPrice: ln.unitPrice,
      lineTotal: ln.lineTotal,
      productTitleSnapshot: ln.title,
      ...(ln.productGroup ? { productGroup: ln.productGroup, productGroupSnapshot: ln.productGroup } : {}),
      ...('supplierId' in ln && ln.supplierId ? { supplierId: String(ln.supplierId) } : {}),
      ...('supplierNameSnapshot' in ln && ln.supplierNameSnapshot
        ? { supplierNameSnapshot: String(ln.supplierNameSnapshot) }
        : {}),
      ...('productId' in ln && ln.productId ? { productId: String(ln.productId) } : {}),
      ...('lineNote' in ln && ln.lineNote ? { lineNote: String(ln.lineNote) } : {}),
      ...('configuration' in ln &&
      ln.configuration &&
      typeof ln.configuration === 'object' &&
      Object.keys(ln.configuration).length
        ? { configuration: { .../** @type {Record<string, string>} */ (ln.configuration) } }
        : {}),
    })),
  )

  memoryOrders = [row, ...memoryOrders]

  const placedAt = new Date().toISOString()
  recordAuditEvent({
    id: `DOM-order-placed-${orderId}`,
    type: DOMAIN_EVENT_TYPE.ORDER_PLACED,
    aggregateId: orderId,
    correlationId: `corr-${orderId}-placed`,
    occurredAt: placedAt,
    module: AUDIT_MODULE.ORDER,
    recordId: orderId,
    oldValue: null,
    newValue: normalized.status,
    description: `${normalized.customerName} · ${normalized.lines.length} kalem`,
    extraPayload: {
      customerName: normalized.customerName,
      lineCount: normalized.lines.length,
      totalAmount: normalized.totalAmount,
    },
  })

  const commercial =
    draft && typeof draft === 'object' && 'customerName' in draft
      ? /** @type {import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} */ (draft)
      : null

  const autoApprove = paymentAutoApprovesForRole(getCurrentAuthUser()?.role)
  const hasInitialPayment = normalized.paidAmount > 0
  const isMailOrder = commercial?.paymentMethod === PAYMENT_METHOD.MAIL_ORDER

  if (hasInitialPayment && !autoApprove) {
    row.paidAmount = undefined
    row.remainingAmount = normalized.totalAmount
    row.paid = false
  }

  if (hasInitialPayment) {
    const txId = isMailOrder ? `PTX-${orderId}-mo` : `PTX-${orderId}-initial`
    const txStatus = autoApprove
      ? PAYMENT_TRANSACTION_STATUS.POSTED
      : PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL
    appendPaymentTransaction({
      id: txId,
      salesOrderId: orderId,
      invoiceId: null,
      amount: numberToMoney(normalized.paidAmount),
      kind: isMailOrder ? PAYMENT_TRANSACTION_KIND.MAIL_ORDER : PAYMENT_TRANSACTION_KIND.CAPTURE,
      method: isMailOrder ? PAYMENT_METHOD.MAIL_ORDER : PAYMENT_METHOD.TRANSFER,
      status: txStatus,
      occurredAt: new Date().toISOString(),
      idempotencyKey: `idem-${txId}`,
      externalRef: null,
    })
    if (!autoApprove) {
      appendDomainEventToStore({
        id: `DOM-${txId}-pending`,
        type: DOMAIN_EVENT_TYPE.PAYMENT_PENDING,
        aggregateType: 'SalesOrder',
        aggregateId: orderId,
        occurredAt: new Date().toISOString(),
        correlationId: `corr-${orderId}-pay-pending-${txId}`,
        payloadSchemaVersion: '1',
        payload: {
          transactionId: txId,
          amount: normalized.paidAmount.toFixed(2),
          method: isMailOrder ? PAYMENT_METHOD.MAIL_ORDER : PAYMENT_METHOD.TRANSFER,
          status: PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
          ...(isMailOrder ? { mailOrder: true } : {}),
        },
      })
      if (isMailOrder) {
        appendDomainEventToStore({
          id: `DOM-${txId}-mo-pending`,
          type: 'mailOrder.pending',
          aggregateType: 'SalesOrder',
          aggregateId: orderId,
          occurredAt: new Date().toISOString(),
          correlationId: `corr-${orderId}-mo-pending-${txId}`,
          payloadSchemaVersion: '1',
          payload: { transactionId: txId },
        })
      }
    } else if (isMailOrder && commercial?.mailOrderSupplierId) {
      let description = 'Müşteri kartı ile mail order tahsilatı'
      if (commercial.mailOrderCustomerId) {
        description += ` · Müşteri: ${commercial.mailOrderCustomerId}`
      }
      description += ` · Sipariş: ${orderId}`
      appendLedgerDraft(commercial.mailOrderSupplierId, {
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
        occurredAt: DEMO_TODAY,
        description,
        debitAmount: '0.00',
        creditAmount: normalized.paidAmount.toFixed(2),
        paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
        documentNo: orderId,
      })
    } else if (autoApprove) {
      recordAuditEvent({
        id: `DOM-${txId}`,
        type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
        aggregateId: orderId,
        correlationId: `corr-${orderId}-pay-${txId}`,
        module: AUDIT_MODULE.COLLECTION,
        recordId: txId,
        oldValue: '0',
        newValue: normalized.paidAmount.toFixed(2),
        description: 'Kapora tahsilatı',
        extraPayload: {
          transactionId: txId,
          amount: normalized.paidAmount.toFixed(2),
          method: commercial?.paymentMethod ?? PAYMENT_METHOD.TRANSFER,
        },
      })
    }
  }

  syncAllOperationalTasks()
  snapshotMockSession()
  return { ...row }
}

/**
 * @param {string} id
 * @param {Partial<Order>} patch
 * @returns {Promise<Order>}
 */
export async function updateOrder(id, patch) {
  await fakeLatency(200)
  const i = memoryOrders.findIndex((o) => o.id === id)
  if (i === -1) {
    throw new Error('Sipariş bulunamadı')
  }

  const fromStatus = memoryOrders[i].status
  memoryOrders[i] = { ...memoryOrders[i], ...patch }

  if (patch.status != null && patch.status !== fromStatus) {
    appendDomainEventToStore({
      id: `DOM-lc-${id}-${Date.now()}`,
      type: DOMAIN_EVENT_TYPE.ORDER_LIFECYCLE_CHANGED,
      aggregateType: 'SalesOrder',
      aggregateId: id,
      occurredAt: new Date().toISOString(),
      correlationId: `corr-lc-${id}-${Date.now()}`,
      payloadSchemaVersion: '1',
      payload: { from: fromStatus, to: patch.status },
    })
  }

  syncAllOperationalTasks()
  snapshotMockSession()
  return { ...memoryOrders[i] }
}

/**
 * @returns {Promise<import('../contracts/v1/domainEvent.js').DomainEventDto[]>}
 */
export async function getDomainEvents() {
  await fakeLatency(90)
  return getAllDomainEventsSnapshot()
}

/**
 * @param {import('../contracts/v1/domainEvent.js').DomainEventDto} evt
 * @returns {import('../contracts/v1/domainEvent.js').DomainEventDto}
 */
export function appendDomainEvent(evt) {
  return appendDomainEventToStore(evt)
}

/**
 * @returns {Promise<import('../contracts/v1/task.js').TaskDto[]>}
 */
export async function getTasks() {
  await fakeLatency(70)
  return getAllTasksSnapshot()
}

const ALLOWED_PAYMENT_METHODS = new Set(Object.values(PAYMENT_METHOD))

/**
 * @param {string} supplierId
 * @returns {{ mailOrderSupplierId: string, mailOrderSupplierName: string } | null}
 */
function resolveMockMailOrderSupplierFields(supplierId) {
  const supplier = findSupplierById(supplierId)
  if (!supplier) return null
  return {
    mailOrderSupplierId: supplier.id,
    mailOrderSupplierName: supplier.companyName,
  }
}

/**
 * @param {string} orderId
 * @param {{
 *   amount: number
 *   method: string
 *   note?: string
 *   mailOrderSupplierId?: string
 *   mailOrderCustomerId?: string
 * }} body
 * @returns {Promise<SalesOrderListItemDto>}
 */
export async function postOrderPayment(orderId, body) {
  await fakeLatency(220)
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')
  const amount = Number(body.amount)
  const method = String(body.method ?? '').trim().toUpperCase()
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Geçersiz tutar')
  if (!ALLOWED_PAYMENT_METHODS.has(/** @type {import('../contracts/v1/enums.js').PaymentMethod} */ (method))) {
    throw new Error('Geçersiz ödeme yöntemi')
  }
  const isMailOrder = method === PAYMENT_METHOD.MAIL_ORDER
  const mailOrderSupplierId = typeof body.mailOrderSupplierId === 'string' ? body.mailOrderSupplierId.trim() : ''
  if (isMailOrder && !mailOrderSupplierId) throw new Error('Mail order tedarikçisi zorunlu')
  const mailOrderSupplierFields = isMailOrder ? resolveMockMailOrderSupplierFields(mailOrderSupplierId) : null
  if (isMailOrder && !mailOrderSupplierFields) throw new Error('Mail order tedarikçisi bulunamadı')

  const order = memoryOrders[i]
  const total = typeof order.totalAmount === 'number' ? order.totalAmount : order.amount
  const priorPaid = order.paid ? total : (order.paidAmount ?? 0)
  if (priorPaid + amount > total + 0.009) throw new Error('Ödeme tutarı kalan bakiyeyi aşamaz')

  const autoApprove = paymentAutoApprovesForRole(getCurrentAuthUser()?.role)
  const txStatus = autoApprove
    ? PAYMENT_TRANSACTION_STATUS.POSTED
    : PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL

  const txId = `PTX-${orderId}-${Date.now()}`
  const occurredAt = new Date().toISOString()
  appendPaymentTransaction({
    id: txId,
    salesOrderId: orderId,
    invoiceId: null,
    amount: numberToMoney(amount),
    kind: isMailOrder ? PAYMENT_TRANSACTION_KIND.MAIL_ORDER : PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: /** @type {import('../contracts/v1/enums.js').PaymentMethod} */ (method),
    status: txStatus,
    occurredAt,
    idempotencyKey: `idem-${txId}`,
    externalRef: null,
    ...(mailOrderSupplierFields ?? {}),
  })

  const mailOrderCustomerId =
    (typeof body.mailOrderCustomerId === 'string' ? body.mailOrderCustomerId.trim() : '') ||
    order.customer ||
    'Müşteri'

  if (autoApprove) {
    const paid = priorPaid + amount
    const remainingAmount = Math.max(0, total - paid)

    if (isMailOrder) {
      appendLedgerDraft(mailOrderSupplierId, {
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
        occurredAt: DEMO_TODAY,
        description: formatMailOrderLedgerDescription(mailOrderCustomerId, orderId, amount),
        debitAmount: '0.00',
        creditAmount: amount.toFixed(2),
        paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
        documentNo: orderId,
        paymentTransactionId: txId,
        salesOrderId: orderId,
        customerNameSnapshot: mailOrderCustomerId,
        source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
        status: SUPPLIER_LEDGER_STATUS.APPROVED,
      })
    }

    memoryOrders[i] = {
      ...order,
      paid: paid >= total - 0.009,
      paidAmount: paid,
      remainingAmount,
    }

    recordAuditEvent({
      id: `DOM-${txId}`,
      type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
      aggregateId: orderId,
      correlationId: `corr-${orderId}-pay-${txId}`,
      occurredAt,
      module: AUDIT_MODULE.COLLECTION,
      recordId: txId,
      oldValue: priorPaid.toFixed(2),
      newValue: paid.toFixed(2),
      description: remainingAmount <= 0.009 ? 'Kalan tahsilat alındı' : 'Tahsilat alındı',
      extraPayload: {
        transactionId: txId,
        amount: amount.toFixed(2),
        currency: 'TRY',
        method,
        ...(body.note ? { note: body.note } : {}),
        ...(isMailOrder
          ? { mailOrderSupplierId, mailOrderCustomerId, mailOrder: true }
          : {}),
      },
    })
  } else {
    appendDomainEventToStore({
      id: `DOM-${txId}-pending`,
      type: DOMAIN_EVENT_TYPE.PAYMENT_PENDING,
      aggregateType: 'SalesOrder',
      aggregateId: orderId,
      occurredAt,
      correlationId: `corr-${orderId}-pay-pending-${txId}`,
      payloadSchemaVersion: '1',
      payload: {
        transactionId: txId,
        amount: amount.toFixed(2),
        currency: 'TRY',
        method,
        status: PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
        ...(body.note ? { note: body.note } : {}),
        ...(isMailOrder
          ? { mailOrderSupplierId, mailOrderCustomerId, mailOrder: true }
          : {}),
      },
    })
    if (isMailOrder && mailOrderSupplierId) {
      appendLedgerDraft(mailOrderSupplierId, {
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
        occurredAt: DEMO_TODAY,
        description: formatMailOrderLedgerDescription(mailOrderCustomerId, orderId, amount),
        debitAmount: '0.00',
        creditAmount: amount.toFixed(2),
        paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
        documentNo: orderId,
        paymentTransactionId: txId,
        salesOrderId: orderId,
        customerNameSnapshot: mailOrderCustomerId,
        source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
        status: SUPPLIER_LEDGER_STATUS.PENDING,
      })
    }
  }

  syncAllOperationalTasks()
  snapshotMockSession()
  return projectLegacyOrderToListItemDto(memoryOrders[i], DEMO_TODAY)
}

/**
 * @param {string} orderId
 * @param {string} paymentId
 * @param {{ approvalNote?: string }} [body]
 */
export async function approveOrderPayment(orderId, paymentId, body = {}) {
  await fakeLatency(180)
  if (!canApprovePayments(getCurrentAuthUser()?.role)) {
    throw new Error('Tahsilat onay yetkisi yok')
  }
  const txs = getAllPaymentsSnapshot()
  const tx = txs.find((t) => t.id === paymentId && t.salesOrderId === orderId)
  if (!tx) throw new Error('Ödeme kaydı bulunamadı')
  if (tx.status !== PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL) {
    throw new Error('Ödeme onay bekliyor durumunda değil')
  }

  const amount = Number.parseFloat(tx.amount.amount)
  const method = tx.method
  const isMailOrder = method === PAYMENT_METHOD.MAIL_ORDER
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')
  const order = memoryOrders[i]
  const total = typeof order.totalAmount === 'number' ? order.totalAmount : order.amount
  const priorPaid = order.paid ? total : (order.paidAmount ?? 0)
  const paid = priorPaid + amount
  const remainingAmount = Math.max(0, total - paid)

  updatePaymentTransaction(paymentId, { status: PAYMENT_TRANSACTION_STATUS.POSTED })
  const occurredAt = new Date().toISOString()

  if (isMailOrder) {
    const events = (await getDomainEvents()).filter(
      (e) => e.aggregateId === orderId && e.type === DOMAIN_EVENT_TYPE.PAYMENT_PENDING,
    )
    const pending = events.find((e) => e.payload?.transactionId === paymentId)
    const supplierId =
      tx.mailOrderSupplierId ??
      pending?.payload?.mailOrderSupplierId
    const customerId = pending?.payload?.mailOrderCustomerId ?? order.customer
    if (supplierId) {
      const description = formatMailOrderLedgerDescription(customerId, orderId, amount)
      const updated = updateLedgerEntryByPaymentId(paymentId, {
        status: SUPPLIER_LEDGER_STATUS.APPROVED,
        description,
        customerNameSnapshot: customerId,
        salesOrderId: orderId,
        source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
      })
      if (!updated) {
        appendLedgerDraft(String(supplierId), {
          entryType: SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER,
          occurredAt: DEMO_TODAY,
          description,
          debitAmount: '0.00',
          creditAmount: amount.toFixed(2),
          paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
          documentNo: orderId,
          paymentTransactionId: paymentId,
          salesOrderId: orderId,
          customerNameSnapshot: customerId,
          source: SUPPLIER_LEDGER_SOURCE.MAIL_ORDER,
          status: SUPPLIER_LEDGER_STATUS.APPROVED,
        })
      }
    }
  }

  memoryOrders[i] = {
    ...order,
    paid: paid >= total - 0.009,
    paidAmount: paid,
    remainingAmount,
  }

  appendDomainEventToStore({
    id: `DOM-${paymentId}-posted`,
    type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt,
    correlationId: `corr-${orderId}-pay-${paymentId}`,
    payloadSchemaVersion: '1',
    payload: {
      transactionId: paymentId,
      amount: amount.toFixed(2),
      currency: 'TRY',
      method,
      ...(body.approvalNote ? { approvalNote: body.approvalNote } : {}),
    },
  })

  appendDomainEventToStore({
    id: `DOM-${paymentId}-approved`,
    type: DOMAIN_EVENT_TYPE.PAYMENT_APPROVED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt,
    correlationId: `corr-${orderId}-pay-approved-${paymentId}`,
    payloadSchemaVersion: '1',
    payload: buildOperationActorPayload('payment.approved', {
      transactionId: paymentId,
      ...(body.approvalNote ? { approvalNote: body.approvalNote } : {}),
    }),
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  return projectLegacyOrderToListItemDto(memoryOrders[i], DEMO_TODAY)
}

/**
 * @param {string} orderId
 * @param {string} paymentId
 * @param {{ rejectionNote?: string }} [body]
 */
export async function rejectOrderPayment(orderId, paymentId, body = {}) {
  await fakeLatency(160)
  if (!canApprovePayments(getCurrentAuthUser()?.role)) {
    throw new Error('Tahsilat red yetkisi yok')
  }
  const txs = getAllPaymentsSnapshot()
  const tx = txs.find((t) => t.id === paymentId && t.salesOrderId === orderId)
  if (!tx) throw new Error('Ödeme kaydı bulunamadı')
  if (tx.status !== PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL) {
    throw new Error('Ödeme onay bekliyor durumunda değil')
  }

  updatePaymentTransaction(paymentId, { status: PAYMENT_TRANSACTION_STATUS.CANCELLED })
  if (tx.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER) {
    updateLedgerEntryByPaymentId(paymentId, { status: SUPPLIER_LEDGER_STATUS.REJECTED })
  }
  const occurredAt = new Date().toISOString()
  appendDomainEventToStore({
    id: `DOM-${paymentId}-rejected`,
    type: DOMAIN_EVENT_TYPE.PAYMENT_REJECTED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt,
    correlationId: `corr-${orderId}-pay-rejected-${paymentId}`,
    payloadSchemaVersion: '1',
    payload: buildOperationActorPayload('payment.rejected', {
      transactionId: paymentId,
      ...(body.rejectionNote ? { rejectionNote: body.rejectionNote } : {}),
    }),
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  const order = memoryOrders.find((o) => o.id === orderId)
  if (!order) throw new Error('Sipariş bulunamadı')
  return projectLegacyOrderToListItemDto(order, DEMO_TODAY)
}

/**
 * @param {string} orderId
 * @param {{ committedShipBy: string, reason: string }} body
 * @returns {Promise<SalesOrderListItemDto>}
 */
export async function patchOrderTermin(orderId, body) {
  await fakeLatency(220)
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')

  const committedShipBy = String(body.committedShipBy ?? '').trim()
  const reason = String(body.reason ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(committedShipBy)) throw new Error('Geçersiz termin tarihi')
  if (!reason) throw new Error('Gerekçe zorunludur')

  const order = memoryOrders[i]
  const oldDate = order.dueDate ?? null
  memoryOrders[i] = { ...order, dueDate: committedShipBy }

  appendDomainEventToStore({
    id: `DOM-termin-${orderId}-${Date.now()}`,
    type: DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: new Date().toISOString(),
    correlationId: `corr-${orderId}-termin-${Date.now()}`,
    payloadSchemaVersion: '1',
    payload: { oldDate, newDate: committedShipBy, reason },
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  return projectLegacyOrderToListItemDto(memoryOrders[i], DEMO_TODAY)
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/missingItem.js').MissingItemDto[]>}
 */
export async function getOrderMissingItems(orderId) {
  await fakeLatency(90)
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')
  return getMissingItemsForOrder(orderId)
}

/**
 * @param {string} orderId
 * @param {{ title: string, quantity: number, reason: string, lineId?: string, supplierNote?: string }} body
 * @returns {Promise<{ missingItem: import('../contracts/v1/missingItem.js').MissingItemDto, order: SalesOrderListItemDto }>}
 */
export async function postOrderMissingItem(orderId, body) {
  await fakeLatency(220)
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')

  const title = String(body.title ?? '').trim()
  const reason = String(body.reason ?? '').trim()
  const quantity = Number(body.quantity)
  if (!title || !reason) throw new Error('Başlık ve gerekçe zorunludur')
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('Geçersiz miktar')

  const id = `OMI-${orderId}-${Date.now()}`
  const createdAt = new Date().toISOString()
  /** @type {import('../contracts/v1/missingItem.js').MissingItemDto} */
  const missingItem = {
    id,
    orderId,
    lineId: body.lineId?.trim() ? body.lineId.trim() : null,
    title,
    quantity: quantity.toFixed(2),
    reason,
    status: MISSING_ITEM_STATUS.OPEN,
    supplierNote: body.supplierNote?.trim() ? body.supplierNote.trim() : null,
    createdAt,
    resolvedAt: null,
  }
  upsertMissingItem(missingItem)

  syncMockOrderDisplayStatusById(orderId)

  appendDomainEventToStore({
    id: `DOM-missing-${id}`,
    type: DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: createdAt,
    correlationId: `corr-${orderId}-missing-${id}-created`,
    payloadSchemaVersion: '1',
    payload: {
      missingItemId: id,
      title,
      quantity: missingItem.quantity,
      reason,
      lineId: missingItem.lineId,
      status: MISSING_ITEM_STATUS.OPEN,
    },
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  return {
    missingItem,
    order: projectLegacyOrderToListItemDto(memoryOrders[i], DEMO_TODAY),
  }
}

/** @param {import('../contracts/v1/missingItemStatuses.js').MissingItemStatus} status */
function missingEventTypeForStatus(status) {
  switch (status) {
    case MISSING_ITEM_STATUS.ORDERED:
      return DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED
    case MISSING_ITEM_STATUS.ARRIVED:
      return DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED
    case MISSING_ITEM_STATUS.READY_FOR_SHIPMENT:
      return DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT
    case MISSING_ITEM_STATUS.RESOLVED:
      return DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED
    default:
      return null
  }
}

/**
 * @param {string} missingItemId
 * @param {{ status: string, supplierNote?: string, resolutionNote?: string }} body
 * @returns {Promise<{ missingItem: import('../contracts/v1/missingItem.js').MissingItemDto, order: SalesOrderListItemDto }>}
 */
export async function patchMissingItemStatus(missingItemId, body) {
  await fakeLatency(220)
  const all = getAllMissingItemsSnapshot()
  const existing = all.find((m) => m.id === missingItemId)
  if (!existing) throw new Error('Eksik kaydı bulunamadı')

  const to = String(body.status ?? '').trim().toUpperCase()
  if (!isMissingItemStatus(to)) throw new Error('Geçersiz durum')
  const from = existing.status
  if (!canTransitionMissingItemStatus(from, to)) {
    throw new Error(`Geçersiz durum geçişi: ${from} → ${to}`)
  }

  const eventType = missingEventTypeForStatus(to)
  if (!eventType) throw new Error('Durum için olay üretilemedi')

  const now = new Date().toISOString()
  const noteMerge =
    body.resolutionNote?.trim() && to === MISSING_ITEM_STATUS.RESOLVED
      ? [existing.supplierNote, body.resolutionNote.trim()].filter(Boolean).join(' · ')
      : body.supplierNote?.trim() ?? existing.supplierNote

  /** @type {import('../contracts/v1/missingItem.js').MissingItemDto} */
  const updated = {
    ...existing,
    status: to,
    supplierNote: noteMerge ?? null,
    resolvedAt: to === MISSING_ITEM_STATUS.RESOLVED ? now : existing.resolvedAt,
  }
  upsertMissingItem(updated)

  appendDomainEventToStore({
    id: `DOM-missing-${missingItemId}-${to}-${Date.now()}`,
    type: eventType,
    aggregateType: 'SalesOrder',
    aggregateId: existing.orderId,
    occurredAt: now,
    correlationId: `corr-${existing.orderId}-missing-${missingItemId}-${to.toLowerCase()}`,
    payloadSchemaVersion: '1',
    payload: {
      missingItemId,
      fromStatus: from,
      toStatus: to,
      title: existing.title,
      ...(body.resolutionNote?.trim() ? { resolutionNote: body.resolutionNote.trim() } : {}),
    },
  })

  syncMockOrderDisplayStatusById(existing.orderId)

  syncAllOperationalTasks()
  snapshotMockSession()
  const orderRow = memoryOrders.find((o) => o.id === existing.orderId)
  if (!orderRow) throw new Error('Sipariş bulunamadı')
  return {
    missingItem: updated,
    order: projectLegacyOrderToListItemDto(orderRow, DEMO_TODAY),
  }
}

/**
 * @param {string} orderId
 * @param {string} missingItemId
 * @param {{ note?: string }} [body]
 * @returns {Promise<{ missingItem: import('../contracts/v1/missingItem.js').MissingItemDto, order: SalesOrderListItemDto }>}
 */
export async function markMissingItemReadyForShipment(orderId, missingItemId, body = {}) {
  await fakeLatency(220)
  const all = getAllMissingItemsSnapshot()
  const existing = all.find((m) => m.id === missingItemId)
  if (!existing) throw new Error('Eksik kaydı bulunamadı')
  const noteLine = body.note?.trim() || 'Parça sevke hazır olarak işaretlendi'
  return patchMissingItemStatus(missingItemId, {
    status: MISSING_ITEM_STATUS.READY_FOR_SHIPMENT,
    supplierNote: [existing.supplierNote, noteLine].filter(Boolean).join(' · '),
  })
}

/**
 * @param {string} orderId
 * @returns {Promise<import('./ordersClient.js').OrderLineDetailDto[]>}
 */
export async function getOrderLines(orderId) {
  await fakeLatency(90)
  const seeds = getOrderLinesForSalesOrder(orderId)
  return seeds.map((s) => ({
    id: s.id,
    salesOrderId: s.salesOrderId,
    title: s.productTitleSnapshot?.trim() || s.title?.trim() || 'Ürün',
    productTitleSnapshot: s.productTitleSnapshot ?? s.title ?? null,
    productId: s.productId ?? null,
    productGroup: s.productGroupSnapshot ?? s.productGroup ?? null,
    productGroupSnapshot: s.productGroupSnapshot ?? s.productGroup ?? null,
    unitPrice: typeof s.unitPrice === 'number' ? s.unitPrice : null,
    lineTotal: typeof s.lineTotal === 'number' ? s.lineTotal : null,
    qtyOrdered: s.qtyOrdered,
    qtyReceived: s.qtyReceived ?? '0',
    supplierId: s.supplierId ?? null,
    supplierNameSnapshot: s.supplierNameSnapshot ?? null,
    configuration:
      s.configuration ??
      (s.lineNote ? { note: s.lineNote } : null),
    configurationSummary: s.configurationSummary ?? null,
    supplyStatus: s.supplyStatus ?? 'NOT_SENT',
    supplyChannel: s.supplyChannel ?? null,
    supplySentAt: s.supplySentAt ?? null,
    supplySentByUserId: s.supplySentByUserId ?? null,
    supplySentByName: s.supplySentByName ?? null,
    warehouseEntryStatus: s.warehouseEntryStatus ?? 'NOT_SENT',
    shipmentReady: s.shipmentReady ?? false,
  }))
}

/**
 * @param {string} orderId
 * @param {{ lineIds: string[], channel: 'MAIL' | 'WHATSAPP' }} body
 */
export async function confirmOrderLineSupplySent(orderId, body) {
  await fakeLatency(120)
  const session = readMockSession()
  const result = confirmSupplySentForOrderLines(orderId, body.lineIds, body.channel, session?.user)
  const lines = getOrderLinesForSalesOrder(orderId)
  const ts = Date.now()
  for (const lineId of body.lineIds) {
    const line = lines.find((l) => l.id === lineId)
    recordAuditEvent({
      id: `DOM-supply-${orderId}-${lineId}-${ts}`,
      type: DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT,
      aggregateId: orderId,
      correlationId: `corr-${orderId}-supply-${lineId}`,
      module: AUDIT_MODULE.SUPPLY,
      recordId: lineId,
      oldValue: 'Verilmedi',
      newValue: 'Verildi',
      description: line?.title ? `${line.title} — tedarik emri verildi` : 'Tedarik emri verildi',
      extraPayload: { channel: body.channel, lineId, lineTitle: line?.title ?? null },
    })
  }
  syncMockOrderDisplayStatusById(orderId)
  snapshotMockSession()
  return result
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export async function revertOrderLineWarehouseArrival(orderId, lineId) {
  await fakeLatency(120)
  const result = revertWarehouseArrivalForOrderLine(orderId, lineId)
  syncMockOrderDisplayStatusById(orderId)
  return result
}

export async function markOrderLineShipmentReady(orderId, lineId) {
  await fakeLatency(120)
  const { markShipmentReadyForOrderLine } = await import('./mockOrderLineStore.js')
  const result = markShipmentReadyForOrderLine(orderId, lineId)
  syncMockOrderDisplayStatusById(orderId)
  return result
}

export async function revertOrderLineShipmentReady(orderId, lineId) {
  await fakeLatency(120)
  const { revertShipmentReadyForOrderLine } = await import('./mockOrderLineStore.js')
  const result = revertShipmentReadyForOrderLine(orderId, lineId)
  syncMockOrderDisplayStatusById(orderId)
  return result
}

export async function revertOrderLineSupplySent(orderId, lineId) {
  await fakeLatency(120)
  const { revertSupplySentForOrderLine } = await import('./mockOrderLineStore.js')
  const result = revertSupplySentForOrderLine(orderId, lineId)
  syncMockOrderDisplayStatusById(orderId)
  return result
}

export async function reconcileOrderLineSupplyState(orderId, lineId) {
  await fakeLatency(120)
  const { reconcileSupplyStateForOrderLine } = await import('./mockOrderLineStore.js')
  const result = reconcileSupplyStateForOrderLine(orderId, lineId)
  syncMockOrderDisplayStatusById(orderId)
  return result
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../contracts/v1/shipment.js').ShipmentDto[]>}
 */
export async function getOrderShipments(orderId) {
  await fakeLatency(90)
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')
  return getShipmentsForSalesOrder(orderId)
}

/**
 * @param {string} orderId
 */
function mockLineSeedsForOrder(orderId) {
  const order = memoryOrders.find((o) => o.id === orderId)
  const seeds = getLineSeedsForSalesOrder(orderId)
  if (seeds.length > 0) {
    return seeds.map((s) => ({
      ...s,
      qtyReceived: s.qtyReceived ?? '0',
      title: s.title?.trim() || order?.product || 'Ürün',
    }))
  }
  return [
    {
      id: `OL-${orderId}-1`,
      salesOrderId: orderId,
      qtyOrdered: '1.00',
      qtyReceived: '1.00',
      title: order?.product?.trim() || 'Ürün',
    },
  ]
}

/**
 * @param {string} orderId
 * @returns {Promise<import('../mappers/shipment/computeShipmentPlanLines.js').ShipmentPlanLineDto[]>}
 */
export async function getShipmentPlanLines(orderId) {
  await fakeLatency(90)
  const order = memoryOrders.find((o) => o.id === orderId)
  if (!order) throw new Error('Sipariş bulunamadı')
  const missingItems = await getOrderMissingItems(orderId)
  return computeShipmentPlanLinesFromSeeds(
    mockLineSeedsForOrder(orderId),
    getShipmentsForSalesOrder(orderId),
    order.product,
    missingItems,
  )
}

/**
 * @param {string} orderId
 * @param {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string, lines?: { orderLineId: string, qty: number }[], allowReceivingRisk?: boolean }} body
 * @returns {Promise<{ shipment: import('../contracts/v1/shipment.js').ShipmentDto, order: SalesOrderListItemDto }>}
 */
export async function postOrderShipment(orderId, body) {
  await fakeLatency(220)
  const i = memoryOrders.findIndex((o) => o.id === orderId)
  if (i === -1) throw new Error('Sipariş bulunamadı')

  const plannedDate = String(body.plannedDate ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) {
    throw new Error('Plan tarihi YYYY-MM-DD olmalı')
  }

  const lineSeeds = mockLineSeedsForOrder(orderId)
  const shipments = getShipmentsForSalesOrder(orderId)
  const missingItems = await getOrderMissingItems(orderId)
  const planLines = computeShipmentPlanLinesFromSeeds(
    lineSeeds,
    shipments,
    memoryOrders[i].product,
    missingItems,
  )

  /** @type {{ orderLineId: string, qty: number }[]} */
  let selected
  if (Array.isArray(body.lines)) {
    if (body.lines.length === 0) throw new Error('En az bir ürün seçilmeli')
    selected = body.lines
  } else {
    selected = buildDefaultShipmentPlanSelection(planLines)
  }
  const validation = validateShipmentPlanSelection(planLines, selected, {
    allowReceivingRisk: body.allowReceivingRisk === true,
  })
  if (!validation.ok) throw new Error(validation.message)

  const { evaluateShipmentCreatePolicies, assertPolicyAllowsProceed } = await import(
    '../policy/evaluateOrderPolicies.js'
  )
  const { MISSING_ITEM_STATUS } = await import('../contracts/v1/missingItemStatuses.js')
  const openMissingLineIds = new Set(
    missingItems
      .filter((m) => m.status !== MISSING_ITEM_STATUS.RESOLVED && m.lineId)
      .map((m) => m.lineId),
  )
  const policyEval = evaluateShipmentCreatePolicies({
    planLines,
    selected,
    allowReceivingRisk: body.allowReceivingRisk === true,
    policyOverrides: body.policyOverrides,
    openMissingLineIds,
  })
  assertPolicyAllowsProceed(policyEval)

  const shipmentId = `SHP-${orderId}-${Date.now()}`
  const now = new Date().toISOString()
  const isPartial = orderHasRemainingAfterPlan(planLines, selected)

  /** @type {import('../contracts/v1/shipment.js').ShipmentDto} */
  const shipment = {
    id: shipmentId,
    salesOrderId: orderId,
    shipmentNumber: `SHP-${Date.now()}`,
    status: SHIPMENT_OPERATION_STATUS.PLANNED,
    originLocationId: 'LOC-IST-1',
    plannedShipDate: plannedDate,
    actualShipDate: null,
    version: 1,
    crewName: body.crewName?.trim() ? body.crewName.trim() : null,
    vehicleNote: body.vehicleNote?.trim() ? body.vehicleNote.trim() : null,
    note: body.note?.trim() ? body.note.trim() : null,
    lines: selected.map((sel, idx) => ({
      id: `SHL-${shipmentId}-${idx + 1}`,
      shipmentId,
      orderLineId: sel.orderLineId,
      qty: sel.qty.toFixed(2),
    })),
  }
  upsertShipment(shipment)

  const order = memoryOrders[i]
  if (!order.shipmentDate) {
    memoryOrders[i] = { ...order, shipmentDate: plannedDate }
  }

  appendDomainEventToStore({
    id: `DOM-shipment-${shipmentId}-planned`,
    type: isPartial ? DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL : DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: now,
    correlationId: `corr-${orderId}-shipment-${shipmentId}-planned`,
    payloadSchemaVersion: '1',
    payload: {
      shipmentId,
      fromStatus: '',
      toStatus: SHIPMENT_OPERATION_STATUS.PLANNED,
      plannedDate,
      isPartial,
      lines: selected,
    },
  })

  if (body.allowReceivingRisk === true) {
    const { buildOperationActorPayload } = await import('../lib/operationActor.js')
    appendDomainEventToStore({
      id: `DOM-policy-${orderId}-receiving-${Date.now()}`,
      type: DOMAIN_EVENT_TYPE.POLICY_OVERRIDE,
      aggregateType: 'SalesOrder',
      aggregateId: orderId,
      occurredAt: now,
      correlationId: `corr-${orderId}-policy-allowReceivingRisk-${Date.now()}`,
      payloadSchemaVersion: '1',
      payload: buildOperationActorPayload('policy.override', {
        code: 'allowReceivingRisk',
        reason:
          body.note?.trim() || 'Ürün gelmeden sevk — operasyon risk override',
        context: 'shipment.create',
        shipmentId,
      }),
    })
  }

  syncAllOperationalTasks()
  snapshotMockSession()
  return {
    shipment,
    order: projectLegacyOrderToListItemDto(memoryOrders[i], DEMO_TODAY),
  }
}

/**
 * @param {string} shipmentId
 * @param {{ status: string, issueNote?: string }} body
 * @returns {Promise<{ shipment: import('../contracts/v1/shipment.js').ShipmentDto, order: SalesOrderListItemDto }>}
 */
export async function patchShipmentStatus(shipmentId, body) {
  await fakeLatency(220)
  const existing = findShipmentById(shipmentId)
  if (!existing) throw new Error('Sevk kaydı bulunamadı')

  const toRaw = String(body.status ?? '').trim().toUpperCase()
  if (!isShipmentOperationStatus(toRaw)) throw new Error('Geçersiz durum')
  const to = toRaw
  const from = existing.status
  if (!canTransitionShipmentStatus(from, to)) {
    throw new Error(`Geçersiz durum geçişi: ${from} → ${to}`)
  }
  if (to === SHIPMENT_OPERATION_STATUS.ISSUE && !body.issueNote?.trim()) {
    throw new Error('Sorun bildirimi için not zorunlu')
  }

  const orderId = existing.salesOrderId
  const now = new Date().toISOString()
  const eventType = shipmentEventTypeForStatus(to)
  /** @type {import('../contracts/v1/shipment.js').ShipmentDto} */
  const updated = {
    ...existing,
    status: to,
    note:
      to === SHIPMENT_OPERATION_STATUS.ISSUE && body.issueNote?.trim()
        ? [existing.note, body.issueNote.trim()].filter(Boolean).join(' · ')
        : existing.note,
    ...(to === SHIPMENT_OPERATION_STATUS.DISPATCHED ? { actualShipDate: now.slice(0, 10) } : {}),
  }
  upsertShipment(updated)

  if (eventType) {
    appendDomainEventToStore({
      id: `DOM-shipment-${shipmentId}-${to}-${Date.now()}`,
      type: eventType,
      aggregateType: 'SalesOrder',
      aggregateId: orderId,
      occurredAt: now,
      correlationId: `corr-${orderId}-shipment-${shipmentId}-${to.toLowerCase()}`,
      payloadSchemaVersion: '1',
      payload: {
        shipmentId,
        fromStatus: from,
        toStatus: to,
        ...(body.issueNote?.trim() ? { issueNote: body.issueNote.trim() } : {}),
      },
    })
  }

  const oi = memoryOrders.findIndex((o) => o.id === orderId)
  if (oi !== -1) {
    if (to === SHIPMENT_OPERATION_STATUS.DELIVERED) {
      const prevStatus = memoryOrders[oi].status
      memoryOrders[oi] = { ...memoryOrders[oi], status: DELIVERED_STATUS }
      appendDomainEventToStore({
        id: `DOM-lifecycle-${orderId}-delivered-${Date.now()}`,
        type: DOMAIN_EVENT_TYPE.ORDER_LIFECYCLE_CHANGED,
        aggregateType: 'SalesOrder',
        aggregateId: orderId,
        occurredAt: now,
        correlationId: `corr-${orderId}-delivered-shipment`,
        payloadSchemaVersion: '1',
        payload: { from: prevStatus, to: DELIVERED_STATUS, via: 'shipment.delivered', shipmentId },
      })
    } else if (to === SHIPMENT_OPERATION_STATUS.DISPATCHED) {
      memoryOrders[oi] = { ...memoryOrders[oi], status: ORDER_SHIPMENT_DISPLAY.DISPATCHED }
    }
  }

  syncAllOperationalTasks()
  snapshotMockSession()
  const orderRow = memoryOrders.find((o) => o.id === orderId)
  if (!orderRow) throw new Error('Sipariş bulunamadı')
  return {
    shipment: findShipmentById(shipmentId) ?? updated,
    order: projectLegacyOrderToListItemDto(orderRow, DEMO_TODAY),
  }
}

/**
 * @param {string} [todayIso]
 * @returns {Promise<number>}
 */
export async function processMockDeliveryConfirmationQueue(todayIso = DEMO_TODAY) {
  await fakeLatency(40)
  const plans = loadAllShipmentPlans()
  const orderStatusById = new Map(memoryOrders.map((o) => [o.id, o.status]))
  const now = new Date().toISOString()
  /** @type {import('../state/shipmentPlanStore.js').ShipmentPlan[]} */
  const promoted = []

  for (const plan of plans) {
    const orderStatus = orderStatusById.get(plan.orderId)
    if (!shouldPromoteToConfirmationQueue(plan, todayIso, orderStatus)) continue
    promoted.push({
      ...plan,
      id: plan.id ?? `plan-${plan.orderId}`,
      status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
      updatedAt: now,
    })
    const oi = memoryOrders.findIndex((o) => o.id === plan.orderId)
    if (oi !== -1) {
      memoryOrders[oi] = {
        ...memoryOrders[oi],
        status: ORDER_SHIPMENT_DISPLAY.PENDING_DELIVERY_CONFIRM,
      }
    }
    appendDomainEventToStore({
      id: `DOM-delivery-confirm-${plan.orderId}-${Date.now()}`,
      type: DOMAIN_EVENT_TYPE.DELIVERY_CONFIRMATION_REQUIRED,
      aggregateType: 'SalesOrder',
      aggregateId: plan.orderId,
      occurredAt: now,
      correlationId: `corr-${plan.orderId}-delivery-confirm-${plan.id ?? plan.orderId}`,
      payloadSchemaVersion: '1',
      payload: {
        planId: plan.id ?? `plan-${plan.orderId}`,
        plannedDate: plan.plannedDate,
        previousStatus: plan.status ?? SHIPMENT_PLAN_STATUS.PLANNED,
      },
    })
  }

  if (promoted.length) {
    saveShipmentPlansBatch(promoted)
    snapshotMockSession()
  }
  return promoted.length
}

/**
 * @param {string} planId
 */
function findMockPlanById(planId) {
  const plans = loadAllShipmentPlans()
  return plans.find((p) => p.id === planId || p.orderId === planId) ?? null
}

/**
 * @param {string} planId
 * @param {{ deliveredBy: string, vehicle: string, deliveredAt: string, deliveryNote?: string, customerConfirmNote?: string }} body
 */
export async function confirmPlanDelivery(planId, body) {
  await fakeLatency(220)
  const plan = findMockPlanById(planId)
  if (!plan) throw new Error('Sevk planı bulunamadı')
  if (plan.status !== SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    throw new Error('Plan teslim onayı beklemiyor')
  }

  const orderId = plan.orderId
  const shipments = getShipmentsForSalesOrder(orderId)
  const shipment = shipments[shipments.length - 1]
  if (shipment) {
    const current = shipmentStatusOrPlanned(findShipmentById(shipment.id)?.status ?? shipment.status)
    const chain = buildShipmentAdvanceChain(current, SHIPMENT_OPERATION_STATUS.DELIVERED)
    for (const step of chain) {
      if (step === SHIPMENT_OPERATION_STATUS.DELIVERED) {
        await patchShipmentStatus(shipment.id, {
          status: step,
          deliveredBy: body.deliveredBy,
          vehicle: body.vehicle,
          deliveredAt: body.deliveredAt,
          ...(body.deliveryNote ? { deliveryNote: body.deliveryNote } : {}),
          ...(body.customerConfirmNote ? { customerConfirmNote: body.customerConfirmNote } : {}),
        })
      } else {
        await patchShipmentStatus(shipment.id, { status: step })
      }
    }
  } else {
    const oi = memoryOrders.findIndex((o) => o.id === orderId)
    if (oi !== -1) memoryOrders[oi] = { ...memoryOrders[oi], status: DELIVERED_STATUS }
  }

  const now = new Date().toISOString()
  const saved = saveShipmentPlan({
    ...plan,
    id: plan.id ?? `plan-${orderId}`,
    status: SHIPMENT_PLAN_STATUS.DELIVERED,
    updatedAt: now,
  })

  appendDomainEventToStore({
    id: `DOM-delivery-confirmed-${orderId}-${Date.now()}`,
    type: DOMAIN_EVENT_TYPE.DELIVERY_CONFIRMED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: now,
    correlationId: `corr-${orderId}-delivery-confirmed-${planId}`,
    payloadSchemaVersion: '1',
    payload: {
      planId: saved.id,
      deliveredBy: body.deliveredBy,
      vehicle: body.vehicle,
      deliveredAt: body.deliveredAt,
      crewPrimary: plan.crew1,
      crewSecondary: plan.crew2,
    },
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  const orderRow = memoryOrders.find((o) => o.id === orderId)
  if (!orderRow) throw new Error('Sipariş bulunamadı')
  return { plan: saved, order: projectLegacyOrderToListItemDto(orderRow, DEMO_TODAY) }
}

/**
 * @param {string} planId
 * @param {{ reason: string, note?: string }} body
 */
export async function failPlanDelivery(planId, body) {
  await fakeLatency(220)
  const plan = findMockPlanById(planId)
  if (!plan) throw new Error('Sevk planı bulunamadı')
  if (plan.status !== SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    throw new Error('Plan teslim onayı beklemiyor')
  }

  const orderId = plan.orderId
  const now = new Date().toISOString()
  const oi = memoryOrders.findIndex((o) => o.id === orderId)
  if (oi !== -1) {
    memoryOrders[oi] = { ...memoryOrders[oi], status: 'Sevke Hazır' }
  }

  const saved = saveShipmentPlan({
    ...plan,
    id: plan.id ?? `plan-${orderId}`,
    status: SHIPMENT_PLAN_STATUS.DELIVERY_FAILED,
    updatedAt: now,
  })

  appendDomainEventToStore({
    id: `DOM-delivery-failed-${orderId}-${Date.now()}`,
    type: DOMAIN_EVENT_TYPE.DELIVERY_FAILED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: now,
    correlationId: `corr-${orderId}-delivery-failed-${planId}`,
    payloadSchemaVersion: '1',
    payload: { planId: saved.id, reason: body.reason, ...(body.note ? { note: body.note } : {}) },
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  const orderRow = memoryOrders.find((o) => o.id === orderId)
  if (!orderRow) throw new Error('Sipariş bulunamadı')
  return { plan: saved, order: projectLegacyOrderToListItemDto(orderRow, DEMO_TODAY) }
}

/**
 * @param {string} planId
 * @param {{ newDate: string, note?: string }} body
 */
export async function postponePlanDelivery(planId, body) {
  await fakeLatency(220)
  const plan = findMockPlanById(planId)
  if (!plan) throw new Error('Sevk planı bulunamadı')
  if (plan.status !== SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM) {
    throw new Error('Plan teslim onayı beklemiyor')
  }

  const orderId = plan.orderId
  const now = new Date().toISOString()
  const previousDate = plan.plannedDate

  appendDomainEventToStore({
    id: `DOM-delivery-postponed-${orderId}-${Date.now()}`,
    type: DOMAIN_EVENT_TYPE.DELIVERY_POSTPONED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: now,
    correlationId: `corr-${orderId}-delivery-postponed-${planId}-${body.newDate}`,
    payloadSchemaVersion: '1',
    payload: {
      planId: plan.id ?? `plan-${orderId}`,
      previousDate,
      newDate: body.newDate,
      ...(body.note ? { note: body.note } : {}),
    },
  })

  const saved = saveShipmentPlan({
    ...plan,
    id: plan.id ?? `plan-${orderId}`,
    plannedDate: body.newDate,
    status: SHIPMENT_PLAN_STATUS.PLANNED,
    updatedAt: now,
  })

  const oi = memoryOrders.findIndex((o) => o.id === orderId)
  if (oi !== -1) {
    memoryOrders[oi] = { ...memoryOrders[oi], status: 'Planlandı', shipmentDate: body.newDate }
  }

  syncAllOperationalTasks()
  snapshotMockSession()
  const orderRow = memoryOrders.find((o) => o.id === orderId)
  if (!orderRow) throw new Error('Sipariş bulunamadı')
  return { plan: saved, order: projectLegacyOrderToListItemDto(orderRow, DEMO_TODAY) }
}

/** @param {string} planId */
export async function revertPlanDelivery(planId) {
  await fakeLatency(220)
  const auth = getCurrentAuthUser()
  if (auth?.role !== 'ADMIN' && auth?.role !== 'MANAGER') {
    throw new Error('Teslim geri alma yetkisi yok')
  }

  const plan = findMockPlanById(planId)
  if (!plan) throw new Error('Sevk planı bulunamadı')
  if (plan.status !== SHIPMENT_PLAN_STATUS.DELIVERED) {
    throw new Error('Sadece teslim edilmiş plan geri alınabilir')
  }

  const orderId = plan.orderId
  const now = new Date().toISOString()
  const oi = memoryOrders.findIndex((o) => o.id === orderId)
  if (oi !== -1) {
    memoryOrders[oi] = { ...memoryOrders[oi], status: 'Sevke Hazır' }
  }

  const saved = saveShipmentPlan({
    ...plan,
    status: SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
    updatedAt: now,
  })

  appendDomainEventToStore({
    id: `DOM-delivery-reverted-${orderId}-${Date.now()}`,
    type: DOMAIN_EVENT_TYPE.DELIVERY_REVERTED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: now,
    correlationId: `corr-${orderId}-delivery-reverted-${planId}`,
    payloadSchemaVersion: '1',
    payload: { planId: saved.id },
  })

  syncAllOperationalTasks()
  snapshotMockSession()
  const orderRow = memoryOrders.find((o) => o.id === orderId)
  if (!orderRow) throw new Error('Sipariş bulunamadı')
  return { plan: saved, order: projectLegacyOrderToListItemDto(orderRow, DEMO_TODAY) }
}
