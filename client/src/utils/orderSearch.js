/** @param {import('../data/seedOrders.js').Order} order */
function orderSearchBlob(order) {
  return [order.id, order.customer, order.product, order.phone, order.notes, order.salesPerson, order.orderNumber]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

/** @param {string | null | undefined} raw */
function normalizeDigits(raw) {
  return String(raw ?? '').replace(/\D/g, '')
}

/**
 * @param {(import('../data/seedOrders.js').Order | import('../contracts/v1/orderListRowVm.js').OrderListRowVM | import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM | import('../contracts/v1/collectionRowVm.js').CollectionRowVM)[]} orders
 * @param {string} query
 */
export function filterOrdersBySearch(orders, query) {
  const q = query.trim().toLowerCase()
  if (!q) return orders
  const qDigits = normalizeDigits(q)
  return orders.filter((o) => {
    if (orderSearchBlob(o).includes(q)) return true
    if (qDigits.length >= 4 && normalizeDigits(o.phone).includes(qDigits)) return true
    return false
  })
}
