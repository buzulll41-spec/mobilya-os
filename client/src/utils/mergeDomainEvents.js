/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @param {DomainEventDto[]} a
 * @param {DomainEventDto[]} b
 * @returns {DomainEventDto[]}
 */
export function mergeDomainEventsById(a, b) {
  const byId = new Map()
  for (const e of a) {
    if (e.id) byId.set(e.id, e)
  }
  for (const e of b) {
    if (e.id) byId.set(e.id, e)
  }
  return [...byId.values()].sort((x, y) => {
    const t = x.occurredAt.localeCompare(y.occurredAt)
    return t !== 0 ? t : x.id.localeCompare(y.id)
  })
}
