import { useMemo, useState } from 'react'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_STATUS } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/index.js'
import { getPaymentTransactionsForSalesOrder } from '../../services/mockPaymentStore.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import { formatShortDate } from '../../utils/dates.js'
import OrderDrawerOperations from './OrderDrawerOperations.jsx'

const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHOD.CASH]: 'Nakit',
  [PAYMENT_METHOD.CARD]: 'Kart',
  [PAYMENT_METHOD.TRANSFER]: 'Havale',
  [PAYMENT_METHOD.CHECK]: 'Çek',
  [PAYMENT_METHOD.OTHER]: 'Diğer',
}

/** @param {import('../../contracts/v1/payment.js').PaymentTransactionDto} tx */
function paymentMovementDescription(tx) {
  const ref = tx.externalRef?.trim()
  return ref || '—'
}

/**
 * @param {{
 *   order: import('../../data/seedOrders.js').Order
 *   listItemDto?: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto
 *   rem: number
 *   paidPct: number
 *   dueDate?: string
 *   mutating: boolean
 *   readOnly?: boolean
 *   showSaveAndNext?: boolean
 *   onPostPayment: (body: { amount: number, method: string, note?: string }) => Promise<void>
 *   onSaveAndNext?: (body: { amount: number, method: string, note?: string }) => Promise<void>
 *   onPatchTermin: (body: { committedShipBy: string, reason: string }) => Promise<void>
 * }} props
 */
export default function OrderFinanceSection({
  order,
  listItemDto,
  rem,
  paidPct,
  dueDate,
  mutating,
  readOnly = false,
  showSaveAndNext = false,
  onPostPayment,
  onSaveAndNext,
  onPatchTermin,
}) {
  const [quickAmount, setQuickAmount] = useState(/** @type {number | null} */ (null))
  const [quickError, setQuickError] = useState(/** @type {string | null} */ (null))
  const [showActions, setShowActions] = useState(false)

  const collected = order.paid ? order.amount : order.paidAmount ?? 0
  const total = order.amount
  const financeRisk =
    rem > 0 && (paidPct < 40 || listItemDto?.hasOverdueBalance || rem >= 80_000)
  const isClosed = paidPct >= 100 || rem <= 0.009

  const movements = useMemo(() => {
    return getPaymentTransactionsForSalesOrder(order.id)
      .filter((t) => t.status === PAYMENT_TRANSACTION_STATUS.POSTED)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
  }, [order.id])

  const presets = useMemo(() => {
    const q = Math.round(total * 0.25)
    const h = Math.round(total * 0.5)
    return [
      { label: '%25', amount: q },
      { label: '%50', amount: h },
      { label: 'Kalanı Al', amount: rem },
    ].filter((p) => p.amount > 0)
  }, [total, rem])

  async function handleQuickPay(amount, andNext = false) {
    setQuickError(null)
    setQuickAmount(amount)
    try {
      const body = { amount, method: PAYMENT_METHOD.TRANSFER, note: 'Hızlı tahsilat' }
      if (andNext && onSaveAndNext) await onSaveAndNext(body)
      else await onPostPayment(body)
    } catch (err) {
      setQuickError(formatApiErrorMessage(err))
    } finally {
      setQuickAmount(null)
    }
  }

  return (
    <div className="oop-finance">
      <section className="oop-finance-strip" aria-label="Finans özeti">
        <div className="oop-finance-strip__item">
          <span className="oop-finance-strip__label">Satış tutarı</span>
          <strong className="oop-finance-strip__value">{formatTry(total)}</strong>
        </div>
        <div className="oop-finance-strip__item">
          <span className="oop-finance-strip__label">Tahsil edildi</span>
          <strong className="oop-finance-strip__value oop-finance-strip__value--paid">
            {formatTry(collected)}
          </strong>
        </div>
        <div className="oop-finance-strip__item oop-finance-strip__item--due">
          <span className="oop-finance-strip__label">Kalan bakiye</span>
          <strong className="oop-finance-strip__value oop-finance-strip__value--due">
            {formatTry(rem)}
          </strong>
        </div>
        <div className="oop-finance-strip__item oop-finance-strip__item--rate">
          <span className="oop-finance-strip__label">Ödeme oranı</span>
          <div className="oop-finance-strip__value-row">
            <strong className="oop-finance-strip__value">%{paidPct}</strong>
            {financeRisk ? (
              <span className="oop-finance-strip__badge oop-finance-strip__badge--risk">
                Riskli ödeme
              </span>
            ) : isClosed ? (
              <span className="oop-finance-strip__badge oop-finance-strip__badge--ok">Kapandı</span>
            ) : null}
          </div>
        </div>
      </section>

      {readOnly ? (
        <p className="oop-muted oop-finance-readonly" role="status">
          Tahsilat kaydı bu rol için salt okunur. Ödeme almak için Tahsilat masası veya yetkili kullanıcı
          gerekir.
        </p>
      ) : null}

      {rem > 0 && !readOnly ? (
        <section className="oop-finance-block oop-finance-block--quick" aria-label="Hızlı tahsilat">
          <div className="oop-finance-toolbar">
            <h3 className="oop-finance-block__title">Hızlı tahsilat</h3>
            <div className="oop-finance-quick">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className={`oop-finance-quick__btn${
                    p.label === 'Kalanı Al' ? ' oop-finance-quick__btn--collect' : ''
                  }`}
                  disabled={mutating || quickAmount === p.amount}
                  onClick={() => void handleQuickPay(p.amount)}
                >
                  {p.label}
                </button>
              ))}
              {showSaveAndNext && onSaveAndNext && presets.length > 0 ? (
                <button
                  type="button"
                  className="oop-finance-quick__btn oop-finance-quick__btn--next"
                  disabled={mutating}
                  onClick={() => void handleQuickPay(presets[presets.length - 1].amount, true)}
                >
                  Kaydet ve sonraki
                </button>
              ) : null}
            </div>
          </div>
          {quickError ? (
            <p className="oop-finance-error" role="alert">
              {quickError}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="oop-finance-block oop-finance-block--movements" aria-label="Son ödeme hareketleri">
        <h3 className="oop-finance-block__title">Son ödeme hareketleri</h3>
        <div className="oop-finance-tbl-wrap">
          <table className="oop-finance-tbl">
            <thead>
              <tr>
                <th>Tarih</th>
                <th className="is-num">Tutar</th>
                <th>Tip</th>
                <th>Açıklama</th>
                <th>Kullanıcı</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr className="oop-finance-tbl__empty">
                  <td colSpan={5}>Henüz kayıtlı tahsilat yok.</td>
                </tr>
              ) : (
                movements.map((tx) => (
                  <tr key={tx.id}>
                    <td>{formatShortDate(tx.occurredAt.slice(0, 10))}</td>
                    <td className="is-num oop-finance-tbl__amt">
                      +{formatTry(Number.parseFloat(tx.amount.amount))}
                    </td>
                    <td>{PAYMENT_METHOD_LABELS[tx.method] ?? tx.method}</td>
                    <td>{paymentMovementDescription(tx)}</td>
                    <td className="oop-finance-tbl__muted">—</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="oop-finance-accordion">
        <button
          type="button"
          className="oop-finance-accordion__trigger"
          aria-expanded={showActions}
          onClick={() => setShowActions((v) => !v)}
        >
          <span>Detaylı tahsilat & termin</span>
          <span
            className={`oop-finance-accordion__chev${showActions ? ' is-open' : ''}`}
            aria-hidden
          />
        </button>
        {showActions && !readOnly ? (
          <div className="oop-finance-accordion__body">
            <OrderDrawerOperations
              key={`${order.id}-${dueDate ?? ''}`}
              dueDate={dueDate}
              mutating={mutating}
              onPostPayment={onPostPayment}
              onPatchTermin={onPatchTermin}
            />
          </div>
        ) : null}
      </section>
    </div>
  )
}
