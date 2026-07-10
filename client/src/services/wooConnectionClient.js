import { getApiBaseUrl } from '../config/dataSource.js'
import {
  fetchWooConnectionFromApi,
  fetchWooConnectionHealthFromApi,
  testWooConnectionOnApi,
  upsertWooConnectionOnApi,
} from './realWooConnectionApi.js'

function apiBase() {
  return getApiBaseUrl()
}

/** @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionDto | null>} */
export async function getWooConnection() {
  const base = apiBase()
  if (!base) return null
  return fetchWooConnectionFromApi(base)
}

/** @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionHealthDto | null>} */
export async function getWooConnectionHealth() {
  const base = apiBase()
  if (!base) return null
  return fetchWooConnectionHealthFromApi(base)
}

/** @param {Record<string, unknown>} body */
export async function saveWooConnection(body) {
  const base = apiBase()
  if (!base) throw new Error('WooCommerce ayarları yalnızca canlı API ile kullanılabilir')
  return upsertWooConnectionOnApi(base, body)
}

/** @returns {Promise<import('../contracts/v1/wooConnection.js').WooConnectionTestResponseDto>} */
export async function testWooConnection() {
  const base = apiBase()
  if (!base) throw new Error('WooCommerce test yalnızca canlı API ile kullanılabilir')
  return testWooConnectionOnApi(base)
}
