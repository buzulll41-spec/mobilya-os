import { createAuthedApiClient } from '../lib/operationActor.js'
import {
  normalizeSupplierDetailDto,
  normalizeSupplierLedgerEntryDto,
  normalizeSupplierListItemDto,
} from '../mappers/supply/normalizeSupplierDto.js'

/**
 * @param {string} baseUrl
 * @param {{ q?: string, activeOnly?: boolean }} [query]
 */
export async function fetchSuppliersFromApi(baseUrl, query = {}) {
  const client = createAuthedApiClient(baseUrl)
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.activeOnly === false) params.set('activeOnly', 'false')
  const qs = params.toString()
  const path = qs ? `/v1/suppliers?${qs}` : '/v1/suppliers'
  const rows = await client.get(path)
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeSupplierListItemDto(row))
}

/**
 * @param {string} baseUrl
 * @param {import('../contracts/v1/supplier.js').CreateSupplierRequest} body
 */
export async function createSupplierInApi(baseUrl, body) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.post('/v1/suppliers', body)
  return normalizeSupplierDetailDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} supplierId
 */
export async function fetchSupplierFromApi(baseUrl, supplierId) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.get(`/v1/suppliers/${encodeURIComponent(supplierId)}`)
  return normalizeSupplierDetailDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} supplierId
 * @param {import('../contracts/v1/supplier.js').PatchSupplierRequest} body
 */
export async function patchSupplierInApi(baseUrl, supplierId, body) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.patch(`/v1/suppliers/${encodeURIComponent(supplierId)}`, body)
  return normalizeSupplierDetailDto(raw)
}

/**
 * @param {string} baseUrl
 * @param {string} supplierId
 */
export async function fetchSupplierLedgerFromApi(baseUrl, supplierId) {
  const client = createAuthedApiClient(baseUrl)
  const rows = await client.get(`/v1/suppliers/${encodeURIComponent(supplierId)}/ledger`)
  if (!Array.isArray(rows)) return []
  return rows.map((row) => normalizeSupplierLedgerEntryDto(row))
}

/**
 * @param {string} baseUrl
 * @param {string} supplierId
 * @param {import('../contracts/v1/supplierLedgerEntry.js').PostSupplierPaymentRequest} body
 */
export async function postSupplierPaymentInApi(baseUrl, supplierId, body) {
  const client = createAuthedApiClient(baseUrl)
  const raw = await client.post(
    `/v1/suppliers/${encodeURIComponent(supplierId)}/payments`,
    body,
  )
  const r = /** @type {Record<string, unknown>} */ (raw && typeof raw === 'object' ? raw : {})
  return {
    entry: normalizeSupplierLedgerEntryDto(r.entry),
    supplier: normalizeSupplierDetailDto(r.supplier),
  }
}
