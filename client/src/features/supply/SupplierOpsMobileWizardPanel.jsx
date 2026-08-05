import { useEffect, useMemo, useState } from 'react'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import MobileAccordionSection from '../../components/mobile/MobileAccordionSection.jsx'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplierOperationsDetailDto} SupplierOperationsDetailDto */
/** @typedef {import('../../contracts/v1/warehouseEntry.js').WarehouseEntryDto[]} WarehouseEntryDtoList */

const SECTIONS = [
  { id: 'summary', label: '1. Tedarik özeti' },
  { id: 'products', label: '2. Ürünler' },
  { id: 'qty', label: '3. Beklenen/gelen adet' },
  { id: 'dates', label: '4. Geliş tarihi' },
  { id: 'issues', label: '5. Eksik veya hasarlı ürün' },
  { id: 'notes', label: '6. Tedarikçi notları' },
  { id: 'payment', label: '7. Ödeme bilgisi' },
  { id: 'history', label: '8. Hareket geçmişi' },
]

/**
 * @param {string} amount
 */
function formatMoney(amount) {
  const value = Number.parseFloat(amount)
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * @param {{
 *   detail: SupplierDetailDto | null
 *   operations: SupplierOperationsDetailDto | null
 *   ledger: SupplierLedgerEntryDto[]
 *   warehouseEntries: WarehouseEntryDtoList
 *   loading: boolean
 *   actionBusy: boolean
 *   onPay: () => void
 *   onOpenIncomingGoods: () => void
 *   onClose: () => void
 * }} props
 */
export default function SupplierOpsMobileWizardPanel({
  detail,
  operations,
  ledger,
  warehouseEntries,
  loading,
  actionBusy,
  onPay,
  onOpenIncomingGoods,
  onClose,
}) {
  const [openSectionId, setOpenSectionId] = useState('summary')
  const [issueDraft, setIssueDraft] = useState('')
  const [supplierNoteDraft, setSupplierNoteDraft] = useState('')

  useEffect(() => {
    setOpenSectionId('summary')
    setIssueDraft('')
    setSupplierNoteDraft('')
  }, [detail?.id])

  if (loading || !detail) {
    return <LoadingBlock title="Tedarik kartı yükleniyor" />
  }

  const openProducts = operations?.openProducts ?? []
  const pendingOrders = operations?.pendingOrders ?? []
  const incomingHistory = operations?.incomingHistory ?? []
  const openBalance = formatMoney(operations?.commercial.openBalance ?? detail.openBalance)
  const totalPayments = formatMoney(operations?.commercial.totalPayments ?? '0')
  const totalPurchases = formatMoney(operations?.commercial.totalPurchases ?? '0')
  const openProductCost = formatMoney(operations?.commercial.openProductCostEstimate ?? '0')
  const lastLedger = ledger.at(-1) ?? null

  const paymentEntries = useMemo(
    () => ledger.filter((entry) => entry.entryType === 'PAYMENT').slice(0, 5),
    [ledger],
  )

  const hasDelay = openProducts.some((p) => p.isOverdue)

  const rawPhone = String(detail.phone ?? '').trim()
  const digits = rawPhone.replace(/\D/g, '')
  const normalizedPhone = digits.length < 10 ? null : digits.startsWith('90') ? digits : digits.startsWith('0') ? `90${digits.slice(1)}` : `90${digits}`
  const callHref = normalizedPhone ? `tel:+${normalizedPhone}` : null
  const whatsappHref = normalizedPhone ? `https://wa.me/${normalizedPhone}` : null

  return (
    <section className="mos-supply-mobile-wizard" aria-label="Tedarikçi kartı detayları">
      <header className="mos-supply-mobile-wizard__head">
        <div>
          <p className="mos-supply-mobile-wizard__kicker">Kart açıldı</p>
          <h2 className="mos-supply-mobile-wizard__title">{detail.companyName}</h2>
          <p className="mos-supply-mobile-wizard__meta">
            {detail.code ? `Kod: ${detail.code}` : 'Kod yok'}
            {detail.address ? ` · ${detail.address}` : ''}
          </p>
        </div>
        <div className="mos-supply-mobile-wizard__status">
          <span>{operations?.healthLabel ?? '—'}</span>
          <strong>{operations?.openProductCount ?? 0} bekleyen ürün</strong>
        </div>
      </header>

      <div className="mos-supply-mobile-wizard__stage">
        <section className="mos-supply-mobile-wizard__accordion mos-mobile-accordion" aria-label="Tedarik detay accordion">
          {SECTIONS.map((section) => (
            <MobileAccordionSection
              key={section.id}
              id={section.id}
              label={section.label}
              open={openSectionId === section.id}
              onOpen={setOpenSectionId}
            >
              {section.id === 'summary' ? (
                <div className="mos-supply-mobile-wizard__summary-grid">
                  <div><span>Tedarikçi</span><strong>{detail.companyName}</strong></div>
                  <div><span>Durum</span><strong>{operations?.healthLabel ?? '—'}</strong></div>
                  <div><span>Açık ürün</span><strong>{operations?.openProductCount ?? 0}</strong></div>
                  <div><span>Açık bakiye</span><strong>{openBalance} TL</strong></div>
                </div>
              ) : null}

              {section.id === 'products' ? (
                openProducts.length === 0 ? (
                  <p className="mos-supply-mobile-wizard__empty">Açık ürün yok.</p>
                ) : (
                  <div className="mos-supply-mobile-wizard__cards">
                    {openProducts.map((product) => (
                      <article key={product.orderLineId} className="mos-supply-mobile-wizard__record">
                        <strong>{product.productTitle}</strong>
                        <p>{product.customerName} · {product.orderNumber}</p>
                        <p>Eksik: {formatMoney(product.qtyMissing)}</p>
                      </article>
                    ))}
                  </div>
                )
              ) : null}

              {section.id === 'qty' ? (
                openProducts.length === 0 ? (
                  <p className="mos-supply-mobile-wizard__empty">Bekleyen adet yok.</p>
                ) : (
                  <div className="mos-supply-mobile-wizard__cards">
                    {openProducts.map((product) => (
                      <article key={`${product.orderLineId}-qty`} className="mos-supply-mobile-wizard__record">
                        <strong>{product.productTitle}</strong>
                        <p>Beklenen: {formatMoney(product.qtyOrdered)}</p>
                        <p>Gelen: {formatMoney(product.qtyReceived)}</p>
                        <p>Eksik: {formatMoney(product.qtyMissing)}</p>
                      </article>
                    ))}
                  </div>
                )
              ) : null}

              {section.id === 'dates' ? (
                <div className="mos-supply-mobile-wizard__cards">
                  {openProducts.length === 0 ? (
                    <p className="mos-supply-mobile-wizard__empty">Planlı geliş tarihi yok.</p>
                  ) : (
                    openProducts.map((product) => (
                      <article key={`${product.orderLineId}-date`} className="mos-supply-mobile-wizard__record">
                        <strong>{product.productTitle}</strong>
                        <p>Beklenen: {product.dueDate ? formatShortDate(product.dueDate) : '—'}</p>
                        <p>Gecikme: {product.isOverdue ? 'Gecikmiş' : 'Planında'}</p>
                      </article>
                    ))
                  )}
                  {incomingHistory.slice(0, 3).map((row) => (
                    <article key={`incoming-${row.id}`} className="mos-supply-mobile-wizard__record">
                      <strong>{row.productTitle}</strong>
                      <p>Geliş: {formatShortDate(row.receivedAt)}</p>
                    </article>
                  ))}
                </div>
              ) : null}

              {section.id === 'issues' ? (
                <>
                  <p className="mos-supply-mobile-wizard__mini-note">
                    Gecikme durumu: {hasDelay ? 'Gecikmiş ürün var' : 'Gecikme yok'}
                  </p>
                  <label className="mos-supply-mobile-wizard__field">
                    <span>Eksik / hasarlı notu</span>
                    <textarea
                      rows={4}
                      value={issueDraft}
                      onChange={(event) => setIssueDraft(event.target.value)}
                      placeholder="Eksik veya hasarlı ürün notunu girin"
                    />
                  </label>
                </>
              ) : null}

              {section.id === 'notes' ? (
                <>
                  <label className="mos-supply-mobile-wizard__field">
                    <span>Tedarikçi notu</span>
                    <textarea
                      rows={4}
                      value={supplierNoteDraft}
                      onChange={(event) => setSupplierNoteDraft(event.target.value)}
                      placeholder="Tedarikçi ile ilgili not"
                    />
                  </label>
                  <p className="mos-supply-mobile-wizard__mini-note">
                    Son işlem notu: {lastLedger?.description ?? '—'}
                  </p>
                </>
              ) : null}

              {section.id === 'payment' ? (
                <>
                  <div className="mos-supply-mobile-wizard__summary-grid">
                    <div><span>Toplam alış</span><strong>{totalPurchases} TL</strong></div>
                    <div><span>Toplam ödeme</span><strong>{totalPayments} TL</strong></div>
                    <div><span>Açık bakiye</span><strong>{openBalance} TL</strong></div>
                    <div><span>Bekleyen ürün maliyeti</span><strong>{openProductCost} TL</strong></div>
                  </div>
                  {paymentEntries.length > 0 ? (
                    <div className="mos-supply-mobile-wizard__cards">
                      {paymentEntries.map((entry) => (
                        <article key={entry.id} className="mos-supply-mobile-wizard__record">
                          <strong>{formatShortDate(entry.occurredAt)}</strong>
                          <p>{entry.description}</p>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}

              {section.id === 'history' ? (
                <div className="mos-supply-mobile-wizard__cards">
                  {ledger.slice(0, 8).map((entry) => (
                    <article key={entry.id} className="mos-supply-mobile-wizard__record">
                      <strong>{formatShortDate(entry.occurredAt)}</strong>
                      <p>{entry.description}</p>
                    </article>
                  ))}
                  {warehouseEntries.slice(0, 4).map((row) => (
                    <article key={row.id} className="mos-supply-mobile-wizard__record">
                      <strong>{row.title}</strong>
                      <p>{row.statusLabel} · {formatShortDate(row.createdAt)}</p>
                    </article>
                  ))}
                </div>
              ) : null}
            </MobileAccordionSection>
          ))}
        </section>
      </div>

      <div className="mos-supply-mobile-wizard__footer">
        {callHref ? (
          <a className="mos-supply-mobile-wizard__action" href={callHref}>Ara</a>
        ) : (
          <button type="button" className="mos-supply-mobile-wizard__action" disabled>Ara</button>
        )}

        {whatsappHref ? (
          <a className="mos-supply-mobile-wizard__action" href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>
        ) : (
          <button type="button" className="mos-supply-mobile-wizard__action" disabled>WhatsApp</button>
        )}

        <button type="button" className="mos-supply-mobile-wizard__action" disabled={actionBusy} onClick={onOpenIncomingGoods}>
          Gelen Ürün Kaydı
        </button>
        <button type="button" className="mos-supply-mobile-wizard__action" onClick={() => setOpenSectionId('issues')}>
          Eksik/Hasarlı
        </button>
        <button type="button" className="mos-supply-mobile-wizard__action mos-supply-mobile-wizard__action--primary" disabled={actionBusy} onClick={onPay}>
          Ödeme Kaydı
        </button>
      </div>
    </section>
  )
}
