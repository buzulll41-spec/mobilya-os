import { createAuthedApiClient } from '../lib/operationActor.js'

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionDto | null>}
 */
export async function fetchWooConnectionFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/admin/woo-connections')
}

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionHealthDto | null>}
 */
export async function fetchWooConnectionHealthFromApi(base) {
  const client = createAuthedApiClient(base)
  return client.get('/v1/admin/woo-connections/health')
}

/**
 * @param {string} base
 * @param {Record<string, unknown>} body
 * @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionDto>}
 */
export async function upsertWooConnectionOnApi(base, body) {
  const client = createAuthedApiClient(base)
  return client.put('/v1/admin/woo-connections', body)
}

/**
 * @param {string} base
 * @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionTestResponseDto>}
 */
export async function testWooConnectionOnApi(base) {
  const client = createAuthedApiClient(base)
  return client.post('/v1/admin/woo-connections/test', {})
}
