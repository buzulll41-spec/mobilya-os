import { ORDER_FIXTURES } from './mock/orderFixtures.js'

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} customer
 * @property {string} [phone]
 * @property {string} product
 * @property {import('./constants.js').OrderStatus} status
 * @property {number} amount Satış (TL)
 * @property {number} [cost] Maliyet (TL)
 * @property {string} orderDate
 * @property {string} [dueDate]
 * @property {string} [shipmentDate]
 * @property {boolean} [paid]
 * @property {number} [paidAmount] Kapora / tahsil edilen
 * @property {string} [notes]
 * @property {string} [salesPerson] Satış temsilcisi
 */

const SALES_ROTATION = ['Elçin Korkmaz', 'Murat Tekin', 'Selin Yıldız']

/** @type {Order[]} */
export const initialOrders = ORDER_FIXTURES.map((o, i) => ({
  ...o,
  salesPerson: SALES_ROTATION[i % SALES_ROTATION.length],
}))
