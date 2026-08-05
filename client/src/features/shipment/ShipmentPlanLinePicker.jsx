import { useEffect, useMemo, useState } from 'react'
import { findReceivingRiskViolations, parseQty } from '../../mappers/receiving/productReadiness.js'

/**
 * @param {ShipmentPlanLineDto[]} planLines
 */
function buildInitialPicks(planLines) {
  /** @type {Record<string, LinePickState>} */
  const initial = {}
  for (const line of planLines) {
    const shippable = parseQty(line.qtyShippable)
    const rem = parseQty(line.qtyRemaining)
    const defaultQty = Math.min(rem, shippable)
    const canSelect = line.selectable && defaultQty > 0.0001
    initial[line.orderLineId] = {
      checked: canSelect,
      qtyInput: canSelect ? String(defaultQty % 1 === 0 ? defaultQty : defaultQty.toFixed(2)) : '0',
    }
  }
  return initial
}

/** @typedef {import('../../mappers/shipment/computeShipmentPlanLines.js').ShipmentPlanLineDto} ShipmentPlanLineDto */

/**
 * @typedef {Object} LinePickState
 * @property {boolean} checked
 * @property {string} qtyInput
 */

/**
 * @param {{
 *   planLines: ShipmentPlanLineDto[]
 *   disabled?: boolean
 *   receivingRiskAccepted?: boolean
 *   onReceivingRiskAcceptedChange?: (accepted: boolean) => void
 *   onSelectionChange?: (rows: { orderLineId: string, qty: number }[]) => void
 * }} props
 */
export default function ShipmentPlanLinePicker({
  planLines,
  disabled = false,
  receivingRiskAccepted = false,
  onReceivingRiskAcceptedChange,
  onSelectionChange,
}) {
  const planSignature = useMemo(
    () =>
      planLines
        .map((l) => `${l.orderLineId}:${l.qtyRemaining}:${l.qtyShippable}:${l.selectable}`)
        .join('|'),
    [planLines],
  )
  const [syncSignature, setSyncSignature] = useState(planSignature)
  const [picks, setPicks] = useState(() => buildInitialPicks(planLines))

  if (syncSignature !== planSignature) {
    setSyncSignature(planSignature)
    setPicks(buildInitialPicks(planLines))
    onReceivingRiskAcceptedChange?.(false)
  }

  const selectedRows = useMemo(() => {
    /** @type {{ orderLineId: string, qty: number }[]} */
    const rows = []
    for (const line of planLines) {
      const pick = picks[line.orderLineId]
      if (!pick?.checked) continue
      const qty = Number.parseFloat(pick.qtyInput.replace(',', '.'))
      if (Number.isFinite(qty) && qty > 0) {
        rows.push({ orderLineId: line.orderLineId, qty })
      }
    }
    return rows
  }, [planLines, picks])

  useEffect(() => {
    onSelectionChange?.(selectedRows)
  }, [selectedRows, onSelectionChange])

  const notReceivedViolations = useMemo(() => {
    const all = findReceivingRiskViolations(planLines, selectedRows)
    return all.filter((v) => v.reason === 'not_received')
  }, [planLines, selectedRows])

  const showReceivingWarning = notReceivedViolations.length > 0 && !receivingRiskAccepted

  const summary = useMemo(() => {
    const count = selectedRows.length
    const units = selectedRows.reduce((s, r) => s + r.qty, 0)
    return { count, units }
  }, [selectedRows])

  if (!planLines.length) {
    return <p className="som-muted">Bu siparişte sevk edilecek ürün satırı yok.</p>
  }

  return (
    <div className="som-plan-lines">
      <div className="som-plan-lines__head">
        <h4 className="som-plan-lines__title">Sevk edilecek ürünler</h4>
        <span className="som-plan-lines__summary">
          {summary.count} kalem · {summary.units.toLocaleString('tr-TR')} adet
        </span>
      </div>

      {showReceivingWarning ? (
        <div className="som-receiving-warning" role="alert">
          <p className="som-receiving-warning__text">
            Bu ürün henüz fiziksel olarak gelmedi.
            {notReceivedViolations.length > 1
              ? ` (${notReceivedViolations.map((v) => v.title).join(', ')})`
              : notReceivedViolations[0]
                ? ` (${notReceivedViolations[0].title})`
                : ''}
          </p>
          <button
            type="button"
            className="som-btn som-btn--ghost som-btn--sm"
            onClick={() => onReceivingRiskAcceptedChange?.(true)}
          >
            Risk alarak devam et
          </button>
        </div>
      ) : null}

      <ul className="som-plan-lines__cards">
        {planLines.map((line) => {
          const pick = picks[line.orderLineId] ?? { checked: false, qtyInput: '0' }
          const shippable = parseQty(line.qtyShippable)
          const rem = parseQty(line.qtyRemaining)
          const received = parseQty(line.qtyReceived)
          const ordered = parseQty(line.qtyOrdered)
          const pending = parseQty(line.qtyPendingReceive)
          const rowDisabled = disabled || !line.selectable || shippable <= 0.0001
          const qtyNum = Number.parseFloat(pick.qtyInput.replace(',', '.'))
          const exceedsShippable = Number.isFinite(qtyNum) && qtyNum > shippable + 0.0001

          return (
            <li
              key={line.orderLineId}
              className={`som-plan-card som-plan-card--${line.readinessTone}${rowDisabled ? ' som-plan-card--off' : ''}`}
            >
              <div className="som-plan-card__head">
                <label className="som-plan-card__check">
                  <input
                    type="checkbox"
                    checked={pick.checked && !rowDisabled}
                    disabled={rowDisabled}
                    aria-label={`${line.title} seç`}
                    onChange={(e) => {
                      const checked = e.target.checked
                      if (checked && received <= 0.0001 && !receivingRiskAccepted) {
                        onReceivingRiskAcceptedChange?.(false)
                      }
                      const nextQty = checked ? Math.min(shippable, rem) : 0
                      setPicks((prev) => ({
                        ...prev,
                        [line.orderLineId]: {
                          checked,
                          qtyInput: checked
                            ? String(nextQty % 1 === 0 ? nextQty : nextQty.toFixed(2))
                            : '0',
                        },
                      }))
                    }}
                  />
                  <span className="som-plan-card__title">{line.title}</span>
                </label>
                <span className={`som-plan-card__badge som-plan-card__badge--${line.readinessTone}`}>
                  {line.readinessLabel}
                </span>
              </div>

              {line.configurationSummary?.length ? (
                <ul className="som-plan-card__config" aria-label="Üretim konfigürasyonu">
                  {line.configurationSummary.map((row) => (
                    <li key={row}>{row}</li>
                  ))}
                </ul>
              ) : null}

              <dl className="som-plan-card__stats">
                <div>
                  <dt>Sipariş</dt>
                  <dd>{ordered % 1 === 0 ? ordered : ordered.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Gelen</dt>
                  <dd>{received % 1 === 0 ? received : received.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Bekleyen</dt>
                  <dd>{pending % 1 === 0 ? pending : pending.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Sevke uygun</dt>
                  <dd>{shippable % 1 === 0 ? shippable : shippable.toFixed(2)}</dd>
                </div>
              </dl>

              {line.readyForShipmentHint ? (
                <p className="som-plan-card__hint">{line.readyForShipmentHint}</p>
              ) : null}

              <label className="som-plan-card__ship-field">
                <span className="som-plan-card__ship-label">Sevk edilecek</span>
                <input
                  type="number"
                  className={`som-input som-plan-lines__qty${exceedsShippable ? ' som-input--error' : ''}`}
                  min="0"
                  step="0.01"
                  max={shippable}
                  value={pick.qtyInput}
                  disabled={rowDisabled || !pick.checked}
                  onChange={(e) => {
                    onReceivingRiskAcceptedChange?.(false)
                    setPicks((prev) => ({
                      ...prev,
                      [line.orderLineId]: {
                        checked: true,
                        qtyInput: e.target.value,
                      },
                    }))
                  }}
                />
              </label>
              {exceedsShippable ? (
                <p className="som-plan-card__error">En fazla {line.qtyShippable} adet planlanabilir.</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
