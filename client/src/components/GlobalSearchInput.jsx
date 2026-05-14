import { IconSearch } from './Icons.jsx'

/**
 * @param {{
 *   value: string
 *   onChange: (v: string) => void
 *   placeholder?: string
 *   className?: string
 * }} props
 */
export default function GlobalSearchInput({
  value,
  onChange,
  placeholder = 'Sipariş, müşteri veya ürün ara…',
  className = '',
}) {
  return (
    <div className={`mos-global-search ${className}`.trim()}>
      <span className="mos-global-search-icon" aria-hidden>
        <IconSearch />
      </span>
      <input
        type="search"
        className="mos-global-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-label="Genel arama"
      />
      {value ? (
        <button
          type="button"
          className="mos-global-search-clear"
          onClick={() => onChange('')}
          aria-label="Aramayı temizle"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}
