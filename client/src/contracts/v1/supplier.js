/**
 * @typedef {Object} SupplierListItemDto
 * @property {string} id
 * @property {string | null} code
 * @property {string} companyName
 * @property {string | null} contactName
 * @property {string | null} phone
 * @property {string} openBalance
 * @property {string} currency
 * @property {string | null} lastMovementAt
 * @property {boolean} isActive
 */

/**
 * @typedef {SupplierListItemDto & {
 *   iban: string | null
 *   taxNumber: string | null
 *   taxOffice: string | null
 *   address: string | null
 *   createdAt: string
 *   updatedAt: string
 * }} SupplierDetailDto
 */

/**
 * @typedef {Object} CreateSupplierRequest
 * @property {string} companyName
 * @property {string} [code]
 * @property {string} [contactName]
 * @property {string} [phone]
 * @property {string} [iban]
 * @property {string} [taxNumber]
 * @property {string} [taxOffice]
 * @property {string} [address]
 * @property {boolean} [isActive]
 */

/**
 * @typedef {Partial<CreateSupplierRequest & { code: string | null, contactName: string | null, phone: string | null, iban: string | null, taxNumber: string | null, taxOffice: string | null, address: string | null }>} PatchSupplierRequest
 */

export {}
