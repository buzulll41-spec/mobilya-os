import { describe, expect, it } from 'vitest'
import { computeOpenBalanceFromLedger } from '../../src/mappers/supply/supplierLedgerBalance.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../../src/contracts/v1/supplierLedgerEntryTypes.js'

describe('supplierLedgerBalance', () => {
  it('open balance = credit - debit', () => {
    const balance = computeOpenBalanceFromLedger([
      {
        id: '1',
        supplierId: 's1',
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
        occurredAt: '2026-05-14',
        description: 'Mal',
        debitAmount: '0.00',
        creditAmount: '45000.00',
        balanceAfter: '45000.00',
        currency: 'TRY',
        paymentMethod: null,
        documentNo: null,
        createdAt: '',
      },
      {
        id: '2',
        supplierId: 's1',
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
        occurredAt: '2026-05-15',
        description: 'Ödeme',
        debitAmount: '20000.00',
        creditAmount: '0.00',
        balanceAfter: '25000.00',
        currency: 'TRY',
        paymentMethod: 'TRANSFER',
        documentNo: null,
        createdAt: '',
      },
    ])
    expect(balance).toBe(25000)
  })
})
