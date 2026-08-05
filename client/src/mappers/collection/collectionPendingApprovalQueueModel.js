import { PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { extractEventActor } from '../audit/mapDomainEventsToAuditFeed.js'
import { formatShortDate } from '../../utils/dates.js'
import {
  paymentApprovalAgeHint,
  resolvePaymentApprovalAgeTier,
} from '../../lib/paymentApprovalAge.js'
import { getPendingApprovalPayments } from '../../services/mockPaymentStore.js'
import { PAYMENT_TRANSACTION_KIND } from '../../contracts/v1/enums.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import { fetchOrderPaymentsFromApi } from '../../services/realOrdersApi.js'

/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

/** @typedef {'normal' | 'warning' | 'critical'} PaymentApprovalAgeTier */

const PAYMENT_METHOD_LABELS = {
  CASH: 'Nakit',
  CARD: 'Kart',
  TRANSFER: 'Havale / EFT',
  CHECK: 'Çek',
  MAIL_ORDER: 'Mail order',
  OTHER: 'Diğer',
}

/**
 * @typedef {Object} PendingApprovalQueueRow
 * @property {string} paymentId
 * @property {string} orderId
 * @property {string} orderNo
 * @property {string} customer
 * @property {number} amount
 * @property {string} amountLabel
 * @property {string} methodLabel
 * @property {string} supplierLabel
 * @property {string} actorLabel
 * @property {string} dateLabel
 * @property {string} description
 * @property {string} occurredAt
 * @property {PaymentApprovalAgeTier} ageTier
 * @property {string | null} ageHint
 */

/**
 * @param {DomainEventDto[]} domainEvents
 * @returns {Map<string, { actor?: string, note?: string }>}
 */
function buildPendingPaymentEventMeta(domainEvents) {
  /** @type {Map<string, { actor?: string, note?: string }>} */
  const map = new Map()
  for (const e of domainEvents) {
    if (e.type !== 'payment.pending') continue
    const p = e.payload ?? {}
    const txId = typeof p.transactionId === 'string' ? p.transactionId : null
    if (!txId) continue
    const note = typeof p.note === 'string' && p.note.trim() ? p.note.trim() : undefined
    const actor = extractEventActor(e) ?? undefined
    map.set(txId, { actor, note })
  }
  return map
}

/**
 * @param {PaymentTransactionDto} tx
 * @param {{ actor?: string, note?: string } | undefined} meta
 */
function queueRowDescription(tx, meta) {
  if (meta?.note) return meta.note
  const ref = tx.externalRef?.trim()
  if (ref) return ref
  return '—'
}

function queueRowSupplierLabel(tx) {
  if (tx.kind !== PAYMENT_TRANSACTION_KIND.MAIL_ORDER) return '—'
  if (tx.mailOrderSupplierName?.trim()) return tx.mailOrderSupplierName.trim()
  if (tx.mailOrderSupplierId?.trim()) return tx.mailOrderSupplierId.trim()
  return '—'
}

/**
 * @param {CollectionRowVM[]} collectionRows
 * @param {DomainEventDto[]} domainEvents
 * @param {string} todayIso
 * @param {PaymentTransactionDto[]} transactions
 * @returns {PendingApprovalQueueRow[]}
 */
export function buildPendingApprovalQueueRows(
  collectionRows,
  domainEvents,
  todayIso,
  transactions = [],
  dtoById = new Map(),
) {
  const orderById = new Map(collectionRows.map((row) => [row.id, row]))
  const metaByTx = buildPendingPaymentEventMeta(domainEvents)
  const nowIso = `${todayIso}T12:00:00.000Z`

  return transactions
    .map((tx) => {
      const order = orderById.get(tx.salesOrderId)
      const dto = dtoById.get(tx.salesOrderId)
      const meta = metaByTx.get(tx.id)
      const amount = Number.parseFloat(tx.amount.amount)
      const ageTier = resolvePaymentApprovalAgeTier(tx.occurredAt, nowIso)

      return /** @type {PendingApprovalQueueRow} */ ({
        paymentId: tx.id,
        orderId: tx.salesOrderId,
        orderNo: tx.salesOrderId,
        customer: order?.customer ?? dto?.customerDisplayName ?? '—',
        amount,
        amountLabel: formatTry(amount),
        methodLabel: PAYMENT_METHOD_LABELS[tx.method] ?? tx.method,
        supplierLabel: queueRowSupplierLabel(tx),
        actorLabel: meta?.actor ?? '—',
        dateLabel: formatShortDate(tx.occurredAt.slice(0, 10)),
        description: queueRowDescription(tx, meta),
        occurredAt: tx.occurredAt,
        ageTier,
        ageHint: paymentApprovalAgeHint(ageTier),
      })
    })
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
}

export { resolvePaymentApprovalAgeTier, paymentApprovalAgeHint }

/**
 * Mock modda bellek store; API modda onay bekleyen siparişlerin gerçek ödeme kayıtları.
 * @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} [listItemDtos]
 * @returns {Promise<PaymentTransactionDto[]>}
 */
export async function loadPendingApprovalPayments(listItemDtos = []) {
  const base = getApiBaseUrl()
  if (!base) return getPendingApprovalPayments()

  const orderIds = listItemDtos
    .filter((d) => (d.pendingApprovalPaymentCount ?? 0) > 0)
    .map((d) => d.id)

  if (orderIds.length === 0) return []

  const batches = await Promise.all(orderIds.map((id) => fetchOrderPaymentsFromApi(base, id)))
  return batches
    .flat()
    .filter((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
}

/**
 * @param {string[]} orderIds
 * @returns {Promise<Map<string, PaymentTransactionDto[]>>}
 */
export async function loadPaymentsIndexForOrders(orderIds) {
  /** @type {Map<string, PaymentTransactionDto[]>} */
  const map = new Map()
  if (orderIds.length === 0) return map

  const base = getApiBaseUrl()
  if (!base) {
    const { getPaymentTransactionsForSalesOrder } = await import('../../services/mockPaymentStore.js')
    for (const id of orderIds) {
      map.set(id, getPaymentTransactionsForSalesOrder(id))
    }
    return map
  }

  const batches = await Promise.all(orderIds.map((id) => fetchOrderPaymentsFromApi(base, id)))
  orderIds.forEach((id, index) => {
    map.set(id, batches[index] ?? [])
  })
  return map
}
