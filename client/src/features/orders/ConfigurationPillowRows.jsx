/**
 * @typedef {import('../../constants/productConfigurationSchema.js').PillowRow} PillowRow
 */

/**
 * @param {{
 *   title: string
 *   sectionKey: string
 *   className?: string
 *   rows: PillowRow[]
 *   disabled?: boolean
 *   onChange: (rows: PillowRow[]) => void
 *   addLabel: string
 * }} props
 */
export default function ConfigurationPillowRows({
  title,
  sectionKey,
  className = '',
  rows,
  disabled = false,
  onChange,
  addLabel,
}) {
  function patchRow(index, patch) {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    onChange(next)
  }

  function addRow() {
    onChange([...rows, { fabric: '', qty: 1 }])
  }

  function removeRow(index) {
    onChange(rows.filter((_, i) => i !== index))
  }

  return (
    <div className="plc-pillows">
      <div className="plc-pillows__head">
        <span className="plc-pillows__title">{title}</span>
        <button type="button" className="plc-pillows__add" disabled={disabled} onClick={addRow}>
          {addLabel}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="plc-pillows__empty">Henüz satır yok — ekleyin.</p>
      ) : (
        <ul className="plc-pillows__list">
          {rows.map((row, index) => (
            <li key={`${sectionKey}-${index}`} className="plc-pillows__row">
              <label className="plc-pillows__field">
                <span className="plc-pillows__label">Kumaş</span>
                <input
                  type="text"
                  className="plc-config__input"
                  name={`cfg-${sectionKey}-${index}-fabric`}
                  autoComplete="off"
                  value={row.fabric}
                  disabled={disabled}
                  placeholder="Kumaş kodu"
                  onChange={(e) => patchRow(index, { fabric: e.target.value })}
                />
              </label>
              <label className="plc-pillows__field plc-pillows__field--qty">
                <span className="plc-pillows__label">Adet</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="plc-config__input"
                  value={row.qty}
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Number.parseInt(e.target.value, 10)
                    patchRow(index, { qty: Number.isFinite(n) && n > 0 ? n : 1 })
                  }}
                />
              </label>
              <button
                type="button"
                className="plc-pillows__remove"
                disabled={disabled}
                aria-label="Satırı sil"
                onClick={() => removeRow(index)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
