import { getApiBaseUrl } from '../config/dataSource.js'
import * as mockSuppliers from './mockSuppliersApi.js'
import {
  createSupplierInApi,
  fetchSupplierFromApi,
  fetchSupplierLedgerFromApi,
  fetchSuppliersFromApi,
  patchSupplierInApi,
  postSupplierPaymentInApi,
} from './realSuppliersApi.js'

function apiBase() {
  return getApiBaseUrl()
}

/**
 * @param {{ q?: string, activeOnly?: boolean }} [query]
 */
export async function listSuppliers(query) {
  const base = apiBase()
  if (base) return fetchSuppliersFromApi(base, query)
  return mockSuppliers.mockListSuppliers(query)
}

/**
 * @param {import('../contracts/v1/supplier.js').CreateSupplierRequest} body
 */
export async function createSupplier(body) {
  const base = apiBase()
  if (base) return createSupplierInApi(base, body)
  return mockSuppliers.mockCreateSupplier(body)
}

/**
 * @param {string} supplierId
 */
export async function getSupplier(supplierId) {
  const base = apiBase()
  if (base) return fetchSupplierFromApi(base, supplierId)
  return mockSuppliers.mockGetSupplier(supplierId)
}

/**
 * @param {string} supplierId
 * @param {import('../contracts/v1/supplier.js').PatchSupplierRequest} body
 */
export async function patchSupplier(supplierId, body) {
  const base = apiBase()
  if (base) return patchSupplierInApi(base, supplierId, body)
  return mockSuppliers.mockPatchSupplier(supplierId, body)
}

/**
 * @param {string} supplierId
 */
export async function listSupplierLedger(supplierId) {
  const base = apiBase()
  if (base) return fetchSupplierLedgerFromApi(base, supplierId)
  return mockSuppliers.mockListSupplierLedger(supplierId)
}

/**
 * @param {string} supplierId
 * @param {import('../contracts/v1/supplierLedgerEntry.js').PostSupplierPaymentRequest} body
 */
export async function postSupplierPayment(supplierId, body) {
  const base = apiBase()
  if (base) return postSupplierPaymentInApi(base, supplierId, body)
  return mockSuppliers.mockPostSupplierPayment(supplierId, body)
}
