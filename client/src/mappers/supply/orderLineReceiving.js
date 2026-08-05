/**
 * @param {number} ordered
 * @param {number} received
 */
export function buildOrderLineReceivingBadge(ordered, received) {
  if (ordered <= 0.0001) {
    return { badge: /** @type {const} */ ('none'), badgeLabel: '—' }
  }
  if (received >= ordered - 0.0001) {
    return { badge: /** @type {const} */ ('ready'), badgeLabel: 'Sevke hazır' }
  }
  if (received > 0.0001) {
    return { badge: /** @type {const} */ ('partial'), badgeLabel: 'Eksik geliş' }
  }
  return { badge: /** @type {const} */ ('none'), badgeLabel: 'Bekliyor' }
}

/**
 * @param {string} title
 * @param {string} qtyOrdered
 * @param {string} qtyReceived
 */
export function mapOrderLineReceivingFromSeed(title, qtyOrdered, qtyReceived) {
  const ordered = Number.parseFloat(qtyOrdered)
  const received = Number.parseFloat(qtyReceived)
  const pending = Math.max(0, ordered - received)
  const { badge, badgeLabel } = buildOrderLineReceivingBadge(ordered, received)
  const fmt = (n) => n.toFixed(2)
  const displayLabel =
    received > 0.0001 ? `Gelen: ${fmt(received)}/${fmt(ordered)} · ${badgeLabel}` : badgeLabel
  return {
    orderLineId: '',
    title,
    qtyOrdered: fmt(ordered),
    qtyReceived: fmt(received),
    qtyPending: fmt(pending),
    badge: received >= ordered - 0.0001 ? /** @type {const} */ ('complete') : badge,
    badgeLabel: displayLabel,
  }
}
