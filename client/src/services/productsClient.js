import { getApiBaseUrl } from '../config/dataSource.js'
import * as mockProducts from './mockProductsApi.js'
import {
  createProductInApi,
  duplicateProductInApi,
  fetchProductFromApi,
  fetchProductsFromApi,
  patchProductInApi,
} from './realProductsApi.js'

function apiBase() {
  return getApiBaseUrl()
}

/**
 * @param {{
 *   q?: string
 *   category?: string
 *   supplierId?: string
 *   activeOnly?: boolean
 *   page?: number
 *   pageSize?: number
 * }} [query]
 */
export async function listProducts(query) {
  const base = apiBase()
  if (base) return fetchProductsFromApi(base, query)
  return mockProducts.mockListProducts(query)
}

/**
 * @param {string} productId
 */
export async function getProduct(productId) {
  const base = apiBase()
  if (base) return fetchProductFromApi(base, productId)
  return mockProducts.mockGetProduct(productId)
}

/**
 * @param {import('../contracts/v1/product.js').CreateProductRequest} body
 */
export async function createProduct(body) {
  const base = apiBase()
  if (base) return createProductInApi(base, body)
  return mockProducts.mockCreateProduct(body)
}

/**
 * @param {string} productId
 * @param {import('../contracts/v1/product.js').PatchProductRequest} patch
 */
export async function patchProduct(productId, patch) {
  const base = apiBase()
  if (base) return patchProductInApi(base, productId, patch)
  return mockProducts.mockPatchProduct(productId, patch)
}

/**
 * @param {string} productId
 */
export async function duplicateProduct(productId) {
  const base = apiBase()
  if (base) return duplicateProductInApi(base, productId)
  return mockProducts.mockDuplicateProduct(productId)
}
