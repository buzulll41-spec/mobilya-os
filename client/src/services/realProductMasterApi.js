import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @param {{
 *   q?: string
 *   category?: string
 *   publishStatus?: string
 *   activeOnly?: boolean
 *   page?: number
 *   pageSize?: number
 * }} [query]
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterListResponseDto>}
 */
export async function fetchProductMasterFromApi(base, query = {}) {
  const client = createAuthedApiClient(base)
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.category) params.set('category', query.category)
  if (query.publishStatus) params.set('publishStatus', query.publishStatus)
  if (query.activeOnly === true) params.set('activeOnly', 'true')
  if (query.page) params.set('page', String(query.page))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  const qs = params.toString()
  return client.get(qs ? `/v1/product-master?${qs}` : '/v1/product-master')
}

/**
 * @param {string} base
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function fetchProductMasterDetailFromApi(base, productId) {
  const client = createAuthedApiClient(base)
  return client.get(`/v1/product-master/${productId}`)
}

/**
 * @param {string} base
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function createProductMasterOnApi(base, body) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/product-master', body)
}

/**
 * @param {string} base
 * @param {string} productId
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function patchProductMasterOnApi(base, productId, body) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/product-master/${productId}`, body)
}

/**
 * @param {string} base
 * @param {string} productId
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterVariantDto>}
 */
export async function createProductVariantOnApi(base, productId, body) {
  const client = createAuthedApiClient(base)
  return client.post(`/v1/product-master/${productId}/variants`, body)
}

/**
 * @param {string} base
 * @param {string} productId
 * @param {string} variantId
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterVariantDto>}
 */
export async function patchProductVariantOnApi(base, productId, variantId, body) {
  const client = createAuthedApiClient(base)
  return client.patch(`/v1/product-master/${productId}/variants/${variantId}`, body)
}

/**
 * @param {string} base
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function prepareWooSyncOnApi(base, productId) {
  const client = createAuthedApiClient(base)
  return client.post(`/v1/product-master/${productId}/woo/prepare-sync`, {})
}

/**
 * @param {string} base
 * @param {string} productId
 * @returns {Promise<import('../contracts/v1/productMaster.js').ProductMasterDetailDto>}
 */
export async function publishWooDraftOnApi(base, productId) {
  const client = createAuthedApiClient(base)
  return client.post(`/v1/product-master/${productId}/woo/publish-draft`, {})
}
