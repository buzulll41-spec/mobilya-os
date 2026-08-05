import { PAYMENT_TRANSACTION_KIND, PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { extractEventActor } from '../audit/mapDomainEventsToAuditFeed.js'
import {
  paymentApprovalAgeHint,
  resolvePaymentApprovalAgeTier,
} from '../../lib/paymentApprovalAge.js'
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/** @typedef {'complete' | 'partial' | 'none' | 'overpaid'} OrderPaymentStatusId */
/** @typedef {'green' | 'orange' | 'red' | 'purple'} OrderPaymentStatusTone */

/**
 * @typedef {Object} OrderPaymentStatus
 * @property {OrderPaymentStatusId} id
 * @property {string} label
 * @property {OrderPaymentStatusTone} tone
 */

const PAYMENT_METHOD_LABELS = {
  CASH: 'Nakit',
  CARD: 'Kart',
  TRANSFER: 'Havale / EFT',
  CHECK: 'Çek',
  MAIL_ORDER: 'Mail order',
  OTHER: 'Diğer',
}

const TX_STATUS_LABELS = {
  [PAYMENT_TRANSACTION_STATUS.POSTED]: 'Onaylandı',
  [PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL]: 'Onay Bekliyor',
  [PAYMENT_TRANSACTION_STATUS.PENDING]: 'Beklemede',
  [PAYMENT_TRANSACTION_STATUS.FAILED]: 'Başarısız',
  [PAYMENT_TRANSACTION_STATUS.CANCELLED]: 'Reddedildi',
}

/** @param {DomainEventDto[]} events */
function buildPaymentApprovalMeta(events) {
  /** @type {Map<string, { approver?: string, rejector?: string }>} */
  const map = new Map()
  for (const e of events) {
    const p = e.payload ?? {}
    const txId = typeof p.transactionId === 'string' ? p.transactionId : null
    if (!txId) continue
    const actor = extractEventActor(e) ?? undefined
    if (e.type === 'payment.approved' || e.type === 'mailOrder.approved') {
      map.set(txId, { ...map.get(txId), approver: actor })
    }
    if (e.type === 'payment.rejected' || e.type === 'mailOrder.rejected') {
      map.set(txId, { ...map.get(txId), rejector: actor })
    }
  }
  return map
}

/**
 * @param {Order} order
 * @param {number} remaining
 * @param {PaymentTransactionDto[]} [transactions]
 * @returns {OrderPaymentStatus}
 */
export function resolveOrderPaymentStatus(order, remaining, transactions = []) {
  const total = order.amount
  const collected = order.paid ? total : (order.paidAmount ?? 0)
  const hasRefund = transactions.some(
    (t) =>
      (t.kind === PAYMENT_TRANSACTION_KIND.REFUND ||
        t.kind === PAYMENT_TRANSACTION_KIND.CHARGEBACK) &&
      t.status === PAYMENT_TRANSACTION_STATUS.POSTED,
  )

  if (collected > total + 0.009 || hasRefund) {
    return { id: 'overpaid', label: 'Fazla ödeme / iade', tone: 'purple' }
  }
  if (order.paid || remaining <= 0.009) {
    return { id: 'complete', label: 'Tamamlandı', tone: 'green' }
  }
  if (collected > 0.009) {
    return { id: 'partial', label: 'Kısmi ödeme', tone: 'orange' }
  }
  return { id: 'none', label: 'Ödeme yok', tone: 'red' }
}

/**
 * @param {OrderPaymentStatusTone} tone
 * @returns {'success' | 'warning' | 'critical' | 'neutral'}
 */
export function paymentStatusToSummaryTone(tone) {
  switch (tone) {
    case 'green':
      return 'success'
    case 'orange':
      return 'warning'
    case 'red':
      return 'critical'
    default:
      return 'neutral'
  }
}

/**
 * @param {Order} order
 * @param {number} remaining
 * @param {number} paidPct
 * @param {string | null} lastPaymentDate
 * @param {OrderPaymentStatus} paymentStatus
 */
export function buildOrderPanelPaymentsSummary(order, remaining, paidPct, lastPaymentDate, paymentStatus) {
  const total = order.amount
  const collected = order.paid ? total : (order.paidAmount ?? 0)

  return [
    { id: 'total', label: 'Toplam Tutar', value: formatTry(total), valueTone: /** @type {const} */ ('neutral') },
    {
      id: 'collected',
      label: 'Tahsil Edilen',
      value: formatTry(collected),
      valueTone: collected > 0.009 ? /** @type {const} */ ('success') : /** @type {const} */ ('neutral'),
    },
    {
      id: 'remaining',
      label: 'Kalan Bakiye',
      value: formatTry(remaining),
      valueTone: remaining > 0.009 ? /** @type {const} */ ('critical') : /** @type {const} */ ('success'),
    },
    {
      id: 'rate',
      label: 'Tahsilat Oranı',
      value: `%${paidPct}`,
      valueTone:
        paidPct >= 100
          ? /** @type {const} */ ('success')
          : paidPct > 0
            ? /** @type {const} */ ('warning')
            : /** @type {const} */ ('critical'),
    },
    {
      id: 'last',
      label: 'Son Ödeme',
      value: lastPaymentDate ? formatShortDate(lastPaymentDate) : '—',
      valueTone: /** @type {const} */ ('neutral'),
    },
    {
      id: 'status',
      label: 'Ödeme Durumu',
      value: paymentStatus.label,
      valueTone: paymentStatusToSummaryTone(paymentStatus.tone),
    },
  ]
}

/**
 * @typedef {Object} OrderPanelPaymentRow
 * @property {string} id
 * @property {string} dateLabel
 * @property {number} amount
 * @property {string} amountLabel
 * @property {boolean} isCredit
 * @property {string} methodLabel
 * @property {string} supplierLabel
 * @property {string} description
 * @property {string} actorLabel
 * @property {string} approverLabel
 * @property {string} statusLabel
 * @property {'posted' | 'pending' | 'failed' | 'cancelled'} statusTone
 * @property {boolean} canPrint
 * @property {boolean} isPendingApproval
 * @property {'normal' | 'warning' | 'critical'} ageTier
 * @property {string | null} ageHint
 * @property {string} occurredAt
 */
/**
 * @param {DomainEventDto[]} events
 * @returns {Map<string, { note?: string, actor?: string }>}
 */
function buildPaymentEventMeta(events) {
  /** @type {Map<string, { note?: string, actor?: string }>} */
  const map = new Map()
  for (const e of events) {
    if (e.type !== 'payment.posted') continue
    const p = e.payload ?? {}
    const txId = typeof p.transactionId === 'string' ? p.transactionId : null
    if (!txId) continue
    const note = typeof p.note === 'string' && p.note.trim() ? p.note.trim() : undefined
    const actor = extractEventActor(e) ?? undefined
    map.set(txId, { note, actor })
  }
  return map
}

/** @param {DomainEventDto[]} events */
function buildPendingPaymentEventMeta(events) {
  /** @type {Map<string, { note?: string, actor?: string }>} */
  const map = new Map()
  for (const e of events) {
    if (e.type !== 'payment.pending') continue
    const p = e.payload ?? {}
    const txId = typeof p.transactionId === 'string' ? p.transactionId : null
    if (!txId) continue
    const note = typeof p.note === 'string' && p.note.trim() ? p.note.trim() : undefined
    const actor = extractEventActor(e) ?? undefined
    map.set(txId, { note, actor })
  }
  return map
}

/** @param {PaymentTransactionDto} tx */
function resolveMailOrderSupplierLabel(tx) {
  if (tx.kind !== PAYMENT_TRANSACTION_KIND.MAIL_ORDER) return '—'
  if (tx.mailOrderSupplierName?.trim()) return tx.mailOrderSupplierName.trim()
  if (tx.mailOrderSupplierId?.trim()) return tx.mailOrderSupplierId.trim()
  return '—'
}

/**
 * @param {PaymentTransactionDto} tx
 * @param {{ note?: string, actor?: string } | undefined} meta
 */
function paymentRowDescription(tx, meta) {
  if (meta?.note) return meta.note
  const ref = tx.externalRef?.trim()
  if (ref) return ref
  if (tx.kind === PAYMENT_TRANSACTION_KIND.REFUND) return 'İade'
  if (tx.kind === PAYMENT_TRANSACTION_KIND.CHARGEBACK) return 'Chargeback'
  if (tx.kind === PAYMENT_TRANSACTION_KIND.ADJUSTMENT) return 'Düzeltme'
  if (tx.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER) return 'Mail order tahsilatı'
  return '—'
}

/**
 * @param {PaymentTransactionDto[]} transactions
 * @param {DomainEventDto[]} domainEvents
 */
export function buildOrderPanelPaymentRows(transactions, domainEvents) {
  const metaByTx = buildPaymentEventMeta(domainEvents)
  const pendingMetaByTx = buildPendingPaymentEventMeta(domainEvents)
  const approvalMeta = buildPaymentApprovalMeta(domainEvents)

  return [...transactions]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .map((tx) => {
      const raw = Number.parseFloat(tx.amount.amount)
      const isRefund =
        tx.kind === PAYMENT_TRANSACTION_KIND.REFUND ||
        tx.kind === PAYMENT_TRANSACTION_KIND.CHARGEBACK
      const signed = isRefund ? -Math.abs(raw) : Math.abs(raw)
      const meta = metaByTx.get(tx.id) ?? pendingMetaByTx.get(tx.id)
      const approval = approvalMeta.get(tx.id)
      const isPendingApproval = tx.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL
      const ageTier = isPendingApproval ? resolvePaymentApprovalAgeTier(tx.occurredAt) : 'normal'

      /** @type {'posted' | 'pending' | 'failed' | 'cancelled'} */
      let statusTone = 'posted'
      if (isPendingApproval) statusTone = 'pending'
      else if (tx.status === PAYMENT_TRANSACTION_STATUS.PENDING) statusTone = 'pending'
      else if (tx.status === PAYMENT_TRANSACTION_STATUS.FAILED) statusTone = 'failed'
      else if (tx.status === PAYMENT_TRANSACTION_STATUS.CANCELLED) statusTone = 'cancelled'

      return /** @type {OrderPanelPaymentRow} */ ({
        id: tx.id,
        dateLabel: formatShortDate(tx.occurredAt.slice(0, 10)),
        amount: signed,
        amountLabel: `${signed >= 0 ? '+' : ''}${formatTry(signed)}`,
        isCredit: signed >= 0,
        methodLabel: PAYMENT_METHOD_LABELS[tx.method] ?? tx.method,
        supplierLabel: resolveMailOrderSupplierLabel(tx),
        description: paymentRowDescription(tx, meta),
        actorLabel: meta?.actor ?? '—',
        approverLabel:
          approval?.approver ??
          (tx.status === PAYMENT_TRANSACTION_STATUS.CANCELLED ? approval?.rejector ?? '—' : '—'),
        statusLabel: TX_STATUS_LABELS[tx.status] ?? tx.status,
        statusTone,
        canPrint:
          tx.status === PAYMENT_TRANSACTION_STATUS.POSTED &&
          tx.kind !== PAYMENT_TRANSACTION_KIND.REFUND &&
          tx.kind !== PAYMENT_TRANSACTION_KIND.CHARGEBACK,
        isPendingApproval,
        ageTier,
        ageHint: isPendingApproval ? paymentApprovalAgeHint(ageTier) : null,
        occurredAt: tx.occurredAt,
      })
    })
}

/**
 * @param {PaymentTransactionDto[]} transactions
 * @returns {string | null}
 */
export function resolveLastPaymentDate(transactions) {
  const posted = transactions
    .filter(
      (t) =>
        t.status === PAYMENT_TRANSACTION_STATUS.POSTED &&
        t.kind !== PAYMENT_TRANSACTION_KIND.REFUND &&
        t.kind !== PAYMENT_TRANSACTION_KIND.CHARGEBACK,
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  return posted[0]?.occurredAt.slice(0, 10) ?? null
}

/**
 * @param {OrderPanelPaymentRow[]} rows
 */
export function buildOrderPanelPaymentsFooter(rows) {
  const postedTotal = rows
    .filter((r) => r.statusTone === 'posted')
    .reduce((sum, r) => sum + r.amount, 0)
  const count = rows.length
  return { postedTotal, count }
}
