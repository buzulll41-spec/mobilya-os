/**
 * Mock HTTP katmanı — ileride `fetch` / OpenAPI client ile değiştirilir.
 * Arayüz: `services/ordersClient.js` üzerinden tüketilir.
 */
import { DEMO_TODAY } from '../data/constants.js'
import { initialOrders } from '../data/seedOrders.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */

function cloneList(/** @type {Order[]} */ rows) {
  return rows.map((o) => ({ ...o }))
}

/** Bellek içi “sunucu” — getOrders / mutasyonlar tutarlı kalsın */
let memoryOrders = cloneList(initialOrders)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Test / demo sıfırlama */
export function resetMockOrdersStore() {
  memoryOrders = cloneList(initialOrders)
}

/**
 * @param {number} [ms]
 */
async function fakeLatency(ms = 280) {
  await sleep(ms)
}

/**
 * Tüm siparişler (sayfa yükü veya yenileme).
 * @returns {Promise<Order[]>}
 */
export async function getOrders() {
  await fakeLatency(320)
  return cloneList(memoryOrders)
}

/**
 * @param {Omit<Order, 'id' | 'orderDate'>} draft
 * @returns {Promise<Order>}
 */
export async function createOrder(draft) {
  await fakeLatency(420)
  /** @type {Order} */
  const row = {
    ...draft,
    id: `S-${Date.now()}`,
    orderDate: DEMO_TODAY,
  }
  memoryOrders = [row, ...memoryOrders]
  return { ...row }
}

/**
 * @param {string} id
 * @param {Partial<Order>} patch
 * @returns {Promise<Order>}
 */
export async function updateOrder(id, patch) {
  await fakeLatency(200)
  const i = memoryOrders.findIndex((o) => o.id === id)
  if (i === -1) {
    throw new Error('Sipariş bulunamadı')
  }
  memoryOrders[i] = { ...memoryOrders[i], ...patch }
  return { ...memoryOrders[i] }
}
