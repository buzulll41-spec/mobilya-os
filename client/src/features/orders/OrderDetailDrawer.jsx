import { useEffect, useState } from 'react'
import { ORDER_STATUSES, formatTry } from '../../data/index.js'
import { formatShortDate } from '../../utils/dates.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { buildOrderTimeline } from '../../utils/orderTimeline.js'
import { useOrders } from '../../state/useOrders.js'
import OperationTimeline from './OperationTimeline.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'

/** @typedef {import('../../data/seedOrders.js').Order} Order */

/**
 * @param {{
 *   order: Order | null
 *   open: boolean
 *   onClose: () => void
 * }} props
 */
export default function OrderDetailDrawer({ order, open, onClose }) {
  const { updateOrder, mutating } = useOrders()
  const [statusSaving, setStatusSaving] = useState(false)

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

  if (!open || !order) return null

  const rem = remainingBalance(order)
  const paidPct = order.amount > 0 ? Math.round(((order.amount - rem) / order.amount) * 100) : 0
  const steps = buildOrderTimeline(order)

  async function handleStatusChange(e) {
    const next = /** @type {Order['status']} */ (e.target.value)
    if (next === order.status) return
    setStatusSaving(true)
    try {
      await updateOrder(order.id, { status: next })
    } finally {
      setStatusSaving(false)
    }
  }

  return (
    <div className="mos-drawer-root" role="presentation">
      <button type="button" className="mos-drawer-backdrop" aria-label="Kapat" onClick={onClose} />
      <aside className="mos-drawer" aria-label="Sipariş detayı">
        <header className="mos-drawer-head">
          <div>
            <p className="mos-drawer-kicker">Sipariş</p>
            <h2 className="mos-drawer-title">{order.id}</h2>
          </div>
          <button type="button" className="mos-drawer-x" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>

        <div className="mos-drawer-body">
          <section className="mos-drawer-section">
            <h3 className="mos-drawer-h">Müşteri</h3>
            <p className="mos-drawer-p-strong">{order.customer}</p>
            {order.phone ? <p className="mos-drawer-p-muted">{order.phone}</p> : null}
            {order.salesPerson ? (
              <p className="mos-drawer-p-meta">Satış: {order.salesPerson}</p>
            ) : null}
          </section>

          <section className="mos-drawer-section">
            <h3 className="mos-drawer-h">Ürün</h3>
            <p className="mos-drawer-p">{order.product}</p>
          </section>

          <section className="mos-drawer-section">
            <h3 className="mos-drawer-h">Ödeme durumu</h3>
            <div className="mos-drawer-pay">
              <div>
                <span className="mos-drawer-pay-label">Satış</span>
                <span className="mos-drawer-pay-val">{formatTry(order.amount)}</span>
              </div>
              <div>
                <span className="mos-drawer-pay-label">Kapora / tahsil</span>
                <span className="mos-drawer-pay-val">
                  {formatTry(order.paid ? order.amount : order.paidAmount ?? 0)}
                </span>
              </div>
              <div>
                <span className="mos-drawer-pay-label">Kalan</span>
                <span className="mos-drawer-pay-val mos-drawer-pay-val--accent">{formatTry(rem)}</span>
              </div>
            </div>
            <div className="mos-drawer-bar" aria-hidden>
              <span className="mos-drawer-bar-fill" style={{ width: `${Math.min(100, paidPct)}%` }} />
            </div>
            <p className="mos-drawer-p-meta">Tahsilat oranı ~%{paidPct}</p>
          </section>

          <section className="mos-drawer-section">
            <div className="mos-drawer-rowhead">
              <h3 className="mos-drawer-h">Operasyon durumu</h3>
              <StatusBadge status={order.status} />
            </div>
            <label className="mos-drawer-field">
              <span className="mos-drawer-field-label">Durumu güncelle</span>
              <select
                className="mos-input mos-select mos-drawer-select"
                value={order.status}
                onChange={(e) => void handleStatusChange(e)}
                disabled={statusSaving || mutating}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            {statusSaving ? (
              <p className="mos-drawer-p-meta" role="status">
                Mock API: güncelleniyor…
              </p>
            ) : null}
          </section>

          <section className="mos-drawer-section">
            <h3 className="mos-drawer-h">Operasyon</h3>
            <OperationTimeline steps={steps} />
          </section>

          <section className="mos-drawer-section">
            <h3 className="mos-drawer-h">Teslimat</h3>
            <dl className="mos-drawer-dl">
              <div>
                <dt>Termin</dt>
                <dd>{formatShortDate(order.dueDate)}</dd>
              </div>
              <div>
                <dt>Sevk tarihi</dt>
                <dd>{formatShortDate(order.shipmentDate)}</dd>
              </div>
              <div>
                <dt>Durum</dt>
                <dd>{order.status}</dd>
              </div>
            </dl>
          </section>

          <section className="mos-drawer-section">
            <h3 className="mos-drawer-h">Notlar</h3>
            <p className="mos-drawer-notes">{order.notes?.trim() || 'Not eklenmemiş.'}</p>
          </section>
        </div>
      </aside>
    </div>
  )
}
