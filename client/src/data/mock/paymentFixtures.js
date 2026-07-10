import {
  PAYMENT_METHOD,
  PAYMENT_TRANSACTION_KIND,
  PAYMENT_TRANSACTION_STATUS,
} from '../../contracts/v1/enums.js'

/** @typedef {import('../../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */

const TRY = 'TRY'

/** @type {PaymentTransactionDto[]} */
export const INITIAL_PAYMENT_TRANSACTIONS = [
  // S-24089 — iki POSTED kapora (ledger = fixture paid 60k)
  {
    id: 'PTX-24089-A',
    salesOrderId: 'S-24089',
    invoiceId: null,
    amount: { amount: '30000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.TRANSFER,
    status: PAYMENT_TRANSACTION_STATUS.POSTED,
    occurredAt: '2026-05-03T11:00:00.000Z',
    idempotencyKey: 'idem-24089-a',
    externalRef: null,
  },
  {
    id: 'PTX-24089-B',
    salesOrderId: 'S-24089',
    invoiceId: null,
    amount: { amount: '30000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.CARD,
    status: PAYMENT_TRANSACTION_STATUS.POSTED,
    occurredAt: '2026-05-04T09:30:00.000Z',
    idempotencyKey: 'idem-24089-b',
    externalRef: null,
  },
  // S-24105 — kısmi ödeme: 10k+10k POSTED, 5k PENDING (ledger’da yok)
  {
    id: 'PTX-24105-1',
    salesOrderId: 'S-24105',
    invoiceId: null,
    amount: { amount: '10000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.TRANSFER,
    status: PAYMENT_TRANSACTION_STATUS.POSTED,
    occurredAt: '2026-05-06T10:00:00.000Z',
    idempotencyKey: 'idem-24105-1',
    externalRef: null,
  },
  {
    id: 'PTX-24105-2',
    salesOrderId: 'S-24105',
    invoiceId: null,
    amount: { amount: '10000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.CASH,
    status: PAYMENT_TRANSACTION_STATUS.POSTED,
    occurredAt: '2026-05-07T15:20:00.000Z',
    idempotencyKey: 'idem-24105-2',
    externalRef: null,
  },
  {
    id: 'PTX-24105-3',
    salesOrderId: 'S-24105',
    invoiceId: null,
    amount: { amount: '5000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.CARD,
    status: PAYMENT_TRANSACTION_STATUS.PENDING,
    occurredAt: '2026-05-14T08:00:00.000Z',
    idempotencyKey: 'idem-24105-3',
    externalRef: null,
  },
  // S-24116 — iki taksit POSTED
  {
    id: 'PTX-24116-1',
    salesOrderId: 'S-24116',
    invoiceId: null,
    amount: { amount: '15000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.TRANSFER,
    status: PAYMENT_TRANSACTION_STATUS.POSTED,
    occurredAt: '2026-05-14T12:00:00.000Z',
    idempotencyKey: 'idem-24116-1',
    externalRef: null,
  },
  {
    id: 'PTX-24116-2',
    salesOrderId: 'S-24116',
    invoiceId: null,
    amount: { amount: '15000.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.TRANSFER,
    status: PAYMENT_TRANSACTION_STATUS.POSTED,
    occurredAt: '2026-05-14T12:05:00.000Z',
    idempotencyKey: 'idem-24116-2',
    externalRef: null,
  },
  // S-DEMO-KUPASI — 6.800 ₺ onay bekliyor (24+ saat — kritik uyarı testi)
  {
    id: 'PTX-DEMO-KUPASI-1',
    salesOrderId: 'S-DEMO-KUPASI',
    invoiceId: null,
    amount: { amount: '6800.00', currency: TRY },
    kind: PAYMENT_TRANSACTION_KIND.CAPTURE,
    method: PAYMENT_METHOD.TRANSFER,
    status: PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
    occurredAt: '2026-05-13T08:00:00.000Z',
    idempotencyKey: 'idem-demo-kupasi-1',
    externalRef: 'Kapora havale',
  },
]
