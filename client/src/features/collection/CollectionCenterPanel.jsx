import { createPortal } from 'react-dom'
import { useEffect, useMemo, useState } from 'react'

import { PAYMENT_METHOD } from '../../contracts/v1/enums.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import * as ordersClient from '../../services/ordersClient.js'
import { listSuppliers } from '../../services/suppliersClient.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { canApprovePayments, paymentAutoApprovesForRole } from '../../lib/paymentApprovalPolicy.js'
import { parseCurrencyInput } from '../../lib/formatCurrencyInput.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'
import {
  buildCollectionCenterHeaderMeta,
  buildCollectionFinanceCards,
  buildCollectionPaymentHistory,
  buildCollectionRiskBanner,
  COLLECTION_PAYMENT_METHOD_OPTIONS,
} from '../../mappers/collection/collectionCenterPanelModel.js'
import { IconClose } from '../../components/Icons.jsx'

import '../../styles/collection-center-v2.css'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @param {{
 *   open: boolean
 *   order: Order | null
 *   remaining: number
 *   paidPct: number
 *   mutating?: boolean
 *   readOnly?: boolean
 *   refreshKey?: number
 *   domainEvents?: DomainEventDto[]
 *   queuePositionLabel?: string | null
 *   showSaveAndNext?: boolean
 *   onClose: () => void
 *   onPostPayment: (body: {
 *     amount: number
 *     method: string
 *     note?: string
 *     mailOrderSupplierId?: string
 *     mailOrderCustomerId?: string
 *   }) => Promise<void>
 *   onPaymentsChanged?: () => void
 *   onSaveAndNext?: (body: {
 *     amount: number
 *     method: string
 *     note?: string
 *     mailOrderSupplierId?: string
 *     mailOrderCustomerId?: string
 *   }) => Promise<void>
 * }} props
 */
export default function CollectionCenterPanel({
  open,
  order,
  remaining,
  paidPct,
  mutating = false,
  readOnly = false,
  refreshKey = 0,
  domainEvents = [],
  queuePositionLabel = null,
  showSaveAndNext = false,
  onClose,
  onPostPayment,
  onPaymentsChanged,
  onSaveAndNext,
}) {
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState(PAYMENT_METHOD.CASH)
  const [payNote, setPayNote] = useState('')
  const [mailOrderSupplierId, setMailOrderSupplierId] = useState('')
  const [suppliers, setSuppliers] = useState(/** @type {{ id: string, companyName: string }[]} */ ([]))
  const [payError, setPayError] = useState(/** @type {string | null} */ (null))
  const apiMode = Boolean(getApiBaseUrl())
  const isMailOrder = payMethod === PAYMENT_METHOD.MAIL_ORDER
  const { user } = useAuth()
  const canApprove = canApprovePayments(user?.role)
  const autoApprovePayments = paymentAutoApprovesForRole(user?.role)

  useEffect(() => {
    if (!open || !isMailOrder) return
    let cancelled = false
    listSuppliers({ activeOnly: true })
      .then((rows) => {
        if (!cancelled) {
          setSuppliers(
            rows.map((s) => ({ id: s.id, companyName: s.companyName ?? s.id })),
          )
        }
      })
      .catch(() => {
        if (!cancelled) setSuppliers([])
      })
    return () => {
      cancelled = true
    }
  }, [open, isMailOrder])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setPayAmount('')
    setPayNote('')
    setPayError(null)
    setPayMethod(PAYMENT_METHOD.CASH)
    setMailOrderSupplierId('')
  }, [open, order?.id])

  const [transactions, setTransactions] = useState(/** @type {import('../../contracts/v1/payment.js').PaymentTransactionDto[]} */ ([]))

  useEffect(() => {
    if (!open || !order) {
      setTransactions([])
      return
    }
    let cancelled = false
    ordersClient
      .getOrderPayments(order.id)
      .then((rows) => {
        if (!cancelled) setTransactions(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {
        if (!cancelled) setTransactions([])
      })
    return () => {
      cancelled = true
    }
  }, [open, order, refreshKey, order?.paidAmount, order?.paid])

  const orderEvents = useMemo(
    () => (order ? domainEvents.filter((e) => e.aggregateId === order.id) : []),
    [domainEvents, order],
  )

  const financeCards = useMemo(
    () => (order ? buildCollectionFinanceCards(order, remaining, paidPct) : []),
    [order, remaining, paidPct],
  )

  const risk = useMemo(
    () => (order ? buildCollectionRiskBanner(order, remaining, paidPct) : null),
    [order, remaining, paidPct],
  )

  const history = useMemo(
    () => buildCollectionPaymentHistory(transactions, orderEvents),
    [transactions, orderEvents],
  )

  const headerMeta = useMemo(
    () => (order ? buildCollectionCenterHeaderMeta(order, remaining, transactions) : null),
    [order, remaining, transactions],
  )

  if (!open || !order || !headerMeta || !risk) return null

  async function submit(andNext = false) {
    setPayError(null)
    const amount = parseCurrencyInput(payAmount)
    if (!payAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      setPayError('Geçerli bir tutar girin.')
      return
    }
    if (!payMethod) {
      setPayError('Ödeme türü seçin.')
      return
    }
    if (isMailOrder && !mailOrderSupplierId.trim()) {
      setPayError('Mail order için tedarikçi seçin.')
      return
    }
    const body = {
      amount,
      method: payMethod,
      ...(payNote.trim() ? { note: payNote.trim() } : {}),
      ...(isMailOrder
        ? {
            mailOrderSupplierId: mailOrderSupplierId.trim(),
            mailOrderCustomerId: order.customer?.trim() || undefined,
          }
        : {}),
    }
    try {
      if (andNext && onSaveAndNext) await onSaveAndNext(body)
      else await onPostPayment(body)
      setPayAmount('')
      setPayNote('')
      if (!andNext) onClose()
    } catch (err) {
      setPayError(formatApiErrorMessage(err))
    }
  }

  return createPortal(
    <div className="cc-v2-root" role="presentation">
      <button type="button" className="cc-v2-backdrop" aria-label="Kapat" onClick={onClose} />
      <aside
        className="cc-v2-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-v2-title"
      >
        <header className="cc-v2-head">
          <div className="cc-v2-head__main">
            <p className="cc-v2-kicker">Tahsilat Merkezi</p>
            <h2 id="cc-v2-title" className="cc-v2-title">
              {headerMeta.customerName}
            </h2>
            <p className="cc-v2-sub">{headerMeta.orderNumber}</p>
            {queuePositionLabel ? (
              <span className="cc-v2-queue">{queuePositionLabel}</span>
            ) : null}
          </div>
          <button type="button" className="cc-v2-close" onClick={onClose} aria-label="Kapat">
            <IconClose />
          </button>
        </header>

        <div className="cc-v2-body">
          <section className="cc-v2-finance" aria-label="Finans özeti">
            <h3 className="cc-v2-section-title">Finans Özeti</h3>
            <div className="cc-v2-finance-grid">
              {financeCards.map((card) => (
                <article
                  key={card.id}
                  className={`cc-v2-finance-card cc-v2-finance-card--${card.tone}`}
                >
                  <span className="cc-v2-finance-card__label">{card.label}</span>
                  <strong className="cc-v2-finance-card__value">{card.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section
            className={`cc-v2-risk cc-v2-risk--${risk.tone}`}
            aria-label="Risk motoru"
            role="status"
          >
            <h3 className="cc-v2-risk__title">
              {risk.tone === 'critical' ? '🔴' : risk.tone === 'warning' ? '🟠' : '🟢'}{' '}
              {risk.title}
            </h3>
            <p className="cc-v2-risk__msg">{risk.message}</p>
            {risk.showPreShipmentWarning ? (
              <p className="cc-v2-risk__hint">Sevk öncesi kontrol gerekli.</p>
            ) : null}
          </section>

          <div className="cc-v2-split">
            <section className="cc-v2-form-section" aria-label="Yeni tahsilat">
              <h3 className="cc-v2-section-title">Yeni Tahsilat</h3>
              {readOnly ? (
                <p className="cc-v2-readonly">Tahsilat kaydı bu rol için salt okunur.</p>
              ) : (
                <>
                  {!apiMode ? (
                    <p className="cc-v2-meta">Mock mod: ödemeler oturumda saklanır.</p>
                  ) : null}
                  <fieldset className="cc-v2-methods cc-v2-field-block cc-v2-field-block--method">
                    <legend>Ödeme Türü</legend>
                    <div className="cc-v2-methods__grid">
                      {COLLECTION_PAYMENT_METHOD_OPTIONS.map((opt) => (
                        <label key={opt.id} className="cc-v2-method">
                          <input
                            type="radio"
                            name="cc-pay-method"
                            value={opt.id}
                            checked={payMethod === opt.id}
                            onChange={() => {
                              setPayMethod(opt.id)
                              if (opt.id !== PAYMENT_METHOD.MAIL_ORDER) setMailOrderSupplierId('')
                            }}
                            disabled={mutating}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="cc-v2-field cc-v2-field-block cc-v2-field-block--amount">
                    <span>Tutar</span>
                    <MosCurrencyInput
                      className="cc-v2-input"
                      value={payAmount}
                      onChange={(v) => {
                        setPayAmount(v)
                        setPayError(null)
                      }}
                      disabled={mutating}
                      integerOnly
                    />
                  </label>

                  {isMailOrder ? (
                    <label className="cc-v2-field">
                      <span>Mail Order Tedarikçisi</span>
                      <select
                        className="cc-v2-input"
                        value={mailOrderSupplierId}
                        onChange={(e) => {
                          setMailOrderSupplierId(e.target.value)
                          setPayError(null)
                        }}
                        disabled={mutating}
                        aria-required="true"
                      >
                        <option value="">Tedarikçi seçin</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.companyName}
                          </option>
                        ))}
                      </select>
                      <p className="cc-v2-meta">
                        Kart POS&apos;tan tedarikçi adına çekilir; müşteri tahsilatı ve tedarikçi cari
                        kaydı birlikte oluşur.
                      </p>
                    </label>
                  ) : null}

                  <label className="cc-v2-field cc-v2-field-block cc-v2-field-block--note">
                    <span>Açıklama</span>
                    <input
                      type="text"
                      className="cc-v2-input"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                      disabled={mutating}
                      maxLength={200}
                      autoComplete="off"
                      enterKeyHint="done"
                      placeholder="Kapora, taksit, havale referansı…"
                    />
                  </label>

                  <div className="cc-v2-approval-status cc-v2-field-block cc-v2-field-block--approval" role="status">
                    <span className="cc-v2-approval-status__label">Onay durumu</span>
                    <p className="cc-v2-meta">
                      {autoApprovePayments
                        ? 'Bu rolde ödeme otomatik onaylanır ve bakiyeye anında yansır.'
                        : 'Tahsilat kaydı yönetici onayına gider; onaylanana kadar bakiyeye yansımaz.'}
                    </p>
                  </div>

                  {payError ? (
                    <p className="cc-v2-error" role="alert">
                      {payError}
                    </p>
                  ) : null}
                </>
              )}
            </section>

            <footer className="cc-v2-foot mos-mobile-save-bar">
              {!readOnly ? (
                <>
                  <button
                    type="button"
                    className="cc-v2-submit mos-mobile-save-bar__btn mos-mobile-save-bar__btn--primary"
                    disabled={mutating}
                    onClick={() => void submit(false)}
                  >
                    {mutating ? 'Kaydediliyor…' : 'TAHSİLATI KAYDET'}
                  </button>

                  {showSaveAndNext && onSaveAndNext ? (
                    <button
                      type="button"
                      className="cc-v2-submit cc-v2-submit--secondary mos-mobile-save-bar__btn mos-mobile-save-bar__btn--ghost"
                      disabled={mutating}
                      onClick={() => void submit(true)}
                    >
                      Kaydet ve sonraki
                    </button>
                  ) : null}
                </>
              ) : null}
            </footer>

            <section className="cc-v2-history" aria-label="Ödeme geçmişi">
              <h3 className="cc-v2-section-title">Ödeme Geçmişi</h3>
              {history.length === 0 ? (
                <p className="cc-v2-history-empty">Henüz ödeme kaydı yok.</p>
              ) : (
                <ul className="cc-v2-history-list">
                  {history.map((row) => (
                    <li key={row.id} className="cc-v2-history-item">
                      <div className="cc-v2-history-item__date">{row.dateLabel}</div>
                      <div className="cc-v2-history-item__method">
                        {row.methodLabel}
                        {row.supplierLabel && row.supplierLabel !== '—'
                          ? ` · ${row.supplierLabel}`
                          : ''}
                        {row.statusLabel ? ` · ${row.statusLabel}` : ''}
                      </div>
                      <strong className="cc-v2-history-item__amount">{row.amountLabel}</strong>
                      {row.description && row.description !== '—' ? (
                        <p className="cc-v2-history-item__note">{row.description}</p>
                      ) : null}
                      {row.isPendingApproval && canApprove && order ? (
                        <div className="cc-v2-history-item__actions">
                          <button
                            type="button"
                            className="cc-v2-submit cc-v2-submit--inline"
                            disabled={mutating}
                            onClick={() =>
                              void ordersClient
                                .approveOrderPayment(order.id, row.id, { approvalNote: 'Tahsilat onaylandı' })
                                .then(() => onPaymentsChanged?.())
                                .catch((err) => setPayError(formatApiErrorMessage(err)))
                            }
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            className="cc-v2-submit cc-v2-submit--secondary cc-v2-submit--inline"
                            disabled={mutating}
                            onClick={() => {
                              const note = window.prompt('Red sebebini yazın (zorunlu):')
                              if (!note?.trim()) {
                                setPayError('Red sebebi zorunludur.')
                                return
                              }
                              void ordersClient
                                .rejectOrderPayment(order.id, row.id, { rejectionNote: note.trim() })
                                .then(() => onPaymentsChanged?.())
                                .catch((err) => setPayError(formatApiErrorMessage(err)))
                            }}
                          >
                            Reddet
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
