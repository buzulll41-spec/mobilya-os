/**
 * @typedef {'ADMIN' | 'MANAGER' | 'SALES' | 'OPERATION' | 'SERVICE' | 'FINANCE' | 'WAREHOUSE'} UserRole
 *
 * @typedef {Object} UserDto
 * @property {string} id
 * @property {string} fullName
 * @property {string} email
 * @property {UserRole} role
 * @property {boolean} isActive
 * @property {string} createdAt
 *
 * @typedef {Object} AuthSession
 * @property {string} token
 * @property {UserDto} user
 */

export const USER_ROLE = /** @type {const} */ ({
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  OPERATION: 'OPERATION',
  SERVICE: 'SERVICE',
  FINANCE: 'FINANCE',
  WAREHOUSE: 'WAREHOUSE',
})
