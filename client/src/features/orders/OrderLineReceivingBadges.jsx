import { useState } from 'react'
import { useOrderLineReceiving } from '../../hooks/useOrderLineReceiving.js'
import { getLineReceiveAction, RECEIVE_ALREADY_COMPLETE_MESSAGE } from '../../mappers/receiving/orderLineReceiveAction.js'
import { parseQty } from '../../mappers/receiving/productReadiness.js'
import * as incomingGoodsClient from '../../services/incomingGoodsClient.js'
import * as suppliersClient from '../../services/suppliersClient.js'
import QuickLineReceiveModal from './QuickLineReceiveModal.jsx'

/** @typedef {import('../../contracts/v1/incomingGoods.js').OrderLineReceivingDto} OrderLineReceivingDto */
/** @typedef {import('../../contracts/v1/supplier.js').SupplierListItemDto} SupplierListItemDto */

/**
 * @param {{
 *   orderId: string
 *   refreshKey?: number
 *   onReceivingSaved?: () => void
 * }} props
 */
export default function OrderLineReceivingBadges({ orderId, refreshKey = 0, onReceivingSaved }) {
  const { lines, loading, error } = useOrderLineReceiving(orderId, refreshKey)
  const [suppliers, setSuppliers] = useState(/** @type {SupplierListItemDto[]} */ ([]))
  const [activeLine, setActiveLine] = useState(/** @type {OrderLineReceivingDto | null} */ (null))
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))

  async function openReceiveModal(line) {
    setFormError(null)
    if (parseQty(line.qtyPending) <= 0.0001) {
      setFormError(RECEIVE_ALREADY_COMPLETE_MESSAGE)
      return
    }
    try {
      const rows = await suppliersClient.listSuppliers({ activeOnly: true })
      setSuppliers(rows)
      setActiveLine(line)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Tedarikçiler yüklenemedi')
    }
  }

  async function handleQuickSubmit(body) {
    setSaving(true)
    setFormError(null)
    try {
      await incomingGoodsClient.createIncomingGoods(body)
      setActiveLine(null)
      onReceivingSaved?.()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Kayıt oluşturulamadı')
      throw e
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null
  if (!lines.length && !error) return null

  return (
    <>
      <section className="oop-card oop-line-receiving" aria-label="Ürün satır durumları">
        <h3 className="oop-card-title">Ürün satırları</h3>
        {error ? (
          <p className="mos-form-error" role="alert">
            {error}
          </p>
        ) : null}
        <ul className="oop-line-receiving__list">
          {lines.map((row) => {
            const action = getLineReceiveAction(row)
            return (
              <li key={row.orderLineId} className="oop-line-receiving__item">
                <div className="oop-line-receiving__main">
                  <span className="oop-line-receiving__title">{row.title}</span>
                  <span className="oop-line-receiving__qty">
                    Gelen {row.qtyReceived} / {row.qtyOrdered}
                  </span>
                </div>
                <div className="oop-line-receiving__actions">
                  <span
                    className={`oop-line-receiving__badge oop-line-receiving__badge--${row.readinessTone}`}
                    title={row.badgeLabel}
                  >
                    {row.readinessLabel}
                  </span>
                  <button
                    type="button"
                    className={`oop-line-receive-btn oop-line-receive-btn--${action.variant}`}
                    disabled={action.disabled || saving}
                    onClick={() => void openReceiveModal(row)}
                  >
                    {action.label}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <QuickLineReceiveModal
        open={Boolean(activeLine)}
        line={activeLine}
        suppliers={suppliers}
        saving={saving}
        error={formError}
        onClose={() => {
          setActiveLine(null)
          setFormError(null)
        }}
        onSubmit={handleQuickSubmit}
      />
    </>
  )
}
