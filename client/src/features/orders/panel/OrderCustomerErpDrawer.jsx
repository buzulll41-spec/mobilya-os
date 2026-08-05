import { useEffect, useMemo, useState } from 'react'
import { formatTry } from '../../../data/index.js'
import { riskSeverityBadgeLabelTr } from '../../../mappers/risk/riskDrawerUi.js'
import { useOrders } from '../../../state/useOrders.js'
import { formatCustomerPhonesCompact, parseCustomerExtraFromNotes } from '../newOrderWizardModel.js'
import {
  buildCustomerDrawerStats,
  buildCustomerDrawerTimeline,
  buildCustomerCommandCenterModel,
  findLastPaymentLabel,
  formatAvgOrder,
  inferCustomerTypeLabel,
  loadCustomerDrawerNotes,
  parseContactExtras,
  saveCustomerDrawerNotes,
} from '../../../mappers/order/orderCustomerDrawerModel.js'
import './order-customer-drawer.css'

/** @typedef {import('../../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @param {string} severity
 */
function riskBadgeClass(severity) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'cust-erp-drawer__risk--high'
  if (severity === 'MEDIUM' || severity === 'LOW') return 'cust-erp-drawer__risk--med'
  return 'cust-erp-drawer__risk--ok'
}

/**
 * @param {string | null | undefined} phone
 */
function normalizePhoneDigits(phone) {
  return String(phone ?? '').replace(/\D/g, '')
}

/**
 * @param {string | null | undefined} phone
 */
function resolveTelHref(phone) {
  const raw = String(phone ?? '').trim()
  return raw ? `tel:${raw.replace(/\s/g, '')}` : null
}

/**
 * @param {string | null | undefined} phone
 */
function resolveWhatsAppHref(phone) {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return null
  return `https://wa.me/${digits.replace(/^0/, '90')}`
}

/**
 * Müşteri Kartı ERP V1 — sipariş paneli içi sağ drawer.
 *
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   customer: string
 *   order: Order
 *   orderNo: string
 *   listItemDto?: SalesOrderListItemDto
 *   phone?: string | null
 *   phone2?: string | null
 *   addressLine?: string | null
 *   orderDateLabel?: string | null
 *   onOpenOrder?: (orderId: string) => void
 *   onOpenOrderModal?: () => void
 * }} props
 */
export default function OrderCustomerErpDrawer({
  open,
  onClose,
  customer,
  order,
  orderNo,
  listItemDto,
  phone,
  phone2,
  addressLine,
  orderDateLabel,
  onOpenOrder,
  onOpenOrderModal,
}) {
  const { orders, salesOrderListItemDtos, domainEvents } = useOrders()
  const [noteDraft, setNoteDraft] = useState('')
  const [localNotes, setLocalNotes] = useState(/** @type {string[]} */ ([]))
  const [mobileActionSheetOpen, setMobileActionSheetOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    setLocalNotes(loadCustomerDrawerNotes(customer))
    setNoteDraft('')
  }, [open, customer])

  const phoneDisplay = formatCustomerPhonesCompact({ phone, phone2 }) || '—'
  const addressText = addressLine?.trim() || '—'
  const { email, city, district, opsNote } = useMemo(
    () => parseContactExtras(order.notes),
    [order.notes],
  )
  const identityExtra = useMemo(() => parseCustomerExtraFromNotes(order.notes), [order.notes])
  const cityDistrict =
    city || district ? `${city ?? '—'} / ${district ?? '—'}` : '—'
  const customerType = inferCustomerTypeLabel(customer, order.notes)

  const riskSeverity = listItemDto?.currentRiskSeverity ?? 'NONE'
  const riskLabel = riskSeverityBadgeLabelTr(riskSeverity)
  const primaryPhone = phone?.trim() || phone2?.trim() || null
  const telHref = resolveTelHref(primaryPhone)
  const whatsappHref = resolveWhatsAppHref(primaryPhone)

  const stats = useMemo(
    () => buildCustomerDrawerStats(customer, orders, salesOrderListItemDtos ?? []),
    [customer, orders, salesOrderListItemDtos],
  )

  const lastPayment = useMemo(
    () => findLastPaymentLabel(stats.orderIds, domainEvents ?? []),
    [stats.orderIds, domainEvents],
  )

  const timeline = useMemo(
    () =>
      buildCustomerDrawerTimeline(stats.orderIds, domainEvents ?? [], stats.customerOrders),
    [stats.orderIds, stats.customerOrders, domainEvents],
  )

  const allNotes = useMemo(() => {
    const base = opsNote && opsNote !== '—' ? [opsNote] : []
    return [...localNotes, ...base.filter((n) => !localNotes.includes(n))]
  }, [localNotes, opsNote])

  const commandCenter = useMemo(
    () =>
      buildCustomerCommandCenterModel({
        customerName: customer,
        orders,
        dtos: salesOrderListItemDtos ?? [],
        domainEvents: domainEvents ?? [],
        todayIso: new Date().toISOString().slice(0, 10),
      }),
    [customer, orders, salesOrderListItemDtos, domainEvents],
  )

  function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setMobileActionSheetOpen(false)
  }

  function handleAddNote(e) {
    e.preventDefault()
    const text = noteDraft.trim()
    if (!text) return
    const next = [text, ...localNotes].slice(0, 12)
    setLocalNotes(next)
    saveCustomerDrawerNotes(customer, next)
    setNoteDraft('')
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="cust-erp-drawer__scrim"
        aria-label="Müşteri merkezini kapat"
        onClick={onClose}
      />
      <aside
        className="cust-erp-drawer"
        role="complementary"
        aria-label={`${customer} müşteri merkezi`}
      >
        <header className="cust-erp-drawer__hero cust-erp-drawer__hero--command">
          <div className="cust-erp-drawer__head-row">
            <div className="cust-erp-drawer__hero-copy">
              <p className="cust-erp-drawer__eyebrow">Müşteri Komuta Merkezi</p>
              <h2 className="cust-erp-drawer__hero-title">{customer}</h2>
              <p className="cust-erp-drawer__hero-sub">{customerType} · {commandCenter.lastContact.label}</p>
            </div>
            <button
              type="button"
              className="cust-erp-drawer__close"
              aria-label="Kapat"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="cust-erp-drawer__quick-actions" aria-label="Hızlı iletişim aksiyonları">
            {telHref ? (
              <a className="cust-erp-drawer__action cust-erp-drawer__action--call" href={telHref}>
                Ara
              </a>
            ) : (
              <span className="cust-erp-drawer__action is-disabled">Ara</span>
            )}
            {whatsappHref ? (
              <a
                className="cust-erp-drawer__action cust-erp-drawer__action--whatsapp"
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
            ) : (
              <span className="cust-erp-drawer__action is-disabled">WhatsApp</span>
            )}
          </div>

          <dl className="cust-erp-drawer__hero-grid cust-erp-drawer__hero-grid--command">
            <div className="cust-erp-drawer__hero-item">
              <dt>Telefon</dt>
              <dd>{phoneDisplay}</dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Son görüşme</dt>
              <dd>{commandCenter.lastContact.detail}</dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Aktif sipariş</dt>
              <dd>{commandCenter.stats.activeOrders}</dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Toplam alışveriş</dt>
              <dd>{formatTry(commandCenter.stats.totalSales)}</dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Borç</dt>
              <dd className={commandCenter.finance.remaining > 0.009 ? 'cust-erp-drawer__hero-value--due' : undefined}>
                {commandCenter.finance.remaining > 0.009 ? formatTry(commandCenter.finance.remaining) : 'Kapandı'}
              </dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Risk</dt>
              <dd>
                <span className={`cust-erp-drawer__risk ${riskBadgeClass(riskSeverity)}`}>
                  {commandCenter.riskLabel}
                </span>
              </dd>
            </div>
          </dl>
        </header>

        <div className="cust-erp-drawer__body">
          <section className="cust-erp-drawer__section cust-erp-drawer__section--ai" aria-labelledby="cust-sec-ai">
            <h3 id="cust-sec-ai" className="cust-erp-drawer__section-title">
              EVTREND AI
            </h3>
            <article className={`cust-erp-drawer__ai-card is-${commandCenter.aiSignal.tone}`}>
              <p className="cust-erp-drawer__ai-label">{commandCenter.aiSignal.label}</p>
              <p className="cust-erp-drawer__ai-detail">{commandCenter.aiSignal.detail}</p>
              <div className="cust-erp-drawer__ai-actions">
                {commandCenter.aiSignal.href ? (
                  <a className="cust-erp-drawer__ai-action" href={commandCenter.aiSignal.href}>
                    {commandCenter.aiSignal.action}
                  </a>
                ) : (
                  <button
                    type="button"
                    className="cust-erp-drawer__ai-action"
                    onClick={() => scrollToSection(commandCenter.aiSignal.target ?? 'cust-sec-finance')}
                  >
                    {commandCenter.aiSignal.action}
                  </button>
                )}
              </div>
            </article>
          </section>

          <section id="cust-sec-active-orders" className="cust-erp-drawer__section cust-erp-drawer__section--orders" aria-labelledby="cust-sec-orders">
            <h3 id="cust-sec-orders" className="cust-erp-drawer__section-title">
              Aktif Siparişler
            </h3>
            {commandCenter.activeOrders.length > 0 ? (
              <div className="cust-erp-drawer__card-list">
                {commandCenter.activeOrders.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`cust-erp-drawer__order-card is-${item.tone}`}
                    onClick={() => onOpenOrder?.(item.id)}
                  >
                    <div className="cust-erp-drawer__order-card-head">
                      <strong>{item.orderNo}</strong>
                      <span>{item.status}</span>
                    </div>
                    <dl className="cust-erp-drawer__order-card-grid">
                      <div>
                        <dt>Toplam</dt>
                        <dd>{item.totalLabel}</dd>
                      </div>
                      <div>
                        <dt>Teslim Tarihi</dt>
                        <dd>{item.deliveryDateLabel}</dd>
                      </div>
                      <div>
                        <dt>Kalan</dt>
                        <dd>{item.remainingLabel}</dd>
                      </div>
                    </dl>
                  </button>
                ))}
              </div>
            ) : (
              <p className="cust-erp-drawer__muted">Aktif sipariş yok.</p>
            )}
          </section>

          <section id="cust-sec-finance" className="cust-erp-drawer__section cust-erp-drawer__section--finance" aria-labelledby="cust-sec-finance-title">
            <h3 id="cust-sec-finance-title" className="cust-erp-drawer__section-title">
              Finans Durumu
            </h3>
            <div className="cust-erp-drawer__finance-badge" data-tone={commandCenter.finance.tone}>
              {commandCenter.finance.tone === 'critical' ? 'Gecikmiş' : commandCenter.finance.tone === 'warning' ? 'Takip' : 'Temiz'}
            </div>
            <dl className="cust-erp-drawer__finance-grid">
              <div>
                <dt>Toplam Borç</dt>
                <dd>{formatTry(commandCenter.finance.totalDebt)}</dd>
              </div>
              <div>
                <dt>Tahsil Edilen</dt>
                <dd>{formatTry(commandCenter.finance.collected)}</dd>
              </div>
              <div>
                <dt>Kalan</dt>
                <dd>{formatTry(commandCenter.finance.remaining)}</dd>
              </div>
              <div>
                <dt>Vadesi Geçmiş</dt>
                <dd className={commandCenter.finance.overdue > 0.009 ? 'cust-erp-drawer__kv-row--due' : undefined}>
                  {formatTry(commandCenter.finance.overdue)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="cust-erp-drawer__section cust-erp-drawer__section--history" aria-labelledby="cust-sec-history-title">
            <h3 id="cust-sec-history-title" className="cust-erp-drawer__section-title">
              İletişim Geçmişi
            </h3>
            {commandCenter.history.length > 0 ? (
              <ol className="cust-erp-drawer__history-list">
                {commandCenter.history.map((item) => (
                  <li key={item.id} className="cust-erp-drawer__history-item">
                    <span className="cust-erp-drawer__history-kind">{item.kind}</span>
                    <div className="cust-erp-drawer__history-copy">
                      <strong>{item.detail}</strong>
                      <span>{item.dateLabel}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cust-erp-drawer__muted">Kayıtlı iletişim geçmişi yok.</p>
            )}
          </section>

          <section className="cust-erp-drawer__section cust-erp-drawer__section--addresses" aria-labelledby="cust-sec-addresses-title">
            <h3 id="cust-sec-addresses-title" className="cust-erp-drawer__section-title">
              Adresler
            </h3>
            {commandCenter.addresses.length > 0 ? (
              <div className="cust-erp-drawer__card-list">
                {commandCenter.addresses.map((item) => (
                  <article key={item.id} className="cust-erp-drawer__address-card">
                    <div className="cust-erp-drawer__address-head">
                      <strong>Adres</strong>
                      <span>{item.dueLabel}</span>
                    </div>
                    <p>{item.address}</p>
                    {item.mapsHref ? (
                      <a className="cust-erp-drawer__address-action" href={item.mapsHref} target="_blank" rel="noreferrer">
                        Navigasyonu Başlat
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="cust-erp-drawer__muted">Kayıtlı adres yok.</p>
            )}
          </section>

          <section className="cust-erp-drawer__section cust-erp-drawer__section--notes" aria-labelledby="cust-sec-notes">
            <h3 id="cust-sec-notes" className="cust-erp-drawer__section-title">
              Notlar
            </h3>
            <form className="cust-erp-drawer__note-form" onSubmit={handleAddNote}>
              <label className="cust-erp-drawer__note-field">
                <span className="cust-erp-drawer__note-label">Hızlı not</span>
                <input
                  type="text"
                  className="cust-erp-drawer__note-input"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Müşteri görüşmesi, teslim notu…"
                />
              </label>
              <button type="submit" className="cust-erp-drawer__note-btn">
                Ekle
              </button>
            </form>
            {allNotes.length > 0 ? (
              <ul className="cust-erp-drawer__notes-list">
                {allNotes.map((note, idx) => (
                  <li key={`${idx}-${note.slice(0, 12)}`} className="cust-erp-drawer__note-item">
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="cust-erp-drawer__muted">Henüz not yok.</p>
            )}
          </section>

          <section className="cust-erp-drawer__section cust-erp-drawer__section--docs" aria-labelledby="cust-sec-docs-title">
            <h3 id="cust-sec-docs-title" className="cust-erp-drawer__section-title">
              Belgeler
            </h3>
            <div className="cust-erp-drawer__card-list cust-erp-drawer__card-list--docs">
              {commandCenter.documents.map((item) => (
                <article key={item.id} className={`cust-erp-drawer__doc-card is-${item.tone}`}>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <footer className="cust-erp-drawer__footer">
          {telHref ? (
            <a className="cust-erp-drawer__footer-btn cust-erp-drawer__footer-btn--primary" href={telHref}>
              Ara
            </a>
          ) : (
            <span className="cust-erp-drawer__footer-btn cust-erp-drawer__footer-btn--primary is-disabled">Ara</span>
          )}
          <button
            type="button"
            className="cust-erp-drawer__footer-btn cust-erp-drawer__footer-btn--secondary"
            onClick={() => setMobileActionSheetOpen((value) => !value)}
          >
            İşlem Yap
          </button>
        </footer>

        {mobileActionSheetOpen ? (
          <div className="cust-erp-drawer__action-sheet" role="dialog" aria-label="İşlem menüsü">
            <button
              type="button"
              className="cust-erp-drawer__action-sheet-backdrop"
              aria-label="Kapat"
              onClick={() => setMobileActionSheetOpen(false)}
            />
            <div className="cust-erp-drawer__action-sheet-panel">
              {[
                { id: 'whatsapp', label: 'WhatsApp', href: whatsappHref },
                { id: 'new-order', label: 'Yeni Sipariş', onClick: () => onOpenOrderModal?.() },
                { id: 'payments', label: 'Tahsilat', onClick: () => scrollToSection('cust-sec-finance') },
                { id: 'notes', label: 'Not', onClick: () => scrollToSection('cust-sec-notes') },
                { id: 'service', label: 'Servis', onClick: () => scrollToSection('cust-sec-history-title') },
                { id: 'delivery', label: 'Teslimat', onClick: () => scrollToSection('cust-sec-addresses-title') },
                { id: 'photo', label: 'Fotoğraf', onClick: () => scrollToSection('cust-sec-docs-title') },
                { id: 'document', label: 'Belge', onClick: () => scrollToSection('cust-sec-docs-title') },
              ].map((item) =>
                item.href ? (
                  <a
                    key={item.id}
                    className="cust-erp-drawer__action-sheet-item"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMobileActionSheetOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    className="cust-erp-drawer__action-sheet-item"
                    onClick={() => {
                      item.onClick?.()
                      setMobileActionSheetOpen(false)
                    }}
                  >
                    {item.label}
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}
      </aside>
    </>
  )
}
