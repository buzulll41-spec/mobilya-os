import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

import { createPortal } from 'react-dom'

import { formatTry } from '../../data/index.js'

import { buildSalesContractModel } from '../../mappers/sales-contract/buildSalesContractModel.js'

import {

  buildContractLineRowsFromWizardForm,

  fetchSalesContractLineRows,

} from '../../services/salesContractLines.js'

import { computeOrderTotals } from './newOrderWizardModel.js'

import { exportSalesContractPdf } from '../../lib/exportSalesContractPdf.js'
import { useOrders } from '../../state/useOrders.js'

import '../../styles/sales-contract-print.css'



/** @typedef {import('../../data/seedOrders.js').Order} Order */

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @typedef {import('../../mappers/sales-contract/buildSalesContractModel.js').SalesContractModel} SalesContractModel */

/** @typedef {import('./newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */



/**

 * @param {{

 *   open: boolean

 *   order: Order | null

 *   listItemDto?: SalesOrderListItemDto

 *   onClose: () => void

 *   variant?: 'default' | 'postCreate'

 *   wizardForm?: NewOrderWizardForm

 *   onGoToOrderDetail?: () => void

 * }} props

 */

export default function SalesContractPrint({

  open,

  order,

  listItemDto,

  onClose,

  variant = 'default',

  wizardForm,

  onGoToOrderDetail,

}) {

  const { recordContractPrinted } = useOrders()
  const [model, setModel] = useState(/** @type {SalesContractModel | null} */ (null))

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState(/** @type {string | null} */ (null))

  const [pdfBusy, setPdfBusy] = useState(false)

  const [pdfError, setPdfError] = useState(/** @type {string | null} */ (null))

  const printAreaRef = useRef(/** @type {HTMLElement | null} */ (null))
  const overlayRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const previousActiveElementRef = useRef(/** @type {HTMLElement | null} */ (null))

  const isPostCreate = variant === 'postCreate'



  useEffect(() => {

    if (!open || !order) {

      /* eslint-disable-next-line react-hooks/set-state-in-effect -- kapalıyken önizleme state temizlenir */

      setModel(null)

      setError(null)

      setPdfError(null)

      return

    }

    let cancelled = false

    setLoading(true)

    setError(null)

    void (async () => {

      try {

        const lines = wizardForm

          ? buildContractLineRowsFromWizardForm(wizardForm)

          : await fetchSalesContractLineRows(order.id, order.amount ?? 0)

        if (cancelled) return

        const buildOptions = wizardForm

          ? (() => {

              const fin = computeOrderTotals(wizardForm)

              return {

                financeExtras: {

                  subtotal: fin.subtotal,

                  totalDiscount: fin.totalDiscount,

                  grandTotal: fin.grandTotal,

                },

                paymentNote: wizardForm.paymentNote,

              }

            })()

          : undefined

        setModel(buildSalesContractModel(order, listItemDto, lines, buildOptions))

      } catch (e) {

        if (cancelled) return

        setError(e instanceof Error ? e.message : 'Sözleşme yüklenemedi')

        setModel(null)

      } finally {

        if (!cancelled) setLoading(false)

      }

    })()

    return () => {

      cancelled = true

    }

  }, [open, order, listItemDto, wizardForm])



  useEffect(() => {

    if (!open) return

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    const rafId = window.requestAnimationFrame(() => {
      overlayRef.current?.focus()
    })

    function onKeyDown(e) {

      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab' || !overlayRef.current) return

      const container = overlayRef.current
      const focusables = Array.from(
        container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el instanceof HTMLElement && !el.hasAttribute('disabled'))

      if (focusables.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }

      const first = /** @type {HTMLElement} */ (focusables[0])
      const last = /** @type {HTMLElement} */ (focusables[focusables.length - 1])
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null

      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }

    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
      previousActiveElementRef.current?.focus()
    }

  }, [open, onClose])



  const handlePrint = useCallback(() => {
    if (order?.id) void recordContractPrinted(order.id)
    window.print()
  }, [order?.id, recordContractPrinted])

  const handleSavePdf = useCallback(async () => {
    const el = printAreaRef.current
    if (!el || !model) return
    setPdfBusy(true)
    setPdfError(null)
    try {
      await exportSalesContractPdf(el, model.order.orderNo)
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'PDF oluşturulamadı')
    } finally {
      setPdfBusy(false)
    }
  }, [model])



  if (!open || !order) return null



  const toolbarTitle = isPostCreate

    ? 'Satış Sözleşmesi Önizleme'

    : `Satış Sözleşmesi — ${order.customer}`



  return createPortal(

    <div
      ref={overlayRef}
      className="scp-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={toolbarTitle}
      tabIndex={-1}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >

      <header className="scp-toolbar sales-contract-print-toolbar">

        <div>

          <p className="scp-toolbar-title">{toolbarTitle}</p>

          {isPostCreate ? (

            <p className="scp-toolbar-hint">

              Sipariş kaydedildi. Kontrol edin, yazdırın veya sipariş detayına geçin.

            </p>

          ) : null}

        </div>

        <div className="scp-toolbar-actions">

          <button

            type="button"

            className="scp-btn scp-btn--primary"

            disabled={!model}

            onClick={handlePrint}

          >

            Yazdır

          </button>

          <button

            type="button"

            className="scp-btn scp-btn--secondary"

            disabled={!model || pdfBusy}

            onClick={() => void handleSavePdf()}

          >

            {pdfBusy ? 'PDF hazırlanıyor…' : 'PDF Olarak Kaydet'}

          </button>

          {isPostCreate && onGoToOrderDetail ? (

            <button
              type="button"
              className="scp-btn scp-btn--secondary"
              onClick={() => {
                onClose()
                onGoToOrderDetail()
              }}
            >

              Sipariş Detayına Git

            </button>

          ) : null}

          <button type="button" className="scp-btn scp-btn--ghost" onClick={onClose}>

            Kapat

          </button>

        </div>

      </header>

      <div className="scp-preview-scroll">

        {loading ? <p className="scp-loading">Sözleşme hazırlanıyor…</p> : null}

        {error ? <p className="scp-loading">{error}</p> : null}

        {pdfError ? <p className="scp-loading scp-pdf-error">{pdfError}</p> : null}
        {model ? <SalesContractDocument ref={printAreaRef} model={model} /> : null}

      </div>

    </div>,

    document.body,

  )

}



/** @param {{ model: SalesContractModel }} props */

const SalesContractDocument = forwardRef(function SalesContractDocument({ model }, ref) {

  const { store, customer, order, lines, finance, delivery, terms } = model

  const showDiscount = finance.totalDiscount > 0



  return (

    <article
      ref={ref}
      className="scp-document sales-contract-print-area"
      id="scp-print-root"
    >

      <header className="scp-head">

        <div>

          <p className="scp-store-brand">{store.brand}</p>

          <p className="scp-store-name">{store.name}</p>

          <p className="scp-store-meta">{store.address}</p>

          <p className="scp-store-meta">Tel: {store.phone}</p>

        </div>

        <div className="scp-title-block">

          <h1 className="scp-doc-title">SATIŞ SÖZLEŞMESİ</h1>

          <p className="scp-doc-meta">

            Sipariş No: <strong>{order.orderNo}</strong>

          </p>

          <p className="scp-doc-meta">Sipariş tarihi: {order.orderDate}</p>

          {order.dueDate ? <p className="scp-doc-meta">Teslim tarihi: {order.dueDate}</p> : null}

        </div>

      </header>



      <section className="scp-section">

        <h2 className="scp-section-title">Müşteri bilgileri</h2>

        <table className="scp-table scp-table--kv">

          <tbody>

            <tr>

              <td>Ad / Ünvan</td>

              <td>{customer.name}</td>

            </tr>

            <tr>

              <td>Telefon</td>

              <td>{customer.phone || '—'}</td>

            </tr>

            {customer.phone2 ? (

              <tr>

                <td>2. telefon</td>

                <td>{customer.phone2}</td>

              </tr>

            ) : null}

            {customer.nationalId ? (

              <tr>

                <td>TC Kimlik No</td>

                <td>{customer.nationalId}</td>

              </tr>

            ) : null}

            {customer.taxNumber ? (

              <tr>

                <td>Vergi no</td>

                <td>{customer.taxNumber}</td>

              </tr>

            ) : null}

            {customer.taxOffice ? (

              <tr>

                <td>Vergi dairesi</td>

                <td>{customer.taxOffice}</td>

              </tr>

            ) : null}

            <tr>

              <td>Adres</td>

              <td>{customer.address || '—'}</td>

            </tr>

            <tr>

              <td>Satış danışmanı</td>

              <td>{order.salesPerson || '—'}</td>

            </tr>

          </tbody>

        </table>

      </section>



      <section className="scp-section">

        <h2 className="scp-section-title">Ürünler</h2>

        <table className="scp-table scp-table--products">

          <thead>

            <tr>

              <th>Ürün</th>

              <th>Kategori</th>

              <th>Tedarikçi</th>

              <th>Adet</th>

              <th>Birim fiyat</th>

              <th>Toplam</th>

            </tr>

          </thead>

          <tbody>

            {lines.map((line, i) => (

              <tr key={`${line.title}-${i}`}>

                <td>

                  <div className="scp-line-title">

                    {line.title} x{line.quantity}

                  </div>

                  {line.configurationLines?.length ? (

                    <ul className="scp-line-config">

                      {line.configurationLines.map((row) => (

                        <li key={row}>{row}</li>

                      ))}

                    </ul>

                  ) : line.fabricNote ? (

                    <p className="scp-line-note">{line.fabricNote}</p>

                  ) : null}

                </td>

                <td>{line.productGroup || '—'}</td>

                <td>{line.supplierName || '—'}</td>

                <td>{line.quantity}</td>

                <td>{line.unitPrice != null ? formatTry(line.unitPrice) : '—'}</td>

                <td>{line.lineTotal != null ? formatTry(line.lineTotal) : '—'}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </section>



      <section className="scp-section">

        <h2 className="scp-section-title">Ödeme özeti</h2>

        <table className="scp-table scp-table--kv scp-table--finance">

          <tbody>

            {showDiscount ? (

              <>

                <tr>

                  <td>Ara toplam</td>

                  <td>{formatTry(finance.subtotal)}</td>

                </tr>

                <tr>

                  <td>İskonto</td>

                  <td>−{formatTry(finance.totalDiscount)}</td>

                </tr>

              </>

            ) : null}

            <tr>

              <td>Genel toplam</td>

              <td>{formatTry(finance.grandTotal)}</td>

            </tr>

            <tr>

              <td>Tahsil edilen</td>

              <td>{formatTry(finance.paid)}</td>

            </tr>

            <tr>

              <td>Kalan bakiye</td>

              <td>{formatTry(finance.remaining)}</td>

            </tr>

            <tr>

              <td>Ödeme yöntemi</td>

              <td>{finance.paymentMethod || '—'}</td>

            </tr>

            {finance.paymentNote ? (

              <tr>

                <td>Ödeme notu</td>

                <td>{finance.paymentNote}</td>

              </tr>

            ) : null}

          </tbody>

        </table>

      </section>



      <section className="scp-section">

        <h2 className="scp-section-title">Teslimat</h2>

        <table className="scp-table scp-table--kv">

          <tbody>

            <tr>

              <td>Teslim adresi</td>

              <td>{delivery.address || '—'}</td>

            </tr>

            <tr>

              <td>Planlanan teslim</td>

              <td>{delivery.plannedDate || '—'}</td>

            </tr>

            <tr>

              <td>Teslim / servis notu</td>

              <td>{delivery.deliveryNote || '—'}</td>

            </tr>

          </tbody>

        </table>

      </section>



      <section className="scp-section">

        <h2 className="scp-section-title">Şartlar ve koşullar</h2>

        <ol className="scp-terms">

          {terms.map((t) => (

            <li key={t}>{t}</li>

          ))}

        </ol>

      </section>



      <footer className="scp-signatures">

        <div className="scp-sig-box">

          <p className="scp-sig-label">Müşteri imzası</p>

        </div>

        <div className="scp-sig-box">

          <p className="scp-sig-label">Satış yetkilisi imzası</p>

          <p className="scp-muted" style={{ margin: '0.5rem 0 0', fontSize: '0.82rem' }}>

            {order.salesPerson || store.name}

          </p>

        </div>

      </footer>



      <p className="scp-muted" style={{ marginTop: '1rem', fontSize: '0.72rem' }}>

        Bu belge mağaza içi satış kaydıdır; e-imza ve e-fatura kapsamı dışındadır.

      </p>

    </article>

  )

})

