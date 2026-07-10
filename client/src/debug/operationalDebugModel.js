/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */

/** Liste DTO projection sırası (`orderListItemProjection` ile aynı). */
export const LIST_ITEM_PROJECTION_PIPELINE = /** @type {const} */ ([
  {
    step: 1,
    id: 'legacyWire',
    label: 'Legacy → wire',
    source:
      '`legacyOrderToSalesOrderListItemDto` — `application/projectSalesOrderListItemDto` saf zincirinin ilk adımı; seed `Order` + `todayIso`.',
  },
  {
    step: 2,
    id: 'shipmentSummary',
    label: 'Sevkiyat özeti',
    source:
      '`enrichSalesOrderListItemWithShipmentSummary` — `mockShipmentStore` sevkiyatları + satır tohumları → qty*, `partiallyShipped`, açık sevk sayısı, sonraki plan tarihi.',
  },
  {
    step: 3,
    id: 'paymentSummary',
    label: 'Ödeme özeti',
    source:
      '`enrichSalesOrderListItemWithPaymentSummary` — `mockPaymentStore` ledger veya legacy ödeme → `amountPaid` / `amountDue`, `paymentProgress`, `hasOverdueBalance`, `lastPaymentAt`.',
  },
  {
    step: 4,
    id: 'compositeRisk',
    label: 'Composite risk',
    source:
      '`applyCompositeListItemRisk` — saf projection içinde; legacy termin + DTO kısmi sevk + "Eksik Var" → `currentRiskSeverity`, `riskSignalOverduePartialShipment`.',
  },
])

/** Derived alanların hangi katmandan geldiğine dair kısa açıklamalar (debug). */
export const DERIVED_FIELD_SOURCE_BLURBS = [
  { fields: 'qtyOrderedTotal, qtyShippedTotal, remainingQty', blur: 'Sevkiyat aggregate + satır tohumları (shipment mapper).' },
  { fields: 'partiallyShipped, shipmentSummaryOpenCount, shipmentSummaryNextPlannedDate', blur: 'Açık pipeline sevkiyatları ve tamamlanan miktar (shipment mapper).' },
  { fields: 'amountPaid, amountDue, paymentProgress, hasOverdueBalance, lastPaymentAt', blur: 'Ödeme işlemleri ledger veya legacy; termin ile overdue bakiye (payment mapper).' },
  { fields: 'currentRiskSeverity, riskSignalOverduePartialShipment', blur: 'Composite risk (`applyCompositeListItemRisk`).' },
]

/**
 * @param {DomainEventDto[]} events
 */
export function sortDomainEventsForReplay(events) {
  return [...events].sort((a, b) => {
    const c = a.occurredAt.localeCompare(b.occurredAt)
    if (c !== 0) return c
    return a.id.localeCompare(b.id)
  })
}

/**
 * @param {TaskDto} task
 */
export function explainTaskGenerationReason(task) {
  if (task.source === 'manual') {
    return 'Manuel görev — otomatik rebuild sırasında korunur.'
  }
  if (task.dedupeKey?.startsWith('auto-balance')) {
    return 'Otomatik: `hasOverdueBalance` ∧ pozitif `amountDue` ∧ teslim edilmedi (`rebuildOperationalTasksFromDtos`).'
  }
  if (task.dedupeKey?.startsWith('auto-shipment')) {
    return 'Otomatik: termin gecikti ∧ (kısmi sevk ∨ açık sevk emri) ∧ teslim edilmedi.'
  }
  if (task.dedupeKey?.startsWith('risk-ev-')) {
    return 'Olay: `risk.escalated` domain event’inden türetildi (`dedupeKey` = risk-ev-{eventId}).'
  }
  return `Kaynak: ${task.source}, dedupeKey: ${task.dedupeKey}`
}
