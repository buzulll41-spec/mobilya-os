/**
 * FAZ 27 — AI Procurement Specialist demo satır tohumları.
 */

/** @type {import('../../services/mockOrderLineStore.js').OrderLineSeed[]} */
export const PROCUREMENT_ORDER_LINE_SEEDS = [
  {
    id: 'OL-S-PROC-DEMO-1',
    salesOrderId: 'S-PROC-DEMO',
    qtyOrdered: '4.00',
    qtyReceived: '0',
    title: 'Mutfak üst dolap',
    supplyStatus: 'NOT_SENT',
    warehouseEntryStatus: 'NOT_SENT',
    supplierId: 'SUP-VEGA',
    supplierNameSnapshot: 'Vega Mobilya',
  },
  {
    id: 'OL-S-PROC-DEMO-2',
    salesOrderId: 'S-PROC-DEMO',
    qtyOrdered: '2.00',
    qtyReceived: '1.00',
    title: 'Tezgah altı modül',
    supplyStatus: 'SENT',
    warehouseEntryStatus: 'PARTIAL_ARRIVED',
    supplierId: 'SUP-VEGA',
    supplierNameSnapshot: 'Vega Mobilya',
  },
]
