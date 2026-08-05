import { getApiBaseUrl } from '../config/dataSource.js'
import { createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'

/** @typedef {import('../contracts/v1/user.js').UserDto} UserDto */

function api() {
  const base = getApiBaseUrl()
  if (!base) throw new Error('Kullanıcı yönetimi yalnızca API modunda kullanılabilir')
  return createApiClient(base, { headers: authRequestHeaders() })
}

/** @returns {Promise<UserDto[]>} */
export async function listUsers() {
  return api().get('/v1/users')
}

/**
 * @param {{ fullName: string, email: string, role: string, password: string, isActive?: boolean }} body
 * @returns {Promise<UserDto>}
 */
export async function createUser(body) {
  return api().post('/v1/users', body)
}

/**
 * @param {string} userId
 * @param {{ fullName?: string, role?: string, isActive?: boolean }} body
 * @returns {Promise<UserDto>}
 */
export async function patchUser(userId, body) {
  return api().patch(`/v1/users/${encodeURIComponent(userId)}`, body)
}

/**
 * @param {string} userId
 * @returns {Promise<{ user: UserDto, temporaryPassword: string }>}
 */
export async function resetUserPassword(userId) {
  return api().post(`/v1/users/${encodeURIComponent(userId)}/reset-password`, {})
}
