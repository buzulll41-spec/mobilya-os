import { useState } from 'react'
import {
  SUPPLIER_LEDGER_ENTRY_TYPE,
  supplierLedgerEntryTypeDisplayCode,
  supplierLedgerEntryTypeLabel,
} from '../../contracts/v1/supplierLedgerEntryTypes.js'
import { supplierLedgerStatusLabel } from '../../contracts/v1/supplierLedgerStatuses.js'
import { SUPPLIER_HEALTH_STATUS } from '../../mappers/supply/supplierHealth.js'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import { extractSupplierCity } from '../../mappers/supply/supplierOperationsCore.js'
import { formatShortDate } from '../../utils/dates.js'
import { erpDetailActionClass } from '../../lib/actionButtonVariants.js'

/** @typedef {import('../../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplierOperationsDetailDto} SupplierOperationsDetailDto */

const TABS = [
  { id: 'ledger', label: 'Cari hareketler' },
  { id: 'open', label: 'Açık ürünler' },
  { id: 'pending', label: 'Bekleyen siparişler' },
  { id: 'incoming', label: 'Son gelen ürünler' },
  { id: 'warehouse', label: 'Depo Girişi' },
]

/**
 * @param {string} amount
 */
function formatMoneyCell(amount) {
  const n = Number.parseFloat(amount)
  if (!Number.isFinite(n) || n <= 0.009) return '—'
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * @param {string | undefined} status
 */
function healthFieldClass(status) {
  if (status === SUPPLIER_HEALTH_STATUS.CRITICAL) return ' mos-erp-detail__field-value--critical'
  if (status === SUPPLIER_HEALTH_STATUS.RISKY) return ' mos-erp-detail__field-value--warning'
  return ''
}

/**
 * Son ödeme = cari hareketler içindeki en güncel PAYMENT kaydı.
 * @param {SupplierLedgerEntryDto[]} ledger
 */
function findLastPayment(ledger) {
  let last = null
  for (const row of ledger) {
    if (row.entryType !== SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT) continue
    if (!last || row.occurredAt > last.occurredAt) last = row
  }
  return last
}

/**
 * @param {SupplierOperationsDetailDto | null} operations
 */
function buildNextActionLabel(operations) {
  if (!operations) return '—'
  if (operations.openProductCount > 0) return `${operations.openProductCount} ürün bekleniyor`
  const open = Number.parseFloat(operations.commercial.openBalance)
  if (Number.isFinite(open) && open > 0.009) return 'Ödeme planlanmalı'
  return 'Takip gerekmiyor'
}

/**
 * @param {{
 *   detail: SupplierDetailDto | null
 *   operations: SupplierOperationsDetailDto | null
 *   ledger: SupplierLedgerEntryDto[]
 *   warehouseEntries?: import('../../contracts/v1/warehouseEntry.js').WarehouseEntryDto[]
 *   loading: boolean
 *   actionBusy: boolean
 *   onPay: () => void
 *   onToggleActive: () => void
 * }} props
 */
export default function SupplierOpsDetailPanel({
  detail,
  operations,
  ledger,
  warehouseEntries = [],
  loading,
  actionBusy,
  onPay,
  onToggleActive,
}) {
  const [tab, setTab] = useState('ledger')

  if (loading || !detail) {
    return <LoadingBlock title="Operasyon merkezi yükleniyor" />
  }

  const city = extractSupplierCity(detail.address)
  const lastPayment = findLastPayment(ledger)
  const openBalanceValue = operations
    ? formatMoneyCell(operations.commercial.openBalance)
    : formatMoneyCell(detail.openBalance)
  const openBalanceNum = Number.parseFloat(operations?.commercial.openBalance ?? detail.openBalance)
  const openBalanceCritical = Number.isFinite(openBalanceNum) && openBalanceNum > 0.009

  return (
    <div className="mos-erp-subdetail">
      {/* Kompakt bilgi paneli — ERP detay şeridi dili */}
      <section className="mos-erp-detail" aria-label="Tedarikçi detayı">
        <div className="mos-erp-detail__grid">
          <div className="mos-erp-detail__body">
            <div className="mos-erp-detail__primary">
              <h2 className="mos-erp-detail__name">{detail.companyName}</h2>
              <span className="mos-erp-detail__meta">
                {detail.code ? `Kod: ${detail.code}` : 'Kod yok'}
                {city ? ` · ${city}` : ''}
              </span>
            </div>
            <div className="mos-erp-detail__field mos-erp-detail__field--emphasis">
              <span className="mos-erp-detail__field-label">Cari durum</span>
              <span className={`mos-erp-detail__field-value${healthFieldClass(operations?.healthStatus)}`}>
                {operations?.healthLabel ?? '—'}
              </span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Bekleyen ürün</span>
              <span className="mos-erp-detail__field-value">{operations?.openProductCount ?? 0}</span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Gelen ürün</span>
              <span className="mos-erp-detail__field-value">
                {operations?.incomingHistory.length ?? 0}
              </span>
            </div>
            <div className="mos-erp-detail__field mos-erp-detail__field--emphasis">
              <span className="mos-erp-detail__field-label">Açık bakiye</span>
              <span
                className={`mos-erp-detail__field-value${
                  openBalanceCritical ? ' mos-erp-detail__field-value--critical' : ''
                }`}
              >
                {openBalanceValue} TL
              </span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Son işlem</span>
              <span className="mos-erp-detail__field-value">
                {operations?.lastActivityLabel ?? '—'}
              </span>
            </div>
            <div className="mos-erp-detail__field">
              <span className="mos-erp-detail__field-label">Sonraki aksiyon</span>
              <span className="mos-erp-detail__field-value">{buildNextActionLabel(operations)}</span>
            </div>
          </div>
          <div className="mos-erp-detail__actions">
            <button
              type="button"
              className={erpDetailActionClass('Ödeme kaydı')}
              disabled={actionBusy || !detail.isActive}
              onClick={onPay}
            >
              Ödeme kaydı
            </button>
            <button
              type="button"
              className={erpDetailActionClass(detail.isActive ? 'Pasifleştir' : 'Aktifleştir')}
              disabled={actionBusy}
              onClick={onToggleActive}
            >
              {detail.isActive ? 'Pasifleştir' : 'Aktifleştir'}
            </button>
          </div>
        </div>
      </section>

      {/* Ticari özet — ERP özet hücreleri (KPI kartı değil) */}
      {operations ? (
        <div className="mos-erp-summary mos-erp-summary--cols-5" role="list" aria-label="Ticari özet">
          <div className="mos-erp-summary__item" role="listitem">
            <span className="mos-erp-summary__label">Alacak (ödeme)</span>
            <span className="mos-erp-summary__value">
              {formatMoneyCell(operations.commercial.totalPayments)}
            </span>
          </div>
          <div className="mos-erp-summary__item" role="listitem">
            <span className="mos-erp-summary__label">Borç (alım)</span>
            <span className="mos-erp-summary__value">
              {formatMoneyCell(operations.commercial.totalPurchases)}
            </span>
          </div>
          <div className="mos-erp-summary__item" role="listitem">
            <span className="mos-erp-summary__label">Net bakiye</span>
            <span
              className={`mos-erp-summary__value${
                openBalanceCritical ? ' mos-erp-summary__value--critical' : ''
              }`}
            >
              {formatMoneyCell(operations.commercial.openBalance)}
            </span>
          </div>
          <div className="mos-erp-summary__item" role="listitem">
            <span className="mos-erp-summary__label">Bekleyen ürün</span>
            <span className="mos-erp-summary__value">{operations.openProductCount}</span>
          </div>
          <div className="mos-erp-summary__item" role="listitem">
            <span className="mos-erp-summary__label">Son ödeme</span>
            <span className="mos-erp-summary__value">
              {lastPayment ? formatShortDate(lastPayment.occurredAt) : '—'}
            </span>
          </div>
        </div>
      ) : null}

      {/* Sekmeler — düz ERP sekme dili */}
      <nav className="mos-erp-tabs" aria-label="Tedarikçi detay sekmeleri">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mos-erp-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'open' && operations ? ` (${operations.openProductCount})` : ''}
            {t.id === 'pending' && operations ? ` (${operations.pendingOrderCount})` : ''}
            {t.id === 'warehouse' ? ` (${warehouseEntries.length})` : ''}
          </button>
        ))}
      </nav>

      <div className="mos-erp-tab-body">
        {tab === 'ledger' ? (
          ledger.length === 0 ? (
            <p className="mos-erp-tab-empty">Henüz hareket yok.</p>
          ) : (
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>İşlem türü</th>
                    <th>Sipariş no</th>
                    <th>Müşteri</th>
                    <th>Ürün</th>
                    <th>Açıklama</th>
                    <th>Durum</th>
                    <th className="is-num">Borç (−)</th>
                    <th className="is-num">Alacak (+)</th>
                    <th className="is-num">Bakiye</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((row) => (
                    <tr key={row.id} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {formatShortDate(row.occurredAt)}
                      </td>
                      <td className="mos-erp-tbl-td">
                        <span className="mos-supplier-ledger-type-code">
                          {supplierLedgerEntryTypeDisplayCode(row.entryType)}
                        </span>
                        <span className="mos-supplier-ledger-type-label">
                          {supplierLedgerEntryTypeLabel(row.entryType)}
                        </span>
                      </td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {row.salesOrderId ?? row.documentNo ?? '—'}
                      </td>
                      <td className="mos-erp-tbl-td">{row.customerNameSnapshot ?? '—'}</td>
                      <td className="mos-erp-tbl-td">{row.productTitleSnapshot ?? '—'}</td>
                      <td className="mos-erp-tbl-td">{row.description}</td>
                      <td className="mos-erp-tbl-td">{supplierLedgerStatusLabel(row.status)}</td>
                      <td className="mos-erp-tbl-td is-num">{formatMoneyCell(row.debitAmount)}</td>
                      <td className="mos-erp-tbl-td is-num">{formatMoneyCell(row.creditAmount)}</td>
                      <td className="mos-erp-tbl-td is-num">{formatMoneyCell(row.balanceAfter)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'open' && operations ? (
          operations.openProducts.length === 0 ? (
            <p className="mos-erp-tab-empty">Bu tedarikçiye bağlı açık ürün yok.</p>
          ) : (
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Müşteri</th>
                    <th>Sipariş</th>
                    <th className="is-num">Gelen / Sipariş</th>
                    <th className="is-num">Eksik</th>
                    <th>Teslim</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.openProducts.map((p) => (
                    <tr key={p.orderLineId} className={`mos-erp-tbl-row${p.isOverdue ? ' is-critical' : ''}`}>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{p.productTitle}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{p.customerName}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{p.orderNumber}</td>
                      <td className="mos-erp-tbl-td is-num">
                        {parseFloat(p.qtyReceived)} / {parseFloat(p.qtyOrdered)}
                      </td>
                      <td className="mos-erp-tbl-td is-num mos-erp-tbl-td--status is-warning">
                        {p.qtyMissing}
                      </td>
                      <td
                        className={`mos-erp-tbl-td mos-erp-tbl-td--muted${
                          p.isOverdue ? ' mos-erp-tbl-td--status is-critical' : ''
                        }`}
                      >
                        {p.dueDate ? formatShortDate(p.dueDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'pending' && operations ? (
          operations.pendingOrders.length === 0 ? (
            <p className="mos-erp-tab-empty">Bekleyen sipariş yok.</p>
          ) : (
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Müşteri</th>
                    <th>Sipariş</th>
                    <th className="is-num">Açık kalem</th>
                    <th className="is-num">Eksik adet</th>
                    <th>Teslim</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.pendingOrders.map((o) => (
                    <tr key={o.salesOrderId} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{o.customerName}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{o.orderNumber}</td>
                      <td className="mos-erp-tbl-td is-num">{o.openLineCount}</td>
                      <td className="mos-erp-tbl-td is-num">{o.missingQtyTotal}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {o.dueDate ? formatShortDate(o.dueDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    <th>Ürün</th>
                    <th className="is-num">Adet</th>
                    <th className="is-num">Alış</th>
                    <th className="is-num">Tutar</th>
                    <th>Tarih</th>
                    <th>Sipariş</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.incomingHistory.map((row) => (
                    <tr key={row.id} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{row.productTitle}</td>
                      <td className="mos-erp-tbl-td is-num">{row.qty}</td>
                      <td className="mos-erp-tbl-td is-num">{formatMoneyCell(row.unitPurchasePrice)}</td>
                      <td className="mos-erp-tbl-td is-num">{formatMoneyCell(row.lineTotal)}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {formatShortDate(row.receivedAt)}
                      </td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {row.orderNumber
                          ? `${row.customerName ?? ''} · ${row.orderNumber}`.trim()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === 'warehouse' ? (
          warehouseEntries.length === 0 ? (
            <p className="mos-erp-tab-empty">
              Bu tedarikçiye bağlı depo/stok kaydı yok. (Ürünün şu an nerede olduğu — satış raporu
              değildir.)
            </p>
          ) : (
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Müşteri</th>
                    <th>Sipariş No</th>
                    <th className="is-num">Adet</th>
                    <th>Geliş</th>
                    <th>Fiziksel Lokasyon</th>
                    <th>Stok Durumu</th>
                    <th>Rezerve</th>
                    <th>Sevke Hazır</th>
                    <th>Not</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseEntries.map((row) => (
                    <tr key={row.id} className="mos-erp-tbl-row">
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{row.productTitle}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {row.customerName ?? '—'}
                      </td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {row.orderNumber ?? '—'}
                      </td>
                      <td className="mos-erp-tbl-td is-num">{row.qty}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                        {formatShortDate(row.receivedAt)}
                      </td>
                      <td className="mos-erp-tbl-td">{row.physicalLocationLabel ?? '—'}</td>
                      <td
                        className={`mos-erp-tbl-td mos-erp-tbl-td--status${
                          row.stockStatus === 'CUSTOMER_HOLD' || row.stockStatus === 'MISSING_PART'
                            ? ' is-warning'
                            : row.stockStatus === 'READY_TO_SHIP'
                              ? ' is-success'
                              : ''
                        }`}
                      >
                        {row.stockStatusLabel}
                      </td>
                      <td className="mos-erp-tbl-td">{row.reserved ? 'Evet' : 'Hayır'}</td>
                      <td className="mos-erp-tbl-td">{row.readyToShip ? 'Evet' : 'Hayır'}</td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </div>
  )
}
