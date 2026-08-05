import { useMemo, useState } from 'react'
import {
  SUPPLIER_LEDGER_ENTRY_TYPE,
  supplierLedgerEntryTypeDisplayCode,
  supplierLedgerEntryTypeLabel,
} from '../../contracts/v1/supplierLedgerEntryTypes.js'
import { erpOpsButtonClass } from '../../lib/actionButtonVariants.js'
import { formatProductMoney } from '../../lib/formatProductMoney.js'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { formatShortDate } from '../../utils/dates.js'
import { parseQty } from '../../mappers/receiving/productReadiness.js'
import {
  buildCustomerRiskSummary,
  parseRiskAmount,
  riskAmountTone,
  riskToneClass,
} from './supplierLedgerCenterUi.js'

/** @typedef {import('../../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplierOperationsDetailDto} SupplierOperationsDetailDto */
/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterRowDto} SupplierLedgerCenterRowDto */

const TABS = [
  { id: 'ledger', label: 'Cari Hareketler' },
  { id: 'pending', label: 'Bekleyen Siparişler' },
  { id: 'incoming', label: 'Gelen Ürünler' },
  { id: 'mailorder', label: 'Mail Orderlar' },
  { id: 'payments', label: 'Ödemeler' },
]

/**
 * @param {{
 *   detail: SupplierDetailDto | null
 *   selectedRow: SupplierLedgerCenterRowDto | null
 *   operations: SupplierOperationsDetailDto | null
 *   ledger: SupplierLedgerEntryDto[]
 *   loading: boolean
 *   onPay?: () => void
 * }} props
 */
export default function SupplierLedgerDetailPanel({
  detail,
  selectedRow,
  operations,
  ledger,
  loading,
  onPay,
}) {
  const [tab, setTab] = useState('ledger')

  const mailOrderRows = useMemo(
    () => ledger.filter((r) => r.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER),
    [ledger],
  )
  const paymentRows = useMemo(
    () => ledger.filter((r) => r.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT),
    [ledger],
  )

  const lineAmounts = useMemo(() => {
    if (!operations) return new Map()
    /** @type {Map<string, number>} */
    const map = new Map()
    for (const p of operations.openProducts) {
      const unitRec = operations.incomingHistory.find((h) => h.productTitle === p.productTitle)
      const unit = unitRec
        ? parseQty(unitRec.unitPurchasePrice)
        : parseQty(p.estimatedUnitCost ?? '0')
      map.set(p.orderLineId, unit * parseQty(p.qtyMissing))
    }
    return map
  }, [operations])

  const pendingTotals = useMemo(() => {
    if (!operations) {
      return { orderCount: 0, productCount: 0, orderTotal: 0, estimatedDebt: 0 }
    }
    let estimatedDebt = 0
    for (const p of operations.openProducts) {
      estimatedDebt += lineAmounts.get(p.orderLineId) ?? 0
    }
    return {
      orderCount: operations.pendingOrderCount,
      productCount: operations.openProductCount,
      orderTotal: estimatedDebt,
      estimatedDebt,
    }
  }, [operations, lineAmounts])

  const customerRiskSummary = useMemo(
    () =>
      operations
        ? buildCustomerRiskSummary(operations.openProducts, lineAmounts)
        : [],
    [operations, lineAmounts],
  )

  if (loading || !detail) {
    return <LoadingBlock title="Tedarikçi risk detayı yükleniyor" />
  }

  const row = selectedRow
  const cariDebt = row?.totalDebt ?? detail.openBalance
  const pendingDebt = row?.pendingOrderDebt ?? operations?.commercial.openProductCostEstimate ?? '0'
  const pendingCount = row?.pendingProductCount ?? operations?.openProductCount ?? 0
  const totalRiskNum =
    parseRiskAmount(row?.totalRisk) ||
    parseRiskAmount(cariDebt) + parseRiskAmount(pendingDebt)
  const totalRiskTone = riskAmountTone(totalRiskNum)

  return (
    <div className="mos-erp-detail mos-supplier-ledger-detail">
      <header className="mos-erp-detail__head">
        <div>
          <h2 className="mos-erp-detail__title">{detail.companyName}</h2>
          <p className="mos-erp-detail__subtitle">
            {detail.code ? `${detail.code} · ` : ''}
            Tedarikçi risk özeti
          </p>
        </div>
        {onPay ? (
          <button type="button" className={erpOpsButtonClass('Ödeme gir')} onClick={onPay}>
            Ödeme gir
          </button>
        ) : null}
      </header>

      <div className="mos-erp-summary mos-erp-summary--cols-4 mos-supplier-ledger-detail__risk" role="list">
        <div className="mos-erp-summary__item" role="listitem">
          <span className="mos-erp-summary__label">Cari Borç</span>
          <span className="mos-erp-summary__value mos-erp-summary__value--warning">
            {formatProductMoney(cariDebt)}
          </span>
        </div>
        <div className="mos-erp-summary__item" role="listitem">
          <span className="mos-erp-summary__label">Bekleyen Sipariş Tutarı</span>
          <span className="mos-erp-summary__value">{formatProductMoney(pendingDebt)}</span>
        </div>
        <div className="mos-erp-summary__item" role="listitem">
          <span className="mos-erp-summary__label">Bekleyen Ürün Adedi</span>
          <span className="mos-erp-summary__value">{pendingCount}</span>
        </div>
        <div className="mos-erp-summary__item" role="listitem">
          <span className="mos-erp-summary__label">Toplam Risk</span>
          <span className={`mos-erp-summary__value ${riskToneClass(totalRiskTone)}`.trim()}>
            {formatProductMoney(totalRiskNum)}
          </span>
        </div>
      </div>

      <nav className="mos-erp-tabs" aria-label="Tedarikçi cari sekmeleri">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mos-erp-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'pending' && operations ? ` (${operations.openProductCount})` : ''}
            {t.id === 'incoming' && operations ? ` (${operations.incomingHistory.length})` : ''}
            {t.id === 'mailorder' ? ` (${mailOrderRows.length})` : ''}
            {t.id === 'payments' ? ` (${paymentRows.length})` : ''}
          </button>
        ))}
      </nav>

      <div className="mos-erp-tab-body">
        {tab === 'ledger' ? (
          ledger.length === 0 ? (
            <p className="mos-erp-tab-empty">Henüz cari hareket yok.</p>
          ) : (
            <LedgerTable rows={ledger} />
          )
        ) : null}

        {tab === 'pending' && operations ? (
          operations.openProducts.length === 0 ? (
            <p className="mos-erp-tab-empty">Bekleyen sipariş kalemi yok.</p>
          ) : (
            <>
              {customerRiskSummary.length > 0 ? (
                <aside className="mos-supplier-ledger-detail__customer-risk" aria-label="Müşteri bazlı risk">
                  <h3 className="mos-supplier-ledger-detail__customer-risk-title">Müşteri Bazlı Risk</h3>
                  <ul className="mos-supplier-ledger-detail__customer-risk-list">
                    {customerRiskSummary.map((c) => (
                      <li key={c.customerName}>
                        <span className="mos-supplier-ledger-detail__customer-name">{c.customerName}</span>
                        <span className="mos-supplier-ledger-detail__customer-amount">
                          {formatProductMoney(c.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : null}
              <div className="mos-erp-tbl-wrap">
                <table className="mos-erp-tbl">
                  <thead>
                    <tr>
                      <th>Sipariş No</th>
                      <th>Müşteri</th>
                      <th>Ürün</th>
                      <th className="is-num">Adet</th>
                      <th>Sipariş Tarihi</th>
                      <th>Tahmini Geliş</th>
                      <th className="is-num">Tutar</th>
                      <th>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.openProducts.map((p) => (
                      <tr key={p.orderLineId} className={`mos-erp-tbl-row${p.isOverdue ? ' is-critical' : ''}`}>
                        <td className="mos-erp-tbl-td">{p.orderNumber}</td>
                        <td className="mos-erp-tbl-td">{p.customerName}</td>
                        <td className="mos-erp-tbl-td">{p.productTitle}</td>
                        <td className="mos-erp-tbl-td is-num">{parseFloat(p.qtyMissing)}</td>
                        <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                          {p.orderDate ? formatShortDate(p.orderDate) : '—'}
                        </td>
                        <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                          {p.dueDate ? formatShortDate(p.dueDate) : '—'}
                        </td>
                        <td className="mos-erp-tbl-td is-num">
                          {formatProductMoney(lineAmounts.get(p.orderLineId) ?? 0)}
                        </td>
                        <td className="mos-erp-tbl-td">{p.isOverdue ? 'Gecikmiş' : 'Bekleniyor'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="mos-supplier-ledger-detail__pending-totals">
                <span>
                  Bekleyen sipariş sayısı: <strong>{pendingTotals.orderCount}</strong>
                </span>
                <span>
                  Bekleyen ürün adedi: <strong>{pendingTotals.productCount}</strong>
                </span>
                <span>
                  Bekleyen sipariş toplamı:{' '}
                  <strong>{formatProductMoney(pendingTotals.orderTotal)}</strong>
                </span>
                <span>
                  Tahmini gelecek borç:{' '}
                  <strong>{formatProductMoney(pendingTotals.estimatedDebt)}</strong>
                </span>
              </footer>
            </>
          )
        ) : null}

        {tab === 'incoming' && operations ? (
          operations.incomingHistory.length === 0 ? (
            <p className="mos-erp-tab-empty">Gelen ürün kaydı yok.</p>
          ) : (
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Ürün</th>
                    <th className="is-num">Adet</th>
                    <th className="is-num">Birim Alış</th>
                    <th className="is-num">Satır Toplam</th>
                    <th>Sipariş</th>
                    <th>Müşteri</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.incomingHistory.map((r) => (
                    <tr key={r.id} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{formatShortDate(r.receivedAt)}</td>
                      <td className="mos-erp-tbl-td">{r.productTitle}</td>
                      <td className="mos-erp-tbl-td is-num">{r.qty}</td>
                      <td className="mos-erp-tbl-td is-num">{formatProductMoney(r.unitPurchasePrice)}</td>
                      <td className="mos-erp-tbl-td is-num">{formatProductMoney(r.lineTotal)}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{r.orderNumber ?? '—'}</td>
                      <td className="mos-erp-tbl-td">{r.customerName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'mailorder' ? (
          mailOrderRows.length === 0 ? (
            <p className="mos-erp-tab-empty">Mail order kaydı yok.</p>
          ) : (
            <LedgerTable rows={mailOrderRows} compact />
          )
        ) : null}

        {tab === 'payments' ? (
          paymentRows.length === 0 ? (
            <p className="mos-erp-tab-empty">Ödeme kaydı yok.</p>
          ) : (
            <LedgerTable rows={paymentRows} compact />
          )
        ) : null}
      </div>
    </div>
  )
}

/**
 * @param {{ rows: SupplierLedgerEntryDto[], compact?: boolean }} props
 */
function LedgerTable({ rows, compact = false }) {
  return (
    <div className="mos-erp-tbl-wrap">
      <table className="mos-erp-tbl">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>İşlem Türü</th>
            {!compact ? (
              <>
                <th>Sipariş No</th>
                <th>Müşteri</th>
                <th>Ürün</th>
              </>
            ) : null}
            <th>Açıklama</th>
            <th className="is-num">Borç</th>
            <th className="is-num">Alacak</th>
            <th className="is-num">Bakiye</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="mos-erp-tbl-row">
              <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{formatShortDate(row.occurredAt)}</td>
              <td className="mos-erp-tbl-td">
                <span className="mos-supplier-ledger-type-code">
                  {supplierLedgerEntryTypeDisplayCode(row.entryType)}
                </span>
                <span className="mos-supplier-ledger-type-label">
                  {supplierLedgerEntryTypeLabel(row.entryType)}
                </span>
              </td>
              {!compact ? (
                <>
                  <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                    {row.salesOrderId ?? row.documentNo ?? '—'}
                  </td>
                  <td className="mos-erp-tbl-td">{row.customerNameSnapshot ?? '—'}</td>
                  <td className="mos-erp-tbl-td">{row.productTitleSnapshot ?? '—'}</td>
                </>
              ) : null}
              <td className="mos-erp-tbl-td">{row.description}</td>
              <td className="mos-erp-tbl-td is-num">{formatProductMoney(row.debitAmount)}</td>
              <td className="mos-erp-tbl-td is-num">{formatProductMoney(row.creditAmount)}</td>
              <td className="mos-erp-tbl-td is-num">{formatProductMoney(row.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
