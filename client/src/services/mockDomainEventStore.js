import { buildInitialDomainEventsFromFixtures } from '../data/mock/domainEventFixtures.js'
import {
  bootstrapAiWorkerMemoryStore,
  resetMockAiWorkerMemoryStore,
  ingestMemoryFromDomainEvent,
} from './memory/mockAiWorkerMemoryStore.js'

/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

function cloneEvents(/** @type {DomainEventDto[]} */ rows) {
  return rows.map((e) => ({
    ...e,
    payload: { ...e.payload },
  }))
}

/** @type {DomainEventDto[]} */
let memoryDomainEvents = cloneEvents(buildInitialDomainEventsFromFixtures())

bootstrapAiWorkerMemoryStore(memoryDomainEvents)

export function resetMockDomainEventStore() {
  memoryDomainEvents = cloneEvents(buildInitialDomainEventsFromFixtures())
  resetMockAiWorkerMemoryStore(memoryDomainEvents)
}

/** @returns {DomainEventDto[]} */
export function getAllDomainEventsSnapshot() {
  return cloneEvents(memoryDomainEvents)
}

function cloneEvent(/** @type {DomainEventDto} */ e) {
  return { ...e, payload: { ...e.payload } }
}

/**
 * Idempotent append: aynı `id` veya (type + aggregateId + correlationId) ile tekrar yazılmaz.
 * @param {DomainEventDto} evt
 * @returns {DomainEventDto} Store’daki kanonik kopya (veya yeni eklenen kopya).
 */
export function appendDomainEvent(evt) {
  const incoming = cloneEvent(evt)

  const dupById = memoryDomainEvents.find((e) => e.id === incoming.id)
  if (dupById) {
    return cloneEvent(dupById)
  }

  const corr = incoming.correlationId
  if (corr != null && corr !== '') {
    const dupByCorr = memoryDomainEvents.find(
      (e) =>
        e.type === incoming.type &&
        e.aggregateId === incoming.aggregateId &&
        e.correlationId === corr,
    )
    if (dupByCorr) {
      return cloneEvent(dupByCorr)
    }
  }

  memoryDomainEvents = [...memoryDomainEvents, incoming]
  ingestMemoryFromDomainEvent(incoming)
  return cloneEvent(incoming)
}

/** Audit kayıtları append-only — silme API'si kasıtlı olarak yoktur. */

/**
 * @param {string} salesOrderId
 * @returns {DomainEventDto[]}
 */
export function getDomainEventsForSalesOrder(salesOrderId) {
  return memoryDomainEvents.filter((e) => e.aggregateId === salesOrderId)
}

/** @param {DomainEventDto[]} rows */
export function hydrateDomainEventStore(rows) {
  memoryDomainEvents = cloneEvents(rows)
  resetMockAiWorkerMemoryStore(memoryDomainEvents)
}
