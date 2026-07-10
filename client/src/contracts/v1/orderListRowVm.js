/**
 * Sipariş listesi ekranı ViewModel — mevcut tablo/filtre ile uyumlu alan adları.
 *
 * @typedef {import('../../data/seedOrders.js').Order} LegacyOrder
 *
 * @typedef {Object} OrderListRowVM
 * @property {string} id
 * @property {string} customer
 * @property {string} [phone]
 * @property {string} [phone2]
 * @property {string} [nationalId]
 * @property {string} [taxNumber]
 * @property {string} [taxOffice]
 * @property {string} product
 * @property {import('../../data/constants.js').OrderStatus} status
 * @property {number} amount TL
 * @property {number} [cost]
 * @property {string} orderDate YYYY-MM-DD
 * @property {string} [createdAt] ISO-8601 instant — liste sıralama
 * @property {string} [dueDate]
 * @property {string} [shipmentDate]
 * @property {boolean} [paid]
 * @property {number} [paidAmount]
 * @property {string} [notes]
 * @property {string} [salesPerson]
 * @property {string} [orderNumber] Contract
 * @property {import('./enums.js').SalesOrderLifecycleStatus} [lifecycleStatus]
 * @property {import('./enums.js').RiskSeverity} [riskSeverity]
 * @property {import('./orderOperationalState.js').OrderOperationalState} [operationalState]
 */

export {}
