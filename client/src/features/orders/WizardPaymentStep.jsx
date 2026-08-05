import { useEffect, useId, useMemo, useState } from 'react'
import { formatTry } from '../../data/index.js'
import { SALES_TEAM } from '../../constants/operations.js'
import { listSuppliers } from '../../services/suppliersClient.js'
import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'
import MobileDateField from '../../components/mobile/MobileDateField.jsx'
import {
  PAYMENT_LABELS,
  applyPaymentMethodChange,
  buildMailOrderCustomerOptions,
  isMailOrderPayment,
} from './newOrderWizardModel.js'

/** @typedef {import('./newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */

/**
 * @param {Record<string, string>} fieldErrors
 * @param {string} name
 */
function FieldError({ fieldErrors, name }) {
  const msg = fieldErrors[name]
  if (!msg) return null
  return (
    <span className="now-field-error" role="alert">
      {msg}
    </span>
  )
}

/**
 * @param {{
 *   mode?: 'full' | 'pricing' | 'payment' | 'schedule'
 *   form: NewOrderWizardForm
 *   locked: boolean
 *   totals: ReturnType<import('./newOrderWizardModel.js').computeOrderTotals>
 *   recentCustomers: string[]
 *   setField: (name: keyof NewOrderWizardForm, value: unknown) => void
 *   setForm: import('react').Dispatch<import('react').SetStateAction<NewOrderWizardForm>>
 *   fieldErrors?: Record<string, string>
 * }} props
 */
export default function WizardPaymentStep({
  mode = 'full',
  form,
  locked,
  totals,
  recentCustomers,
  setField,
  setForm,
  fieldErrors = {},
}) {
  const mailOrderPanelId = useId()
  const isMailOrder = isMailOrderPayment(form.paymentMethod)
  const hasDiscount = totals.totalDiscount > 0
  const showDiscountSection = mode === 'full' || mode === 'pricing'
  const showPaymentFields = mode === 'full' || mode === 'payment'
  const showScheduleFields = mode === 'full' || mode === 'schedule'

  const [suppliers, setSuppliers] = useState(/** @type {{ id: string, companyName: string }[]} */ ([]))
  const [suppliersLoading, setSuppliersLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSuppliersLoading(true)
    listSuppliers({ activeOnly: true })
      .then((rows) => {
        if (cancelled) return
        setSuppliers(
          rows.map((s) => ({
            id: s.id,
            companyName: s.companyName ?? s.id,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setSuppliers([])
      })
      .finally(() => {
        if (!cancelled) setSuppliersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const mailOrderCustomers = useMemo(
    () => buildMailOrderCustomerOptions(recentCustomers, form.customer),
    [recentCustomers, form.customer],
  )

  /** @param {import('../../contracts/v1/enums.js').PaymentMethod} method */
  function onPaymentMethodChange(method) {
    setForm((f) => applyPaymentMethodChange(f, method))
  }

  return (
    <div className="now-payment-step">
      <div className="now-payment-layout">
        <div className="now-payment-main">
          {showDiscountSection ? (
          <section className="now-discount-section" aria-labelledby="now-discount-heading">
            <h3 id="now-discount-heading" className="now-payment-section-title">
              İskonto
            </h3>
            <div className="now-discount-row">
              <label className="now-discount-card">
                <span className="now-discount-card__label">İskonto (%)</span>
                <input
                  className="now-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  inputMode="decimal"
                  value={form.discountPercent}
                  onChange={(e) => setField('discountPercent', e.target.value)}
                  disabled={locked}
                  placeholder="0"
                />
              </label>
              <label className="now-discount-card">
                <span className="now-discount-card__label">İskonto (TL)</span>
                <MosCurrencyInput
                  className="now-input"
                  value={form.discountFixed}
                  onChange={(v) => setField('discountFixed', v)}
                  disabled={locked}
                  integerOnly
                />
              </label>
            </div>
            <p className="now-discount-hint">Yüzde ve TL iskonto birlikte kullanılabilir.</p>
          </section>
          ) : null}

          <div className="now-grid now-payment-fields">
            {showPaymentFields && !isMailOrder ? (
              <label className={`now-field${fieldErrors.kapora ? ' now-field--invalid' : ''}`}>
                <span className="now-label">Kapora / tahsil edilen (₺) - opsiyonel</span>
                <MosCurrencyInput
                  className="now-input"
                  value={form.kapora}
                  onChange={(v) => setField('kapora', v)}
                  disabled={locked}
                  integerOnly
                  aria-invalid={Boolean(fieldErrors.kapora)}
                />
                <FieldError fieldErrors={fieldErrors} name="kapora" />
                <span className="now-hint">Kalan bakiye otomatik hesaplanır</span>
              </label>
            ) : null}
            {showPaymentFields ? (
            <label className={`now-field${fieldErrors.paymentMethod ? ' now-field--invalid' : ''}`}>
              <span className="now-label">Ödeme yöntemi</span>
              <select
                className="now-select"
                value={form.paymentMethod}
                onChange={(e) =>
                  onPaymentMethodChange(
                    /** @type {import('../../contracts/v1/enums.js').PaymentMethod} */ (e.target.value),
                  )
                }
                disabled={locked}
                aria-invalid={Boolean(fieldErrors.paymentMethod)}
              >
                {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldError fieldErrors={fieldErrors} name="paymentMethod" />
            </label>
            ) : null}

            {showScheduleFields ? (
            <label className="now-field now-field--full">
              <span className="now-label">Açıklama / Not</span>
              <textarea
                className="now-textarea now-textarea--compact"
                rows={2}
                value={form.paymentNote}
                onChange={(e) => setField('paymentNote', e.target.value)}
                disabled={locked}
                placeholder={
                  'Örn:\n3 taksit mail order\nMüşteri kartı ile tedarikçi tahsilatı\nKapora açıklaması\nTeslim öncesi ödeme'
                }
              />
            </label>
            ) : null}

            {showScheduleFields ? (
            <MobileDateField
              label="Tahmini teslim tarihi"
              className={fieldErrors.dueDate ? ' now-field--invalid' : ''}
              value={form.dueDate}
              onChange={(value) => setField('dueDate', value)}
              disabled={locked}
              required
            />
            ) : null}
            <FieldError fieldErrors={fieldErrors} name="dueDate" />
            {showPaymentFields ? (
            <label className="now-field">
              <span className="now-label now-label-req">Satış danışmanı</span>
              <select
                className="now-select"
                value={form.salesPerson}
                onChange={(e) => setField('salesPerson', e.target.value)}
                disabled={locked}
              >
                {SALES_TEAM.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            ) : null}
          </div>

          {showPaymentFields ? (
          <div
            id={mailOrderPanelId}
            className={`now-mail-order-panel${isMailOrder ? ' now-mail-order-panel--open' : ''}`}
            aria-hidden={!isMailOrder}
          >
            <div className="now-mail-order-panel__inner">
              <h3 className="now-payment-section-title">Mail order detayları</h3>
              <div className="now-grid now-mail-order-fields">
                <label className={`now-field now-field--full${fieldErrors.mailOrderAmount ? ' now-field--invalid' : ''}`}>
                  <span className="now-label">Mail order tahsilat (₺)</span>
                  <MosCurrencyInput
                    className="now-input"
                    value={form.mailOrderAmount}
                    onChange={(v) => setField('mailOrderAmount', v)}
                    disabled={locked}
                    integerOnly
                    placeholder="Tutar giriniz (isteğe bağlı)"
                    aria-invalid={Boolean(fieldErrors.mailOrderAmount)}
                  />
                  <FieldError fieldErrors={fieldErrors} name="mailOrderAmount" />
                  <span className="now-hint">
                    Bu alan isteğe bağlıdır. Kısmi tahsilat yapılacaksa tutar girilebilir.
                  </span>
                </label>
                <label className={`now-field${fieldErrors.mailOrderCustomerId ? ' now-field--invalid' : ''}`}>
                  <span className="now-label now-label-req">Kart Sahibi / Kart Çekilen Müşteri</span>
                  <input
                    className="now-input"
                    type="text"
                    list="now-mail-order-customers"
                    value={form.mailOrderCustomerId}
                    onChange={(e) => setField('mailOrderCustomerId', e.target.value)}
                    disabled={locked}
                    placeholder="Ahmet Yılmaz"
                    autoComplete="off"
                    aria-invalid={Boolean(fieldErrors.mailOrderCustomerId)}
                  />
                  <FieldError fieldErrors={fieldErrors} name="mailOrderCustomerId" />
                  <datalist id="now-mail-order-customers">
                    {mailOrderCustomers.map((c) => (
                      <option key={c.id} value={c.label} />
                    ))}
                  </datalist>
                </label>
                <label className={`now-field${fieldErrors.mailOrderSupplierId ? ' now-field--invalid' : ''}`}>
                  <span className="now-label now-label-req">Mail Order Tedarikçisi</span>
                  <select
                    className="now-select"
                    value={form.mailOrderSupplierId}
                    onChange={(e) => setField('mailOrderSupplierId', e.target.value)}
                    disabled={locked || suppliersLoading}
                    aria-invalid={Boolean(fieldErrors.mailOrderSupplierId)}
                  >
                    <option value="">
                      {suppliersLoading ? 'Tedarikçiler yükleniyor…' : 'Tedarikçi seçin'}
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.companyName}
                      </option>
                    ))}
                  </select>
                  <FieldError fieldErrors={fieldErrors} name="mailOrderSupplierId" />
                </label>
                <label className={`now-field${fieldErrors.mailOrderCommissionRate ? ' now-field--invalid' : ''}`}>
                  <span className="now-label">Mail Order Komisyonu (%)</span>
                  <input
                    className="now-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    inputMode="decimal"
                    value={form.mailOrderCommissionRate}
                    onChange={(e) => setField('mailOrderCommissionRate', e.target.value)}
                    disabled={locked}
                    placeholder="Opsiyonel"
                    aria-invalid={Boolean(fieldErrors.mailOrderCommissionRate)}
                  />
                  <FieldError fieldErrors={fieldErrors} name="mailOrderCommissionRate" />
                </label>
              </div>
            </div>
          </div>
          ) : null}
        </div>

        {(showDiscountSection || showPaymentFields) ? (
        <aside className="now-payment-finance" aria-label="Finansal özet">
          <div className="now-finance-card">
            <div className="now-finance-row">
              <span className="now-finance-row__label">Ara Toplam</span>
              <span className="now-finance-row__value">{formatTry(totals.subtotal)}</span>
            </div>
            {hasDiscount ? (
              <div className="now-finance-row now-finance-row--discount">
                <span className="now-finance-row__label">Toplam İskonto</span>
                <span className="now-finance-row__value">−{formatTry(totals.totalDiscount)}</span>
              </div>
            ) : null}
            <div className="now-finance-row now-finance-row--grand">
              <span className="now-finance-row__label">Genel Toplam</span>
              <strong className="now-finance-row__grand">{formatTry(totals.grandTotal)}</strong>
            </div>
            <div className="now-finance-divider" />
            <div className="now-finance-row">
              <span className="now-finance-row__label">Tahsil edilen</span>
              <span className="now-finance-row__value">{formatTry(totals.kapora)}</span>
            </div>
            <div className="now-finance-row">
              <span className="now-finance-row__label">Kalan bakiye</span>
              <span className="now-finance-row__value now-finance-row__value--due">
                {formatTry(totals.remaining)}
              </span>
            </div>
          </div>
        </aside>
        ) : null}
      </div>
    </div>
  )
}
