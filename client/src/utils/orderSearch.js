/** @param {import('../data/seedOrders.js').Order} order */
function orderSearchBlob(order) {
  return [order.id, order.customer, order.product, order.phone, order.notes, order.salesPerson]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/**
 * @param {import('../data/seedOrders.js').Order[]} orders
 * @param {string} query
 */
export function filterOrdersBySearch(orders, query) {
  const q = query.trim().toLowerCase()
  if (!q) return orders
  return orders.filter((o) => orderSearchBlob(o).includes(q))
}
