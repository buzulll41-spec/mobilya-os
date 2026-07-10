import { useMemo, useState, useEffect } from 'react'

import SectionErrorBoundary from '../../../components/SectionErrorBoundary.jsx'
import { erpTableOpClass } from '../../../lib/actionButtonVariants.js'
import ErpOpsSummaryStrip from '../../../components/erp-ops/ErpOpsSummaryStrip.jsx'
import { formatTry } from '../../../data/dashboardHelpers.js'
import * as ordersClient from '../../../services/ordersClient.js'
import { useAuth } from '../../../state/AuthProvider.jsx'
import { canApprovePayments } from '../../../lib/paymentApprovalPolicy.js'
import { formatApiErrorMessage } from '../../../utils/apiErrorMessage.js'
import {
  buildOrderPanelPaymentRows,
  buildOrderPanelPaymentsFooter,
  buildOrderPanelPaymentsSummary,
  resolveLastPaymentDate,
  resolveOrderPaymentStatus,
} from '../../../mappers/order/orderPanelPaymentsModel.js'
import CollectionCenterPanel from '../../collection/CollectionCenterPanel.jsx'

import '../../../styles/mos-erp-ops.css'
import '../../../styles/order-panel-payments.css'

/** @typedef {import('../../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @param {{
 *   order: Order
 *   rem: number
 *   paidPct: number
 *   mutating: boolean
 *   readOnly?: boolean
 *   showSaveAndNext?: boolean
 *   refreshKey?: number
 *   domainEvents?: DomainEventDto[]
 *   onPostPayment: (body: { amount: number, method: string, note?: string }) => Promise<void>
 *   onSaveAndNext?: (body: { amount: number, method: string, note?: string }) => Promise<void>
 *   onPaymentsChanged?: () => void
 * }} props
 */
export default function OrderPanelPaymentsTable({
  order,
  rem,
  paidPct,
  mutating,
  readOnly = false,
  showSaveAndNext = false,
  refreshKey = 0,
  domainEvents = [],
  onPostPayment,
  onSaveAndNext,
  onPaymentsChanged,
}) {
  const { user } = useAuth()
  const canApprove = canApprovePayments(user?.role)
  const [modalOpen, setModalOpen] = useState(false)
  const [transactions, setTransactions] = useState(/** @type {import('../../../contracts/v1/payment.js').PaymentTransactionDto[]} */ ([]))
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [payActionError, setPayActionError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    setPaymentsLoading(true)
    ordersClient
      .getOrderPayments(order.id)
      .then((rows) => {
        if (!cancelled) setTransactions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setTransactions([])
      })
      .finally(() => {
        if (!cancelled) setPaymentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [order.id, refreshKey, order.paidAmount, order.paid])

  const orderEvents = useMemo(
    () => domainEvents.filter((e) => e.aggregateId === order.id),
    [domainEvents, order.id],
  )

  const paymentStatus = useMemo(
    () => resolveOrderPaymentStatus(order, rem, transactions),
    [order, rem, transactions],
  )

  const lastPaymentDate = useMemo(() => resolveLastPaymentDate(transactions), [transactions])

  const summaryMetrics = useMemo(
    () => buildOrderPanelPaymentsSummary(order, rem, paidPct, lastPaymentDate, paymentStatus),
    [order, rem, paidPct, lastPaymentDate, paymentStatus],
  )

  const rows = useMemo(
    () => buildOrderPanelPaymentRows(transactions, orderEvents),
    [transactions, orderEvents],
  )

  const footer = useMemo(() => buildOrderPanelPaymentsFooter(rows), [rows])

  async function handleApprovePayment(paymentId) {
    setPayActionError(null)
    try {
      await ordersClient.approveOrderPayment(order.id, paymentId, { approvalNote: 'Tahsilat onaylandı' })
      onPaymentsChanged?.()
    } catch (err) {
      setPayActionError(formatApiErrorMessage(err))
    }
  }

  async function handleRejectPayment(paymentId) {
    const note = window.prompt('Red sebebini yazın (zorunlu):')
    if (!note?.trim()) {
      setPayActionError('Red sebebi zorunludur.')
      return
    }
    setPayActionError(null)
    try {
      await ordersClient.rejectOrderPayment(order.id, paymentId, { rejectionNote: note.trim() })
      onPaymentsChanged?.()
    } catch (err) {
      setPayActionError(formatApiErrorMessage(err))
    }
  }

  function handlePrintReceipt(row) {
    const w = window.open('', '_blank', 'width=420,height=640')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>Tahsilat Makbuzu</title>
      <style>body{font-family:system-ui,sans-serif;padding:1.5rem;color:#1a1a1a}
      h1{font-size:1.1rem;margin:0 0 1rem}dl{display:grid;grid-template-columns:8rem 1fr;gap:.35rem .75rem;font-size:.9rem}
      dt{color:#64748b;font-weight:600}dd{margin:0;font-weight:700}</style></head><body>
      <h1>Tahsilat Makbuzu</h1>
      <dl>
        <dt>Sipariş</dt><dd>${order.id}</dd>
        <dt>Tarih</dt><dd>${row.dateLabel}</dd>
        <dt>Tutar</dt><dd>${row.amountLabel}</dd>
        <dt>Yöntem</dt><dd>${row.methodLabel}</dd>
        <dt>Tedarikçi</dt><dd>${row.supplierLabel}</dd>
        <dt>Açıklama</dt><dd>${row.description}</dd>
        <dt>İşleyen</dt><dd>${row.actorLabel}</dd>
      </dl>
      </body></html>`)
    w.document.close()
    w.focus()
    w.print()
  }

  return (
    <div className="oop-payments" aria-label="Sipariş ödemeleri">
      <div className="oop-payments__head">
        <SectionErrorBoundary label="Ödeme özeti">
        <ErpOpsSummaryStrip
          metrics={summaryMetrics}
          ariaLabel="Ödeme özet göstergeleri"
          summaryClassName={`mos-erp-summary--cols-6 oop-payments__summary oop-payments__summary--${paymentStatus.tone}`}
        />
        </SectionErrorBoundary>
        <div className="oop-payments__actions">
          {!readOnly ? (
            <button
              type="button"
              className="oop-payments__btn oop-payments__btn--primary"
              disabled={mutating}
              onClick={() => setModalOpen(true)}
            >
              Ödeme Al
            </button>
          ) : null}
        </div>
      </div>

      {rem > 0.009 ? (
        <p className="oop-payments__alert" role="status">
          Bu siparişte kalan bakiye var.
        </p>
      ) : null}

      {readOnly ? (
        <p className="oop-payments__readonly" role="status">
          Tahsilat durumunu görüntüleyebilirsiniz. Tahsilat girişi yetkili satış, operasyon veya finans
          kullanıcıları tarafından yapılır.
        </p>
      ) : null}

      {payActionError ? (
        <p className="oop-payments__alert oop-payments__alert--error" role="alert">
          {payActionError}
        </p>
      ) : null}

      <section className="oop-payments__table-panel" aria-label="Ödeme geçmişi">
        <div className="mos-erp-tbl-wrap">
          <table className="mos-erp-tbl oop-payments__table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="is-num">Tutar</th>
                <th>Ödeme yöntemi</th>
                <th>Tedarikçi</th>
                <th>Açıklama</th>
                <th>İşleyen kullanıcı</th>
                <th>Onaylayan</th>
                <th>Durum</th>
                <th className="is-ops">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {paymentsLoading ? (
                <tr className="mos-erp-tbl-empty">
                  <td colSpan={9}>Ödeme geçmişi yükleniyor…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr className="mos-erp-tbl-empty">
                  <td colSpan={9}>Henüz kayıtlı tahsilat yok.</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`mos-erp-tbl-row oop-payments-row${idx % 2 === 1 ? ' oop-payments-row--alt' : ''}${row.isPendingApproval ? ` oop-payments-row--age-${row.ageTier}` : ''}`}
                    title={row.ageHint ?? undefined}
                  >
                    <td>{row.dateLabel}</td>
                    <td
                      className={`is-num oop-payments__amount${row.isCredit ? ' oop-payments__amount--credit' : ' oop-payments__amount--debit'}`}
                    >
                      {row.amountLabel}
                    </td>
                    <td>{row.methodLabel}</td>
                    <td className="oop-payments__supplier">{row.supplierLabel}</td>
                    <td className="oop-payments__desc">{row.description}</td>
                    <td className="oop-payments__actor">{row.actorLabel}</td>
                    <td className="oop-payments__actor">{row.approverLabel}</td>
                    <td>
                      <span className={`oop-payments__status oop-payments__status--${row.statusTone}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="is-ops">
                      <div className="oop-payments__row-ops">
                        {row.isPendingApproval && canApprove ? (
                          <>
                            <button
                              type="button"
                              className={erpTableOpClass('Onayla', 'oop-payments__approve')}
                              disabled={mutating}
                              onClick={() => void handleApprovePayment(row.id)}
                            >
                              Onayla
                            </button>
                            <button
                              type="button"
                              className={erpTableOpClass('Reddet', 'oop-payments__reject')}
                              disabled={mutating}
                              onClick={() => void handleRejectPayment(row.id)}
                            >
                              Reddet
                            </button>
                          </>
                        ) : null}
                        {row.canPrint ? (
                          <button
                            type="button"
                            className={erpTableOpClass('Makbuz')}
                            onClick={() => handlePrintReceipt(row)}
                          >
                            Makbuz
                          </button>
                        ) : !row.isPendingApproval || !canApprove ? (
                          <span className="oop-payments__no-op">—</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot>
                <tr className="oop-payments__footer">
                  <td>Toplam ({footer.count} hareket)</td>
                  <td className="is-num">
                    {footer.postedTotal >= 0 ? '+' : ''}
                    {formatTry(footer.postedTotal)}
                  </td>
                  <td colSpan={6} />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>

      <CollectionCenterPanel
        open={modalOpen}
        order={order}
        remaining={rem}
        paidPct={paidPct}
        mutating={mutating}
        readOnly={readOnly}
        refreshKey={refreshKey}
        domainEvents={domainEvents}
        showSaveAndNext={showSaveAndNext}
        onClose={() => setModalOpen(false)}
        onPostPayment={onPostPayment}
        onSaveAndNext={onSaveAndNext}
        onPaymentsChanged={onPaymentsChanged}
      />
    </div>
  )
}
