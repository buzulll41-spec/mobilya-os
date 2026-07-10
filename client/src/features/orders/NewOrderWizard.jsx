import { useEffect, useId, useMemo, useState } from 'react'
import { ORDER_STATUSES, formatTry } from '../../data/index.js'
import WizardProductsStep from './WizardProductsStep.jsx'
import { SALES_TEAM } from '../../constants/operations.js'
import { IconClose } from '../../components/Icons.jsx'
import {
  WIZARD_STEPS,
  emptyWizardForm,
  emptyProductLine,
  lineTotal,
  computeOrderTotals,
  validateWizardStep,
  mapWizardToCreateOrderRequest,
  sanitizeDigitsOnly,
  sanitizePhoneInput,
  formatCustomerIdentityCompact,
} from './newOrderWizardModel.js'
import {
  PHONE_COUNTRY_OPTIONS,
  formatPhoneDisplay,
  phoneCountryByDialCode,
  sanitizePhoneLocalInput,
} from '../../lib/phoneInput.js'
import WizardPaymentStep from './WizardPaymentStep.jsx'
import WizardCustomerPicker from './WizardCustomerPicker.jsx'
import {
  buildWizardCustomerRegistry,
  buildWizardFormPatchFromCustomer,
  buildWizardFormPatchFromDeliveryAddress,
  normalizeWizardCustomerKey,
} from '../../mappers/order/wizardCustomerRegistryModel.js'
import { parseE164Phone } from '../../lib/phoneInput.js'
import '../../styles/new-order-wizard.css'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('./newOrderWizardModel.js').NewOrderWizardForm} NewOrderWizardForm */
/** @typedef {import('./newOrderWizardModel.js').WizardProductLine} WizardProductLine */

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   apiMode?: boolean
 *   apiBusy?: boolean
 *   errorMessage?: string | null
 *   recentCustomers?: string[]
 *   orders?: Order[]
 *   onSave: (draft: Omit<Order, 'id' | 'orderDate'> | import('../../contracts/v1/createOrderRequest.js').CreateOrderRequest) => void | Promise<Order | void>
 *   onCreated?: (order: Order, meta?: { form: NewOrderWizardForm }) => void
 *   canCreateOrder?: boolean
 * }} props
 */
export default function NewOrderWizard({
  open,
  onClose,
  apiBusy = false,
  errorMessage = null,
  recentCustomers = [],
  orders = [],
  onSave,
  onCreated,
  canCreateOrder = true,
}) {
  const titleId = useId()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(emptyWizardForm)
  const [stepError, setStepError] = useState(/** @type {string | null} */ (null))
  const [stepFieldErrors, setStepFieldErrors] = useState(/** @type {Record<string, string>} */ ({}))
  const [submitting, setSubmitting] = useState(false)

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

  const totals = useMemo(() => computeOrderTotals(form), [form])
  const locked = submitting || apiBusy || !canCreateOrder

  if (!open) return null

  /** @param {keyof NewOrderWizardForm} name */
  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }))
    setStepError(null)
    setStepFieldErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  /** @param {string} id @param {Partial<WizardProductLine>} patch */
  function patchProduct(id, patch) {
    setForm((f) => ({
      ...f,
      products: f.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
    setStepError(null)
  }

  function addProduct() {
    setForm((f) => ({ ...f, products: [...f.products, emptyProductLine()] }))
  }

  /** @param {string} id */
  function removeProduct(id) {
    setForm((f) => ({
      ...f,
      products: f.products.filter((p) => p.id !== id),
    }))
    setStepError(null)
  }

  /** @param {import('./newOrderWizardModel.js').WizardProductLine[]} products */
  function replaceProducts(products) {
    setForm((f) => ({
      ...f,
      products,
    }))
    setStepError(null)
  }

  function tryAdvance() {
    const v = validateWizardStep(step, form)
    if (!v.ok) {
      setStepError(v.message ?? 'Eksik bilgi var.')
      setStepFieldErrors(v.fieldErrors ?? {})
      return
    }
    setStepError(null)
    setStepFieldErrors({})
    setStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))
  }

  /** @param {number} target */
  function goToStep(target) {
    if (target < step) {
      setStep(target)
      setStepError(null)
      return
    }
    for (let s = step; s < target; s++) {
      const v = validateWizardStep(s, form)
      if (!v.ok) {
        setStep(s)
        setStepError(v.message ?? 'Eksik bilgi var.')
        setStepFieldErrors(v.fieldErrors ?? {})
        return
      }
    }
    setStepError(null)
    setStepFieldErrors({})
    setStep(target)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    for (let s = 0; s < 3; s++) {
      const v = validateWizardStep(s, form)
      if (!v.ok) {
        setStep(s)
        setStepError(v.message ?? 'Eksik bilgi var.')
        setStepFieldErrors(v.fieldErrors ?? {})
        return
      }
    }
    setSubmitting(true)
    setStepError(null)
    setStepFieldErrors({})
    try {
      const draft = mapWizardToCreateOrderRequest(form)
      const result = await Promise.resolve(onSave(draft))
      if (result && typeof result === 'object' && 'id' in result) {
        onCreated?.(/** @type {Order} */ (result), { form: { ...form, products: form.products.map((p) => ({ ...p })) } })
      } else {
        onClose()
      }
    } catch {
      /* üst katman banner */
    } finally {
      setSubmitting(false)
    }
  }

  const isLast = step === WIZARD_STEPS.length - 1

  return (
    <div className="now-root" role="presentation">
      <button type="button" className="now-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="now-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="now-head">
          <div>
            <h2 id={titleId} className="now-title">
              Yeni Sipariş
            </h2>
            <p className="now-sub">Sipariş bilgilerini girerek kaydedin.</p>
          </div>
          <button type="button" className="now-close" onClick={onClose} aria-label="Kapat">
            <IconClose />
          </button>
        </header>

        <ol className="now-stepper" aria-label="Sipariş adımları">
          {WIZARD_STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            const clickable = i < step
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={`now-step${active ? ' now-step--active' : ''}${done ? ' now-step--done' : ''}${clickable ? ' now-step--clickable' : ''}`}
                  onClick={() => clickable && goToStep(i)}
                  disabled={!clickable && !active}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="now-step-num">{done ? '✓' : i + 1}</span>
                  <span>{s.label}</span>
                </button>
              </li>
            )
          })}
        </ol>

        <form className="now-form" onSubmit={handleSubmit}>
          <div className={`now-body${step === 1 ? ' now-body--products' : ''}`}>
            {errorMessage ? (
              <div className="now-error now-api-error" role="alert">
                {errorMessage}
              </div>
            ) : null}
            {stepError ? (
              <div className="now-error" role="alert">
                {stepError}
              </div>
            ) : null}

            {step === 0 ? (
              <CustomerStep
                form={form}
                locked={locked}
                orders={orders}
                setField={setField}
                setForm={setForm}
              />
            ) : null}
            {step === 1 ? (
              <WizardProductsStep
                form={form}
                locked={locked}
                totals={totals}
                patchProduct={patchProduct}
                addProduct={addProduct}
                removeProduct={removeProduct}
                replaceProducts={replaceProducts}
              />
            ) : null}
            {step === 2 ? (
              <WizardPaymentStep
                form={form}
                locked={locked}
                totals={totals}
                recentCustomers={recentCustomers}
                setField={setField}
                setForm={setForm}
                fieldErrors={stepFieldErrors}
              />
            ) : null}
            {step === 3 ? (
              <SummaryStep form={form} totals={totals} locked={locked} setField={setField} />
            ) : null}
          </div>

          <footer className="now-foot now-foot--sticky">
            <div className="now-foot-left">
              {step > 0 ? (
                <button
                  type="button"
                  className="now-btn now-btn--ghost"
                  disabled={locked}
                  onClick={() => {
                    setStepError(null)
                    setStep((s) => s - 1)
                  }}
                >
                  Geri
                </button>
              ) : (
                <button type="button" className="now-btn now-btn--ghost" onClick={onClose} disabled={locked}>
                  Vazgeç
                </button>
              )}
            </div>
            <div className="now-foot-right">
              {!isLast ? (
                <button type="button" className="now-btn now-btn--primary" disabled={locked} onClick={tryAdvance}>
                  Devam
                </button>
              ) : (
                <button
                  type="submit"
                  className="now-btn now-btn--primary now-btn--submit"
                  disabled={locked || !canCreateOrder}
                >
                  {submitting ? (
                    <>
                      <span className="now-spinner" aria-hidden />
                      Oluşturuluyor…
                    </>
                  ) : (
                    'Siparişi oluştur'
                  )}
                </button>
              )}
            </div>
          </footer>
        </form>
      </div>
    </div>
  )
}

/**
 * @param {{
 *   form: NewOrderWizardForm
 *   locked: boolean
 *   orders: Order[]
 *   setField: (name: keyof NewOrderWizardForm, value: unknown) => void
 *   setForm: import('react').Dispatch<React.SetStateAction<NewOrderWizardForm>>
 * }} props
 */
function CustomerStep({ form, locked, orders, setField, setForm }) {
  const customerProfiles = useMemo(() => buildWizardCustomerRegistry(orders), [orders])
  const selectedProfile = useMemo(
    () => customerProfiles.find((p) => p.id === form.selectedCustomerKey) ?? null,
    [customerProfiles, form.selectedCustomerKey],
  )
  const deliveryAddresses = selectedProfile?.addresses ?? []

  /** @param {import('../../mappers/order/wizardCustomerRegistryModel.js').WizardCustomerProfile} profile */
  function handleSelectCustomer(profile) {
    const parsed = parseE164Phone(profile.phone)
    setForm((f) => ({
      ...f,
      ...buildWizardFormPatchFromCustomer(profile),
      phoneDialCode: parsed.dialCode,
      phone: parsed.localDigits,
    }))
  }

  function handleClearCustomer() {
    setForm((f) => ({
      ...f,
      customer: '',
      phone: '',
      phoneDialCode: '+90',
      phone2: '',
      nationalId: '',
      taxNumber: '',
      taxOffice: '',
      city: '',
      district: '',
      neighborhood: '',
      address: '',
      selectedCustomerKey: '',
      selectedDeliveryAddressId: '',
    }))
  }

  function handleCustomerQueryChange(query) {
    setField('customer', query)
    if (!form.selectedCustomerKey) return
    const profile = customerProfiles.find((p) => p.id === form.selectedCustomerKey)
    if (
      profile &&
      normalizeWizardCustomerKey(profile.displayName) !== normalizeWizardCustomerKey(query)
    ) {
      setField('selectedCustomerKey', '')
      setField('selectedDeliveryAddressId', '')
    }
  }

  /** @param {string} addressId */
  function handleSelectDeliveryAddress(addressId) {
    const address = deliveryAddresses.find((a) => a.id === addressId)
    if (!address) return
    setForm((f) => ({ ...f, ...buildWizardFormPatchFromDeliveryAddress(address) }))
  }

  return (
    <div className="now-grid">
      <div className="now-field now-span2">
        <span className="now-label now-label-req">Müşteri adı</span>
        <WizardCustomerPicker
          orders={orders}
          value={form.customer}
          selectedCustomerKey={form.selectedCustomerKey}
          locked={locked}
          onSelectCustomer={handleSelectCustomer}
          onClearCustomer={handleClearCustomer}
          onQueryChange={handleCustomerQueryChange}
        />
      </div>
      <div className="now-phone-row">
        <label className="now-field now-phone-primary">
          <span className="now-label">Telefon</span>
          <div className="now-phone-composite">
            <select
              className="now-input now-phone-country"
              value={form.phoneDialCode}
              onChange={(e) => {
                const dialCode = e.target.value
                const country = phoneCountryByDialCode(dialCode)
                setForm((f) => ({
                  ...f,
                  phoneDialCode: dialCode,
                  phone: sanitizePhoneLocalInput(dialCode, f.phone),
                }))
              }}
              disabled={locked}
              aria-label="Ülke kodu"
            >
              {PHONE_COUNTRY_OPTIONS.map((c) => (
                <option key={c.dialCode} value={c.dialCode}>
                  {c.dialCode} {c.label}
                </option>
              ))}
            </select>
            <input
              className="now-input now-phone-local"
              type="tel"
              inputMode="numeric"
              placeholder="05XX XXX XX XX"
              value={formatPhoneDisplay(form.phoneDialCode, form.phone)}
              onChange={(e) =>
                setField(
                  'phone',
                  sanitizePhoneLocalInput(form.phoneDialCode, e.target.value),
                )
              }
              disabled={locked}
              autoComplete="tel"
            />
          </div>
        </label>
        <label className="now-field">
          <span className="now-label">2. telefon</span>
          <input
            className="now-input"
            type="tel"
            inputMode="tel"
            placeholder="Opsiyonel"
            value={form.phone2}
            onChange={(e) => setField('phone2', sanitizePhoneInput(e.target.value, 15))}
            disabled={locked}
            autoComplete="tel"
          />
        </label>
      </div>
      <div className="now-invoice-group now-span2">
        <p className="now-invoice-group-title">Fatura / kimlik</p>
        <p className="now-invoice-group-hint">Bireyselde TC, kurumsalda vergi bilgisi yeterli — hepsi opsiyonel.</p>
        <div className="now-invoice-grid">
          <label className="now-field">
            <span className="now-label">TC Kimlik No</span>
            <input
              className="now-input"
              inputMode="numeric"
              placeholder="11 hane"
              maxLength={11}
              value={form.nationalId}
              onChange={(e) =>
                setField('nationalId', sanitizeDigitsOnly(e.target.value, 11))
              }
              disabled={locked}
            />
          </label>
          <label className="now-field">
            <span className="now-label">Vergi numarası</span>
            <input
              className="now-input"
              inputMode="numeric"
              placeholder="Kurumsal"
              maxLength={11}
              value={form.taxNumber}
              onChange={(e) =>
                setField('taxNumber', sanitizeDigitsOnly(e.target.value, 11))
              }
              disabled={locked}
            />
          </label>
          <label className="now-field now-span2">
            <span className="now-label">Vergi dairesi</span>
            <input
              className="now-input"
              placeholder="Örn. Kadıköy"
              value={form.taxOffice}
              onChange={(e) => setField('taxOffice', e.target.value)}
              disabled={locked}
            />
          </label>
        </div>
      </div>
      <label className="now-field">
        <span className="now-label now-label-req">Satış danışmanı</span>
        <select
          className="now-select"
          value={form.salesPerson}
          onChange={(e) => setField('salesPerson', e.target.value)}
          disabled={locked}
        >
          {form.salesPerson ? null : <option value="">Seçin</option>}
          {SALES_TEAM.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      {deliveryAddresses.length > 1 ? (
        <div className="now-field now-span2">
          <span className="now-label">Teslimat Adresi</span>
          <div className="now-delivery-addresses" role="group" aria-label="Teslimat adresi seçimi">
            {deliveryAddresses.map((addr) => (
              <button
                key={addr.id}
                type="button"
                className={`now-delivery-address-chip${form.selectedDeliveryAddressId === addr.id ? ' now-delivery-address-chip--active' : ''}`}
                disabled={locked}
                onClick={() => handleSelectDeliveryAddress(addr.id)}
              >
                {addr.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="now-field">
        <span className="now-label">İl</span>
        <input
          className="now-input"
          value={form.city}
          onChange={(e) => setField('city', e.target.value)}
          disabled={locked}
        />
      </label>
      <label className="now-field">
        <span className="now-label">İlçe</span>
        <input
          className="now-input"
          value={form.district}
          onChange={(e) => setField('district', e.target.value)}
          disabled={locked}
        />
      </label>
      <label className="now-field">
        <span className="now-label">Semt / mahalle</span>
        <input
          className="now-input"
          value={form.neighborhood}
          onChange={(e) => setField('neighborhood', e.target.value)}
          disabled={locked}
        />
      </label>
      <label className="now-field now-span2">
        <span className="now-label">Açık adres</span>
        <input
          className="now-input"
          value={form.address}
          onChange={(e) => setField('address', e.target.value)}
          disabled={locked}
        />
      </label>
      <label className="now-field now-span2">
        <span className="now-label">Müşteri notu</span>
        <textarea
          className="now-textarea"
          rows={2}
          value={form.customerNote}
          onChange={(e) => setField('customerNote', e.target.value)}
          disabled={locked}
          placeholder="Teslimat veya iletişim notu"
        />
      </label>
    </div>
  )
}

/**
 * @param {{
 *   form: NewOrderWizardForm
 *   locked: boolean
 *   totals: ReturnType<typeof computeOrderTotals>
 *   setField: (name: keyof NewOrderWizardForm, value: unknown) => void
 * }} props
 */
function SummaryStep({ form, totals, locked, setField }) {
  const addr = [form.neighborhood, form.address, form.district, form.city].filter(Boolean).join(', ')
  const identityLine = formatCustomerIdentityCompact(form)
  return (
    <div>
      <div className="now-summary">
        <div className="now-summary-card">
          <h3>Müşteri</h3>
          <dl className="now-summary-dl">
            <div>
              <dt>Ad</dt>
              <dd>{form.customer.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{formatPhoneDisplay(form.phoneDialCode, form.phone) || '—'}</dd>
            </div>
            <div>
              <dt>2. telefon</dt>
              <dd>{form.phone2.trim() || '—'}</dd>
            </div>
            {identityLine ? (
              <div>
                <dt>Kimlik / vergi</dt>
                <dd>{identityLine}</dd>
              </div>
            ) : null}
            <div>
              <dt>Adres</dt>
              <dd>{addr || '—'}</dd>
            </div>
          </dl>
        </div>
        <div className="now-summary-card">
          <h3>Finans</h3>
          <dl className="now-summary-dl">
            <div>
              <dt>Ara toplam</dt>
              <dd>{formatTry(totals.subtotal)}</dd>
            </div>
            {totals.totalDiscount > 0 ? (
              <div>
                <dt>İskonto</dt>
                <dd className="now-summary-discount">−{formatTry(totals.totalDiscount)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Genel toplam</dt>
              <dd className="now-summary-grand">{formatTry(totals.grandTotal)}</dd>
            </div>
            <div>
              <dt>Ödenen</dt>
              <dd>{formatTry(totals.kapora)}</dd>
            </div>
            <div>
              <dt>Kalan</dt>
              <dd>{formatTry(totals.remaining)}</dd>
            </div>
            <div>
              <dt>Teslim</dt>
              <dd>{form.dueDate || '—'}</dd>
            </div>
            <div>
              <dt>Durum</dt>
              <dd>{form.status}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="now-summary-card" style={{ marginTop: '1rem' }}>
        <h3>Ürünler</h3>
        <ul className="now-product-list">
          {form.products
            .filter((p) => p.name.trim())
            .map((p) => (
              <li key={p.id}>
                {p.name} · {p.group} · {formatTry(lineTotal(p))}
                {p.note.trim() ? ` — ${p.note.trim()}` : ''}
              </li>
            ))}
        </ul>
      </div>
      <label className="now-field" style={{ marginTop: '1rem' }}>
        <span className="now-label">Sipariş durumu</span>
        <select
          className="now-select"
          value={form.status}
          onChange={(e) => setField('status', e.target.value)}
          disabled={locked}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <p className="now-hint" style={{ marginTop: '0.5rem' }}>
        Sevk tarihi teslimden 5 gün sonra otomatik planlanır.
      </p>
    </div>
  )
}
