import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../contracts/v1/supplierLedgerEntryTypes.js'
import {
  SUPPLIER_LEDGER_SOURCE,
  SUPPLIER_LEDGER_STATUS,
} from '../contracts/v1/supplierLedgerStatuses.js'
import {
  computeOpenBalanceFromLedger,
  formatLedgerMoney,
} from '../mappers/supply/supplierLedgerBalance.js'

/** @typedef {import('../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */

/** @type {Map<string, SupplierLedgerEntryDto[]>} */
const memoryBySupplier = new Map()

function seedLedger() {
  if (memoryBySupplier.size > 0) return
  memoryBySupplier.set('sup-abc', [
    {
      id: 'sle-abc-1',
      supplierId: 'sup-abc',
      entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
      occurredAt: '2026-05-14',
      description: 'Mayer Köşe Takımı — gelen ürün',
      debitAmount: '0.00',
      creditAmount: '45000.00',
      balanceAfter: '45000.00',
      currency: 'TRY',
      paymentMethod: null,
      documentNo: 'FTR-2026-014',
      createdAt: '2026-05-14T09:00:00.000Z',
    },
  ])
  memoryBySupplier.set('sup-delta', [
    {
      id: 'sle-dlt-1',
      supplierId: 'sup-delta',
      entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
      occurredAt: '2026-05-13',
      description: 'Koltuk grubu mal girişi',
      debitAmount: '0.00',
      creditAmount: '12000.00',
      balanceAfter: '12000.00',
      currency: 'TRY',
      paymentMethod: null,
      documentNo: null,
      createdAt: '2026-05-13T12:00:00.000Z',
    },
  ])
}

export function hydrateSupplierLedgerStore() {
  seedLedger()
}

export function resetMockSupplierLedgerStore() {
  memoryBySupplier.clear()
}

/**
 * @param {string} supplierId
 */
export function getLedgerForSupplier(supplierId) {
  hydrateSupplierLedgerStore()
  const rows = memoryBySupplier.get(supplierId) ?? []
  return rows.map((r) => ({ ...r })).sort((a, b) => {
    const d = b.occurredAt.localeCompare(a.occurredAt)
    if (d !== 0) return d
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/**
 * @param {string} supplierId
 */
export function getOpenBalanceForSupplier(supplierId) {
  return computeOpenBalanceFromLedger(getLedgerForSupplier(supplierId))
}

/**
 * @param {SupplierLedgerEntryDto} entry
 */
export function appendLedgerEntry(entry) {
  hydrateSupplierLedgerStore()
  const list = memoryBySupplier.get(entry.supplierId) ?? []
  list.push({ ...entry })
  memoryBySupplier.set(entry.supplierId, list)
  return { ...entry }
}

/**
 * @param {string} supplierId
 * @param {{
 *   entryType: string
 *   occurredAt: string
 *   description: string
 *   debitAmount: string
 *   creditAmount: string
 *   paymentMethod?: string | null
 *   documentNo?: string | null
 *   paymentTransactionId?: string | null
 *   salesOrderId?: string | null
 *   customerNameSnapshot?: string | null
 *   productTitleSnapshot?: string | null
 *   source?: string | null
 *   status?: string
 *   reversesEntryId?: string | null
 * }} draft
 */
export function appendLedgerDraft(supplierId, draft) {
  const before = getOpenBalanceForSupplier(supplierId)
  const debit = Number.parseFloat(draft.debitAmount) || 0
  const credit = Number.parseFloat(draft.creditAmount) || 0
  const status = draft.status ?? SUPPLIER_LEDGER_STATUS.APPROVED
  const affectsBalance = status === SUPPLIER_LEDGER_STATUS.APPROVED || status === SUPPLIER_LEDGER_STATUS.REVERSED
  const balanceAfter = affectsBalance
    ? formatLedgerMoney(before + credit - debit)
    : formatLedgerMoney(before)
  const entry = /** @type {SupplierLedgerEntryDto} */ ({
    id: `sle-${supplierId}-${Date.now()}`,
    supplierId,
    entryType: draft.entryType,
    occurredAt: draft.occurredAt,
    description: draft.description,
    debitAmount: draft.debitAmount,
    creditAmount: draft.creditAmount,
    balanceAfter,
    currency: 'TRY',
    paymentMethod: draft.paymentMethod ?? null,
    documentNo: draft.documentNo ?? null,
    paymentTransactionId: draft.paymentTransactionId ?? null,
    salesOrderId: draft.salesOrderId ?? null,
    customerNameSnapshot: draft.customerNameSnapshot ?? null,
    productTitleSnapshot: draft.productTitleSnapshot ?? null,
    source: draft.source ?? null,
    status,
    reversesEntryId: draft.reversesEntryId ?? null,
    createdAt: new Date().toISOString(),
  })
  appendLedgerEntry(entry)
  return entry
}

/**
 * @param {string} paymentTransactionId
 * @param {Partial<SupplierLedgerEntryDto>} patch
 */
export function updateLedgerEntryByPaymentId(paymentTransactionId, patch) {
  hydrateSupplierLedgerStore()
  for (const [supplierId, rows] of memoryBySupplier.entries()) {
    const index = rows.findIndex((r) => r.paymentTransactionId === paymentTransactionId)
    if (index === -1) continue
    const next = { ...rows[index], ...patch }
    if (patch.status === SUPPLIER_LEDGER_STATUS.APPROVED) {
      const before = getOpenBalanceForSupplier(supplierId)
      const credit = Number.parseFloat(next.creditAmount) || 0
      next.balanceAfter = formatLedgerMoney(before + credit)
    }
    rows[index] = next
    memoryBySupplier.set(supplierId, rows)
    return next
  }
  return null
}
