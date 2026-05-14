/**
 * Sipariş API giriş noktası — şimdilik mock; prod’da burayı HTTP client ile değiştir.
 * @typedef {import('../data/seedOrders.js').Order} Order
 */

export { getOrders, createOrder, updateOrder, resetMockOrdersStore } from './mockApi.js'
