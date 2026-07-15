import { useEffect, useMemo, useState } from 'react'
import { formatTry } from '../../../data/index.js'
import { riskSeverityBadgeLabelTr } from '../../../mappers/risk/riskDrawerUi.js'
import { useOrders } from '../../../state/useOrders.js'
import { formatCustomerPhonesCompact, parseCustomerExtraFromNotes } from '../newOrderWizardModel.js'
import {
  buildCustomerDrawerStats,
  buildCustomerDrawerTimeline,
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
}) {
  const { orders, salesOrderListItemDtos, domainEvents } = useOrders()
  const [noteDraft, setNoteDraft] = useState('')
  const [localNotes, setLocalNotes] = useState(/** @type {string[]} */ ([]))

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
        aria-label="Müşteri kartını kapat"
        onClick={onClose}
      />
      <aside
        className="cust-erp-drawer"
        role="complementary"
        aria-label={`${customer} müşteri kartı`}
      >
        <header className="cust-erp-drawer__hero">
          <div className="cust-erp-drawer__head-row">
            <h2 className="cust-erp-drawer__hero-title">{customer}</h2>
            <button
              type="button"
              className="cust-erp-drawer__close"
              aria-label="Kapat"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <dl className="cust-erp-drawer__hero-grid">
            <div className="cust-erp-drawer__hero-item">
              <dt>Telefon</dt>
              <dd>{phoneDisplay}</dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Müşteri tipi</dt>
              <dd>{customerType}</dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Risk durumu</dt>
              <dd>
                <span className={`cust-erp-drawer__risk ${riskBadgeClass(riskSeverity)}`}>
                  {riskLabel}
                </span>
              </dd>
            </div>
            <div className="cust-erp-drawer__hero-item">
              <dt>Açık bakiye</dt>
              <dd
                className={
                  stats.openBalance > 0.009 ? 'cust-erp-drawer__hero-value--due' : undefined
                }
              >
                {stats.openBalance > 0.009 ? formatTry(stats.openBalance) : 'Kapandı'}
              </dd>
            </div>
            <div className="cust-erp-drawer__hero-item cust-erp-drawer__hero-item--wide">
              <dt>Son sipariş tarihi</dt>
              <dd>{stats.lastOrderDate}</dd>
            </div>
          </dl>
        </header>

        <div className="cust-erp-drawer__body">
          <section
            className="cust-erp-drawer__section cust-erp-drawer__section--identity"
            aria-labelledby="cust-sec-identity"
          >
            <h3 id="cust-sec-identity" className="cust-erp-drawer__section-title">
              Müşteri Kimliği
            </h3>
            <dl className="cust-erp-drawer__kv">
              <div className="cust-erp-drawer__kv-row">
                <dt>Müşteri adı</dt>
                <dd>{customer}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Müşteri tipi</dt>
                <dd>{customerType}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Bu sipariş</dt>
                <dd>
                  {orderNo}
                  {orderDateLabel ? ` · ${orderDateLabel}` : ''}
                </dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Sipariş durumu</dt>
                <dd>{order.status}</dd>
              </div>
              {identityExtra.nationalId ? (
                <div className="cust-erp-drawer__kv-row">
                  <dt>TC Kimlik</dt>
                  <dd>{identityExtra.nationalId}</dd>
                </div>
              ) : null}
              {identityExtra.taxNumber ? (
                <div className="cust-erp-drawer__kv-row">
                  <dt>Vergi no</dt>
                  <dd>{identityExtra.taxNumber}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section
            className="cust-erp-drawer__section cust-erp-drawer__section--contact"
            aria-labelledby="cust-sec-contact"
          >
            <h3 id="cust-sec-contact" className="cust-erp-drawer__section-title">
              İletişim Bilgileri
            </h3>
            {telHref || whatsappHref ? (
              <div className="cust-erp-drawer__actions" aria-label="Hızlı iletişim aksiyonları">
                {telHref ? (
                  <a className="cust-erp-drawer__action cust-erp-drawer__action--call" href={telHref}>
                    Ara
                  </a>
                ) : null}
                {whatsappHref ? (
                  <a
                    className="cust-erp-drawer__action cust-erp-drawer__action--whatsapp"
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}
            <dl className="cust-erp-drawer__kv">
              <div className="cust-erp-drawer__kv-row">
                <dt>Telefon</dt>
                <dd>{phoneDisplay}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>E-posta</dt>
                <dd>{email ?? '—'}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Adres</dt>
                <dd>{addressText}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>İl / İlçe</dt>
                <dd>{cityDistrict}</dd>
              </div>
            </dl>
          </section>

          <section
            className="cust-erp-drawer__section cust-erp-drawer__section--summary"
            aria-labelledby="cust-sec-summary"
          >
            <h3 id="cust-sec-summary" className="cust-erp-drawer__section-title">
              Sipariş Özeti
            </h3>
            <dl className="cust-erp-drawer__kv">
              <div className="cust-erp-drawer__kv-row">
                <dt>Toplam sipariş</dt>
                <dd>{stats.totalOrders}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Aktif sipariş</dt>
                <dd>{stats.activeOrders}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Teslim edilen</dt>
                <dd>{stats.deliveredOrders}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Bekleyen sevk</dt>
                <dd>{stats.pendingShipment}</dd>
              </div>
            </dl>
          </section>

          <section
            className="cust-erp-drawer__section cust-erp-drawer__section--finance"
            aria-labelledby="cust-sec-finance"
          >
            <h3 id="cust-sec-finance" className="cust-erp-drawer__section-title">
              Finans Özeti
            </h3>
            <dl className="cust-erp-drawer__kv">
              <div className="cust-erp-drawer__kv-row">
                <dt>Toplam satış</dt>
                <dd>{formatTry(stats.totalSales)}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Tahsil edilen</dt>
                <dd>{formatTry(stats.totalPaid)}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Açık bakiye</dt>
                <dd className={stats.openBalance > 0.009 ? 'cust-erp-drawer__kv-row--due' : undefined}>
                  {stats.openBalance > 0.009 ? formatTry(stats.openBalance) : 'Kapandı'}
                </dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Ortalama sipariş</dt>
                <dd>{formatAvgOrder(stats.avgOrder)}</dd>
              </div>
              <div className="cust-erp-drawer__kv-row">
                <dt>Son ödeme</dt>
                <dd>{lastPayment}</dd>
              </div>
            </dl>
          </section>

          <section
            className="cust-erp-drawer__section cust-erp-drawer__section--moves"
            aria-labelledby="cust-sec-moves"
          >
            <h3 id="cust-sec-moves" className="cust-erp-drawer__section-title">
              Son Hareketler
            </h3>
            {timeline.length > 0 ? (
              <ol className="cust-erp-drawer__timeline">
                {timeline.map((item, idx) => (
                  <li key={item.id} className="cust-erp-drawer__timeline-item">
                    <div className="cust-erp-drawer__timeline-track" aria-hidden>
                      <span className="cust-erp-drawer__timeline-dot" />
                      {idx < timeline.length - 1 ? (
                        <span className="cust-erp-drawer__timeline-line" />
                      ) : null}
                    </div>
                    <div className="cust-erp-drawer__timeline-body">
                      <p className="cust-erp-drawer__timeline-date">{item.dateLabel}</p>
                      <p className="cust-erp-drawer__timeline-label">{item.label}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="cust-erp-drawer__muted">Kayıtlı hareket yok.</p>
            )}
          </section>

          <section
            className="cust-erp-drawer__section cust-erp-drawer__section--notes"
            aria-labelledby="cust-sec-notes"
          >
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
        </div>
      </aside>
    </>
  )
}
