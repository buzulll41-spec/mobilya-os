/**
 * @typedef {'CONNECTED' | 'ERROR' | 'UNCHECKED'} WooConnectionStatusDto
 */

/**
 * @typedef {Object} WooConnectionDto
 * @property {string} id
 * @property {string} storeName
 * @property {string} storeUrl
 * @property {string} consumerKeyMasked
 * @property {string} consumerSecretMasked
 * @property {boolean} isActive
 * @property {string | null} lastConnectionCheck
 * @property {WooConnectionStatusDto | null} lastConnectionStatus
 * @property {string} lastConnectionStatusLabel
 * @property {string | null} lastError
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} WooConnectionHealthDto
 * @property {WooConnectionStatusDto} status
 * @property {string} statusLabel
 * @property {string | null} lastConnectionCheck
 * @property {string | null} lastError
 * @property {string} storeName
 * @property {string} storeUrl
 * @property {number | null} categoryCount
 * @property {number | null} productCount
 * @property {string | null} wcVersion
 */

/**
 * @typedef {Object} WooConnectionTestResponseDto
 * @property {WooConnectionDto} connection
 * @property {{
 *   ok: boolean
 *   status: WooConnectionStatusDto
 *   statusLabel: string
 *   error: string | null
 *   storeInfo: { storeUrl: string; wcVersion: string | null } | null
 *   categoryCount: number
 *   categoriesSample: { id: number; name: string; slug: string; count: number }[]
 *   productCount: number
 *   productsSample: { id: number; name: string; sku: string; status: string; price: string }[]
 * }} test
 */

export {}
