import { SHIPMENT_STATUS } from '../../contracts/v1/enums.js'

/**
 * Sipariş satırı tohumları (qty) — mock sevkiyat özeti için.
 * @typedef {{ id: string; salesOrderId: string; qtyOrdered: string; title?: string }} OrderLineSeed
 */

/** @type {OrderLineSeed[]} */
export const ORDER_LINE_SEEDS = [
  {
    id: 'OL-S-24089-1',
    salesOrderId: 'S-24089',
    qtyOrdered: '2.00',
    qtyReceived: '2.00',
    title: 'Koltuk takımı',
  },
  {
    id: 'OL-S-24089-2',
    salesOrderId: 'S-24089',
    qtyOrdered: '6.00',
    qtyReceived: '6.00',
    title: 'Sandalye',
  },
  {
    id: 'OL-S-SHIP-DEMO-1',
    salesOrderId: 'S-SHIP-DEMO',
    qtyOrdered: '3.00',
    qtyReceived: '1.00',
    title: 'Gardırop',
    supplyStatus: 'SENT',
    warehouseEntryStatus: 'WAITING',
  },
]

/**
 * S-24089: 1 adet sevk edildi (DISPATCHED), 1 adet PLANNED — kısmi sevk demo.
 * @type {import('../../contracts/v1/shipment.js').ShipmentDto[]}
 */
export const INITIAL_SHIPMENTS = [
  {
    id: 'SHP-DEMO-24089-1',
    salesOrderId: 'S-24089',
    shipmentNumber: 'SHP-2026-008801',
    status: SHIPMENT_STATUS.DISPATCHED,
    originLocationId: 'LOC-IST-1',
    plannedShipDate: '2026-05-10',
    actualShipDate: '2026-05-10',
    version: 1,
    lines: [
      {
        id: 'SHL-DEMO-24089-1',
        shipmentId: 'SHP-DEMO-24089-1',
        orderLineId: 'OL-S-24089-2',
        qty: '2.00',
      },
    ],
  },
  {
    id: 'SHP-DEMO-24089-2',
    salesOrderId: 'S-24089',
    shipmentNumber: 'SHP-2026-008802',
    status: SHIPMENT_STATUS.PLANNED,
    originLocationId: 'LOC-IST-1',
    plannedShipDate: '2026-05-15',
    actualShipDate: null,
    version: 1,
    lines: [
      {
        id: 'SHL-DEMO-24089-2',
        shipmentId: 'SHP-DEMO-24089-2',
        orderLineId: 'OL-S-24089-1',
        qty: '1.00',
      },
    ],
  },
]
