import { DEMO_TODAY } from '../data/constants.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../contracts/v1/supplierLedgerEntryTypes.js'
import { formatLedgerMoney } from '../mappers/supply/supplierLedgerBalance.js'
import {
  createSupplierInStore,
  findSupplierById,
  getAllSuppliersSnapshot,
  upsertSupplier,
} from './mockSupplierStore.js'
import {
  appendLedgerDraft,
  getLedgerForSupplier,
  getOpenBalanceForSupplier,
} from './mockSupplierLedgerStore.js'

/** @typedef {import('../contracts/v1/supplier.js').SupplierListItemDto} SupplierListItemDto */
/** @typedef {import('../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../contracts/v1/supplier.js').CreateSupplierRequest} CreateSupplierRequest */
/** @typedef {import('../contracts/v1/supplier.js').PatchSupplierRequest} PatchSupplierRequest */
/** @typedef {import('../contracts/v1/supplierLedgerEntry.js').PostSupplierPaymentRequest} PostSupplierPaymentRequest */
/** @typedef {import('../contracts/v1/supplierLedgerEntry.js').PostSupplierPaymentResult} PostSupplierPaymentResult */

/**
 * @param {SupplierDetailDto} row
 * @returns {SupplierListItemDto}
 */
function toListItem(row) {
  const openBalance = formatLedgerMoney(getOpenBalanceForSupplier(row.id))
  const ledger = getLedgerForSupplier(row.id)
  return {
    id: row.id,
    code: row.code,
    companyName: row.companyName,
    contactName: row.contactName,
    phone: row.phone,
    openBalance,
    currency: row.currency,
    lastMovementAt: ledger[0]?.occurredAt ?? null,
    isActive: row.isActive,
  }
}

/**
 * @param {SupplierDetailDto} row
 * @returns {SupplierDetailDto}
 */
function refreshSupplierBalances(row) {
  const openBalance = formatLedgerMoney(getOpenBalanceForSupplier(row.id))
  const ledger = getLedgerForSupplier(row.id)
  const updated = {
    ...row,
    openBalance,
    lastMovementAt: ledger[0]?.occurredAt ?? null,
    updatedAt: new Date().toISOString(),
  }
  upsertSupplier(updated)
  return updated
}

/**
 * @param {{ q?: string, activeOnly?: boolean }} [query]
 */
export async function mockListSuppliers(query = {}) {
  const q = query.q?.trim().toLowerCase()
  const activeOnly = query.activeOnly !== false
  let rows = getAllSuppliersSnapshot().map(refreshSupplierBalances)
  if (activeOnly) rows = rows.filter((r) => r.isActive)
  if (q) {
    rows = rows.filter(
      (r) =>
        r.companyName.toLowerCase().includes(q) ||
        (r.code ?? '').toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q) ||
        (r.taxNumber ?? '').toLowerCase().includes(q),
    )
  }
  return rows.map(toListItem).sort((a, b) => a.companyName.localeCompare(b.companyName, 'tr'))
}

/**
 * @param {CreateSupplierRequest} body
 */
export async function mockCreateSupplier(body) {
  if (body.code) {
    const dup = getAllSuppliersSnapshot().find((s) => s.code === body.code)
    if (dup) throw new Error('Bu kısa kod zaten kullanılıyor')
  }
  const row = createSupplierInStore({
    companyName: body.companyName,
    code: body.code ?? null,
    contactName: body.contactName ?? null,
    phone: body.phone ?? null,
    iban: body.iban ?? null,
    taxNumber: body.taxNumber ?? null,
    taxOffice: body.taxOffice ?? null,
    address: body.address ?? null,
    isActive: body.isActive,
  })
  return refreshSupplierBalances(row)
}

/**
 * @param {string} supplierId
 */
export async function mockGetSupplier(supplierId) {
  const row = findSupplierById(supplierId)
  if (!row) throw new Error('Tedarikçi bulunamadı')
  return refreshSupplierBalances(row)
}

/**
 * @param {string} supplierId
 * @param {PatchSupplierRequest} body
 */
export async function mockPatchSupplier(supplierId, body) {
  const row = findSupplierById(supplierId)
  if (!row) throw new Error('Tedarikçi bulunamadı')
  if (body.code && body.code !== row.code) {
    const dup = getAllSuppliersSnapshot().find((s) => s.code === body.code && s.id !== supplierId)
    if (dup) throw new Error('Bu kısa kod zaten kullanılıyor')
  }
  const updated = refreshSupplierBalances({
    ...row,
    ...body,
    updatedAt: new Date().toISOString(),
  })
  return updated
}

/**
 * @param {string} supplierId
 */
export async function mockListSupplierLedger(supplierId) {
  const row = findSupplierById(supplierId)
  if (!row) throw new Error('Tedarikçi bulunamadı')
  return getLedgerForSupplier(supplierId)
}

/**
 * @param {string} supplierId
 * @param {PostSupplierPaymentRequest} body
 */
export async function mockPostSupplierPayment(supplierId, body) {
  const row = findSupplierById(supplierId)
  if (!row) throw new Error('Tedarikçi bulunamadı')
  if (!row.isActive) throw new Error('Pasif tedarikçiye ödeme girilemez')

  const open = getOpenBalanceForSupplier(supplierId)
  if (body.amount > open + 0.009) {
    throw new Error('Ödeme tutarı açık bakiyeyi aşamaz')
  }

  const entry = appendLedgerDraft(supplierId, {
    entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
    occurredAt: body.occurredAt ?? DEMO_TODAY,
    description: body.description?.trim() || `Ödeme — ${body.method}`,
    debitAmount: formatLedgerMoney(body.amount),
    creditAmount: '0.00',
    paymentMethod: body.method,
    documentNo: body.documentNo ?? null,
  })

  const supplier = refreshSupplierBalances(row)
  return /** @type {PostSupplierPaymentResult} */ ({ entry, supplier })
}
