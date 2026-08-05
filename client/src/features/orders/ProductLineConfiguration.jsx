import {
  formatConfigurationLines,
  getFieldsForContext,
  getProfileLabelForContext,
  isFabricProduct,
  patchLineConfiguration,
  patchPillowRows,
  resolveConfigurationProfile,
} from '../../constants/productConfigurationSchema.js'
import ConfigurationPillowRows from './ConfigurationPillowRows.jsx'

/**
 * @typedef {import('../../constants/productConfigurationSchema.js').LineConfiguration} LineConfiguration
 * @typedef {import('../../constants/productConfigurationSchema.js').ConfigurationContext} ConfigurationContext
 */

/**
 * @param {{
 *   ctx: ConfigurationContext
 *   productTitle?: string
 *   configuration: LineConfiguration | undefined
 *   onChange: (configuration: LineConfiguration) => void
 *   disabled?: boolean
 *   warnings?: string[]
 *   errors?: string[]
 * }} props
 */
export default function ProductLineConfiguration({
  ctx,
  productTitle,
  configuration = {},
  onChange,
  disabled = false,
  warnings = [],
  errors = [],
}) {
  const profileId = resolveConfigurationProfile(ctx)
  const profileLabel = getProfileLabelForContext(ctx)
  const fields = getFieldsForContext(ctx)
  const showPillows = profileId === 'fabric' && isFabricProduct(ctx)
  const summaryLines = formatConfigurationLines(ctx, configuration)
  const factoryPreview = productTitle ? [productTitle, ...summaryLines] : summaryLines

  const scalarFields = fields.filter(
    (f) => f.key !== 'pillowFabric' && f.key !== 'lumbarPillow',
  )

  return (
    <div className="plc-config" aria-label="Üretim konfigürasyonu">
      <div className="plc-config__head">
        <div className="plc-config__head-text">
          <span className="plc-config__title">Fabrika sipariş detayı</span>
          <span className="plc-config__profile">{profileLabel}</span>
        </div>
      </div>

      <div className="plc-config__sections">
        {scalarFields.length > 0 ? (
          <section className="plc-config__section" aria-labelledby="plc-scalar">
            <h4 id="plc-scalar" className="plc-config__section-title">
              Temel bilgiler
            </h4>
            <div className="plc-config__grid">
              {scalarFields.map((field) => {
                const raw = configuration[field.key]
                const value = typeof raw === 'string' ? raw : ''
                const isRequired = Boolean(field.required)
                return (
                  <label
                    key={field.key}
                    className={`plc-config__field${isRequired ? ' plc-config__field--required' : ''}`}
                  >
                    <span className="plc-config__label">{field.label}</span>
                    {field.type === 'select' ? (
                      <select
                        className="plc-config__input"
                        value={value}
                        disabled={disabled}
                        onChange={(e) =>
                          onChange(patchLineConfiguration(ctx, configuration, field.key, e.target.value))
                        }
                      >
                        <option value="">Seçin</option>
                        {(field.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="plc-config__input"
                        value={value}
                        disabled={disabled}
                        placeholder={field.label}
                        onChange={(e) =>
                          onChange(patchLineConfiguration(ctx, configuration, field.key, e.target.value))
                        }
                      />
                    )}
                  </label>
                )
              })}
            </div>
          </section>
        ) : null}

        {showPillows ? (
          <section className="plc-config__section" aria-labelledby="plc-pillows">
            <h4 id="plc-pillows" className="plc-config__section-title">
              Kırlent & bel kırlenti
            </h4>
            <ConfigurationPillowRows
              sectionKey="pillows"
              title="Kırlentler"
              rows={configuration.pillows ?? []}
              disabled={disabled}
              addLabel="+ Kırlent ekle"
              onChange={(rows) => onChange(patchPillowRows(configuration, 'pillows', rows))}
            />
            <ConfigurationPillowRows
              sectionKey="lumbar"
              className="plc-pillows--lumbar"
              title="Bel kırlentleri"
              rows={configuration.lumbarPillows ?? []}
              disabled={disabled}
              addLabel="+ Bel kırlenti ekle"
              onChange={(rows) => onChange(patchPillowRows(configuration, 'lumbarPillows', rows))}
            />
          </section>
        ) : null}
      </div>

      {factoryPreview.length > 0 ? (
        <div className="plc-config__preview" aria-label="Fabrikaya gönderilecek özet">
          <span className="plc-config__preview-title">Kopyalanabilir özet</span>
          <pre className="plc-config__preview-body">{factoryPreview.join('\n')}</pre>
        </div>
      ) : null}

      {errors.length > 0 ? (
        <ul className="plc-config__errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="plc-config__warnings" role="status">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
