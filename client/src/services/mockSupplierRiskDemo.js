import { DEMO_TODAY } from '../data/constants.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../contracts/v1/supplierLedgerEntryTypes.js'
import { upsertMockRiskOrder } from './mockApi.js'
import { appendIncomingGoodsRecord } from './mockIncomingGoodsStore.js'
import { setOrderLinesForSalesOrder } from './mockOrderLineStore.js'
import { appendLedgerEntry, hydrateSupplierLedgerStore } from './mockSupplierLedgerStore.js'
import { upsertSupplier } from './mockSupplierStore.js'

const MAYER_ID = 'sup-seed-mayer'
const MAYER_ORDER_ID = 'S-12345'
const ABC_ID = 'sup-abc'

let seeded = false

function seedAbcRiskDemo() {
  upsertSupplier({
    id: ABC_ID,
    code: 'ABC',
    companyName: 'ABC Mobilya',
    contactName: 'Mehmet Yılmaz',
    phone: '0532 111 22 33',
    iban: 'TR00 0001 0000 0000 0000 0000 01',
    taxNumber: '1234567890',
    taxOffice: 'Kadıköy',
    address: 'İstanbul',
    isActive: true,
    openBalance: '406900.00',
    currency: 'TRY',
    lastMovementAt: DEMO_TODAY,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-14T08:00:00.000Z',
  })

  hydrateSupplierLedgerStore()
  appendLedgerEntry({
    id: 'sle-abc-goods-extra',
    supplierId: ABC_ID,
    entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
    occurredAt: '2026-05-12',
    description: 'Dönem alımları',
    debitAmount: '0.00',
    creditAmount: '461900.00',
    balanceAfter: '506900.00',
    currency: 'TRY',
    paymentMethod: null,
    documentNo: 'FTR-ABC-02',
    createdAt: '2026-05-12T09:00:00.000Z',
  })
  appendLedgerEntry({
    id: 'sle-abc-pay-extra',
    supplierId: ABC_ID,
    entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
    occurredAt: DEMO_TODAY,
    description: 'Havale ödemesi',
    debitAmount: '100000.00',
    creditAmount: '0.00',
    balanceAfter: '406900.00',
    currency: 'TRY',
    paymentMethod: 'TRANSFER',
    documentNo: null,
    createdAt: `${DEMO_TODAY}T08:00:00.000Z`,
  })

  const abcOrders = [
    {
      id: 'S-1782076612541',
      customer: 'AFRİKA',
      product: 'ARTE DUVAR ÜNİTESİ',
      orderDate: '2026-05-14',
      dueDate: '2026-06-25',
      lineId: 'ol-abc-afrika',
      unit: 31000,
    },
    {
      id: 'S-ABC-ALMANYA',
      customer: 'ALMANYA',
      product: 'MODÜL YATAK ODASI',
      orderDate: '2026-05-20',
      dueDate: '2026-06-28',
      lineId: 'ol-abc-almanya',
      unit: 90000,
    },
    {
      id: 'S-ABC-NAZLI',
      customer: 'NAZLI',
      product: 'KÖŞE TAKIMI',
      orderDate: '2026-06-01',
      dueDate: '2026-06-30',
      lineId: 'ol-abc-nazli',
      unit: 55000,
    },
  ]

  for (const o of abcOrders) {
    upsertMockRiskOrder({
      id: o.id,
      customer: o.customer,
      product: o.product,
      amount: o.unit,
      status: 'Üretimde',
      orderDate: o.orderDate,
      dueDate: o.dueDate,
      paid: false,
      paidAmount: 0,
    })
    setOrderLinesForSalesOrder(o.id, [
      {
        id: o.lineId,
        salesOrderId: o.id,
        qtyOrdered: '1',
        qtyReceived: '0',
        title: o.product,
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
        shipmentReady: false,
        supplierId: ABC_ID,
        supplierNameSnapshot: 'ABC Mobilya',
        unitPrice: o.unit,
      },
    ])
  }
}

/** Mayer Mobilya risk senaryosu: 370k cari + 112k bekleyen = 482k toplam risk */
export function seedSupplierRiskDemo() {
  if (seeded) return
  seeded = true

  seedAbcRiskDemo()
  upsertSupplier({
    id: MAYER_ID,
    code: 'MAYER',
    companyName: 'Mayer Mobilya',
    contactName: 'Operasyon',
    phone: '0532 900 11 22',
    iban: null,
    taxNumber: '5555555555',
    taxOffice: 'İstanbul',
    address: 'İstanbul',
    isActive: true,
    openBalance: '370000.00',
    currency: 'TRY',
    lastMovementAt: DEMO_TODAY,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-05-14T08:00:00.000Z',
  })

  hydrateSupplierLedgerStore()
  appendLedgerEntry({
    id: 'sle-mayer-goods',
    supplierId: MAYER_ID,
    entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
    occurredAt: '2026-05-10',
    description: 'Dönem alımları',
    debitAmount: '0.00',
    creditAmount: '500000.00',
    balanceAfter: '500000.00',
    currency: 'TRY',
    paymentMethod: null,
    documentNo: 'FTR-MAYER-01',
    createdAt: '2026-05-10T09:00:00.000Z',
  })
  appendLedgerEntry({
    id: 'sle-mayer-pay',
    supplierId: MAYER_ID,
    entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
    occurredAt: DEMO_TODAY,
    description: 'Havale ödemesi',
    debitAmount: '130000.00',
    creditAmount: '0.00',
    balanceAfter: '370000.00',
    currency: 'TRY',
    paymentMethod: 'TRANSFER',
    documentNo: null,
    createdAt: `${DEMO_TODAY}T08:00:00.000Z`,
  })

  upsertMockRiskOrder({
    id: MAYER_ORDER_ID,
    customer: 'Murat Aydın',
    product: 'Lux Koltuk Takımı',
    amount: 280000,
    status: 'Üretimde',
    orderDate: '2026-06-12',
    dueDate: '2026-06-25',
    paid: false,
    paidAmount: 50000,
  })

  const lineDefs = [
    { id: 'ol-mayer-1', title: 'Lux Koltuk Takımı 3+2+1', unit: 28000 },
    { id: 'ol-mayer-2', title: 'Lux Koltuk Berjer', unit: 28000 },
    { id: 'ol-mayer-3', title: 'Lux Koltuk Sehpa', unit: 28000 },
    { id: 'ol-mayer-4', title: 'Lux Koltuk Aksesuar', unit: 28000 },
  ]

  setOrderLinesForSalesOrder(
    MAYER_ORDER_ID,
    lineDefs.map((l) => ({
      id: l.id,
      salesOrderId: MAYER_ORDER_ID,
      qtyOrdered: '1',
      qtyReceived: '0',
      title: l.title,
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
      shipmentReady: false,
      supplierId: MAYER_ID,
      supplierNameSnapshot: 'Mayer Mobilya',
    })),
  )

  for (const l of lineDefs) {
    appendIncomingGoodsRecord({
      id: `igr-mayer-${l.id}`,
      supplierId: MAYER_ID,
      productTitle: l.title,
      qty: '1',
      unitPurchasePrice: String(l.unit),
      lineTotal: String(l.unit),
      receivedAt: '2026-05-01',
      purpose: 'CUSTOMER_ORDER',
      orderLineId: l.id,
      salesOrderId: MAYER_ORDER_ID,
      orderNumber: MAYER_ORDER_ID,
      customerName: 'Murat Aydın',
      createdAt: '2026-05-01T10:00:00.000Z',
    })
  }
}

export { MAYER_ID, MAYER_ORDER_ID, ABC_ID }
