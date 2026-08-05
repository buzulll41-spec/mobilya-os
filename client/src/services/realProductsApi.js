import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {{
 *   q?: string
 *   category?: string
 *   supplierId?: string
 *   activeOnly?: boolean
 *   suiteType?: string
 *   stockType?: string
 *   minPrice?: number
 *   maxPrice?: number
 *   page?: number
 *   pageSize?: number
 * }} [query]
 */
export async function fetchProductsFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.category) params.set('category', query.category)
  if (query.supplierId) params.set('supplierId', query.supplierId)
  if (query.suiteType) params.set('suiteType', query.suiteType)
  if (query.stockType) params.set('stockType', query.stockType)
  if (query.minPrice != null && Number.isFinite(query.minPrice)) {
    params.set('minPrice', String(query.minPrice))
  }
  if (query.maxPrice != null && Number.isFinite(query.maxPrice)) {
    params.set('maxPrice', String(query.maxPrice))
  }
  if (query.activeOnly === false) params.set('activeOnly', 'false')
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  const qs = params.toString()
  return client.get(qs ? `/v1/products?${qs}` : '/v1/products')
}

/**
 * @param {string} base
 * @param {import('../contracts/v1/product.js').CreateProductRequest} body
 */
export async function createProductInApi(base, body) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/products', body)
}

/**
 * @param {string} base
 * @param {string} productId
 */
export async function fetchProductFromApi(base, productId) {
  const client = createAuthedApiClient(base)
  return client.get(`/v1/products/${productId}`)
}

/**
 * @param {string} base
 * @param {string} productId
 * @param {import('../contracts/v1/product.js').PatchProductRequest} body
 */
export async function patchProductInApi(base, productId, body) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/products/${productId}`, body)
}

/**
 * @param {string} base
 * @param {string} productId
 */
export async function duplicateProductInApi(base, productId) {
  const client = createAuthedApiClient(base)
  return client.post(`/v1/products/${productId}/duplicate`, {})
}
