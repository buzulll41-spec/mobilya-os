import { USER_ROLE } from '../../contracts/v1/user.js'

/** @typedef {import('../../contracts/v1/user.js').UserDto} UserDto */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */

/** @typedef {'all' | 'active' | 'passive' | USER_ROLE} UsersFilterId */

export const USERS_ROLE_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm kullanıcılar' },
  { id: 'active', label: 'Aktif' },
  { id: 'passive', label: 'Pasif' },
  { id: USER_ROLE.ADMIN, label: 'Yönetici' },
  { id: USER_ROLE.OPERATION, label: 'Operasyon' },
  { id: USER_ROLE.SALES, label: 'Satış' },
])

const ROLE_LABELS = {
  [USER_ROLE.ADMIN]: 'Yönetici',
  [USER_ROLE.MANAGER]: 'Müdür',
  [USER_ROLE.SALES]: 'Satış',
  [USER_ROLE.OPERATION]: 'Operasyon',
  [USER_ROLE.WAREHOUSE]: 'Depo',
}

/**
 * @param {UserDto} user
 * @returns {ErpOpsTableRow}
 */
export function userToErpTableRow(user) {
  return {
    id: user.id,
    orderNo: user.email,
    customer: user.fullName,
    category: ROLE_LABELS[user.role] ?? user.role,
    statusLabel: user.isActive ? 'Aktif' : 'Pasif',
    lastActionLabel: ROLE_LABELS[user.role] ?? user.role,
    nextActionLabel: user.isActive ? 'Hesap açık' : 'Pasif hesap',
    actionButtonLabel: 'Düzenle',
    tone: user.isActive ? 'success' : 'neutral',
    priorityRank: null,
  }
}

/**
 * @param {UserDto[]} users
 * @param {UsersFilterId} filterId
 */
export function filterUsers(users, filterId) {
  if (filterId === 'all') return users
  if (filterId === 'active') return users.filter((u) => u.isActive)
  if (filterId === 'passive') return users.filter((u) => !u.isActive)
  return users.filter((u) => u.role === filterId)
}

/**
 * @param {UserDto[]} users
 */
export function buildUsersOpsSummary(users) {
  const active = users.filter((u) => u.isActive).length
  const admin = users.filter((u) => u.role === USER_ROLE.ADMIN).length
  const passive = users.length - active
  return [
    { id: 'total', label: 'Toplam kullanıcı', value: String(users.length) },
    { id: 'active', label: 'Aktif', value: String(active), valueTone: /** @type {const} */ ('success') },
    { id: 'admin', label: 'Yönetici', value: String(admin) },
    {
      id: 'passive',
      label: 'Pasif',
      value: String(passive),
      valueTone: passive > 0 ? /** @type {const} */ ('warning') : undefined,
    },
  ]
}

/**
 * @param {UserDto[]} users
 * @param {UsersFilterId} filterId
 */
export function countUsersFilter(users, filterId) {
  return filterUsers(users, filterId).length
}
