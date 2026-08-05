import { useMemo, useState } from 'react'
import { SUPPLY_CHANNEL } from '../../constants/supplyOrderStatus.js'
import {
  buildSupplyMailContent,
  buildSupplyWhatsAppMessage,
  formatSupplyLineBlock,
  openSupplyMailLink,
  openSupplyWhatsAppLink,
} from '../../mappers/supply/supplyOrderMessages.js'
import { confirmOrderLineSupplySent } from '../../services/supplyOrderClient.js'
import { formatSupplyConfirmError } from '../../utils/apiErrorMessage.js'
import '../../styles/supply-send-modal.css'

/** @typedef {'MAIL' | 'WHATSAPP'} SupplyChannelWire */
/** @typedef {import('../../mappers/supply/supplyOrderMessages.js').SupplyOrderLineDetail} SupplyOrderLineDetail */

/**
 * @param {{
 *   open: boolean
 *   orderId: string
 *   orderNumber: string
 *   supplyLines: SupplyOrderLineDetail[]
 *   lineIds: string[]
 *   onClose: () => void
 *   onConfirmed: () => void
 * }} props
 */
export default function SupplySendModal({
  open,
  orderId,
  orderNumber,
  supplyLines,
  lineIds,
  onClose,
  onConfirmed,
}) {
  const [channel, setChannel] = useState(/** @type {SupplyChannelWire} */ ('WHATSAPP'))
  const [confirmStep, setConfirmStep] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const preview = useMemo(() => {
    if (channel === SUPPLY_CHANNEL.MAIL) {
      return buildSupplyMailContent(orderNumber, supplyLines)
    }
    return buildSupplyWhatsAppMessage(orderNumber, supplyLines)
  }, [channel, orderNumber, supplyLines])

  if (!open) return null

  function handleOpenExternal() {
    setError(null)
    if (channel === SUPPLY_CHANNEL.MAIL) {
      openSupplyMailLink(/** @type {{ subject: string, body: string }} */ (preview))
    } else {
      openSupplyWhatsAppLink(String(preview))
    }
    setConfirmStep(true)
  }

  async function handleConfirmSent() {
    setSaving(true)
    setError(null)
    try {
      await confirmOrderLineSupplySent(orderId, { lineIds, channel })
      onConfirmed()
      onClose()
      setConfirmStep(false)
    } catch (e) {
      setError(formatSupplyConfirmError(e))
    } finally {
      setSaving(false)
    }
  }

  function handleCancelConfirm() {
    setConfirmStep(false)
  }

  return (
    <div className="supply-send-modal__backdrop" role="presentation" onClick={onClose}>
      <div
        className="supply-send-modal"
        role="dialog"
        aria-labelledby="supply-send-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="supply-send-modal__head">
          <h2 id="supply-send-title">Sipariş Ver</h2>
          <p className="supply-send-modal__sub">
            Sipariş No: {orderNumber} · {lineIds.length} ürün
          </p>
        </header>

        {!confirmStep ? (
          <>
            <fieldset className="supply-send-modal__channels">
              <legend>Gönderim kanalı</legend>
              <label>
                <input
                  type="radio"
                  name="supply-channel"
                  checked={channel === SUPPLY_CHANNEL.MAIL}
                  onChange={() => setChannel(SUPPLY_CHANNEL.MAIL)}
                />
                E-Posta
              </label>
              <label>
                <input
                  type="radio"
                  name="supply-channel"
                  checked={channel === SUPPLY_CHANNEL.WHATSAPP}
                  onChange={() => setChannel(SUPPLY_CHANNEL.WHATSAPP)}
                />
                WhatsApp
              </label>
            </fieldset>

            <div className="supply-send-modal__preview">
              <p className="supply-send-modal__preview-label">Mesaj önizleme</p>
              {channel === SUPPLY_CHANNEL.MAIL ? (
                <>
                  <p>
                    <strong>Konu:</strong> {/** @type {{ subject: string }} */ (preview).subject}
                  </p>
                  <pre>{/** @type {{ body: string }} */ (preview).body}</pre>
                </>
              ) : (
                <pre>{String(preview)}</pre>
              )}
            </div>

            <ul className="supply-send-modal__lines">
              {supplyLines.map((line) => (
                <li key={`${line.title}-${line.qty}`}>
                  <pre className="supply-send-modal__line-detail">{formatSupplyLineBlock(line)}</pre>
                </li>
              ))}
            </ul>

            <footer className="supply-send-modal__actions">
              <button type="button" className="supply-send-modal__btn" onClick={onClose}>
                İptal
              </button>
              <button
                type="button"
                className="supply-send-modal__btn supply-send-modal__btn--primary"
                onClick={handleOpenExternal}
              >
                {channel === SUPPLY_CHANNEL.MAIL ? 'E-postayı aç' : 'WhatsApp aç'}
              </button>
            </footer>
          </>
        ) : (
          <>
            <p className="supply-send-modal__confirm-q">Sipariş gönderildi mi?</p>
            {error ? (
              <p className="supply-send-modal__error" role="alert">
                {error}
              </p>
            ) : null}
            <footer className="supply-send-modal__actions">
              <button
                type="button"
                className="supply-send-modal__btn"
                onClick={handleCancelConfirm}
                disabled={saving}
              >
                İptal
              </button>
              <button
                type="button"
                className="supply-send-modal__btn supply-send-modal__btn--primary"
                onClick={() => void handleConfirmSent()}
                disabled={saving}
              >
                {saving ? 'Kaydediliyor…' : 'Evet, gönderildi'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
