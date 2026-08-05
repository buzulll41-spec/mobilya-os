import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import { IconSearch } from './Icons.jsx'
import {
  buildGlobalSearchResults,
  globalSearchKindLabel,
  pushRecentSearch,
  readRecentSearches,
} from '../utils/globalSearchExperience.js'

/**
 * @typedef {import('../utils/globalSearchExperience.js').GlobalSearchResult} GlobalSearchResult
 */

/**
 * @param {{
 *   value: string
 *   onChange: (v: string) => void
 *   orders?: import('../data/seedOrders.js').Order[]
 *   onSelectResult?: (result: GlobalSearchResult) => void
 *   onCommitSearch?: (query: string, results: GlobalSearchResult[]) => void
 *   placeholder?: string
 *   className?: string
 * }} props
 */
function GlobalSearchInput({
  value,
  onChange,
  orders = [],
  onSelectResult,
  onCommitSearch,
  placeholder = 'Sipariş, müşteri, telefon, ürün veya sipariş no…',
  className = '',
}) {
  const listId = useId()
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [recent, setRecent] = useState(readRecentSearches)

  const results = buildGlobalSearchResults({ orders, query: value })
  const showPanel = open && (value.trim().length > 0 || recent.length > 0)
  const flatItems = value.trim()
    ? results
    : recent.map((q) => ({
        id: `recent-${q}`,
        kind: /** @type {const} */ ('order'),
        title: q,
        meta: 'Son arama',
        targetPage: 'orders',
        query: q,
      }))

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const commitSearch = useCallback(
    (q) => {
      const trimmed = q.trim()
      if (!trimmed) return
      pushRecentSearch(trimmed)
      setRecent(readRecentSearches())
      onChange(trimmed)
    },
    [onChange],
  )

  const handleSelect = useCallback(
    (item) => {
      if (item.meta === 'Son arama') {
        commitSearch(item.title)
        setOpen(false)
        return
      }
      pushRecentSearch(value.trim() || item.title)
      setRecent(readRecentSearches())
      onSelectResult?.(item)
      setOpen(false)
    },
    [commitSearch, onSelectResult, value],
  )

  const onKeyDown = (e) => {
    if (!showPanel && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!flatItems.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(flatItems.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0) {
        handleSelect(flatItems[activeIdx])
        return
      }
      const q = value.trim()
      if (!q) return
      if (results.length > 0) {
        handleSelect(results[0])
        return
      }
      commitSearch(q)
      onCommitSearch?.(q, results)
      setOpen(false)
    }
  }

  return (
    <div className={`mos-global-search-wrap ${className}`.trim()} ref={wrapRef}>
      <div className="mos-global-search">
        <span className="mos-global-search-icon" aria-hidden>
          <IconSearch />
        </span>
        <input
          type="search"
          className="mos-global-search-input"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setActiveIdx(-1)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-label="Genel arama"
          aria-expanded={showPanel}
          aria-controls={showPanel ? listId : undefined}
          aria-autocomplete="list"
          role="combobox"
        />
        {value ? (
          <button
            type="button"
            className="mos-global-search-clear"
            onClick={() => {
              onChange('')
              setActiveIdx(-1)
            }}
            aria-label="Aramayı temizle"
          >
            ×
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="mos-global-search-panel" id={listId} role="listbox" aria-label="Arama sonuçları">
          <div className="mos-global-search-section">
            <div className="mos-global-search-section-label">
              {value.trim() ? 'Sonuçlar' : 'Son aramalar'}
            </div>
            {flatItems.length === 0 ? (
              <p className="mos-global-search-result__meta" style={{ padding: '0.55rem 0.65rem' }}>
                Sonuç bulunamadı
              </p>
            ) : (
              flatItems.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={idx === activeIdx}
                  className={`mos-global-search-result${idx === activeIdx ? ' mos-global-search-result--active' : ''}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => handleSelect(item)}
                >
                  <span className="mos-global-search-result__title">{item.title}</span>
                  <span className="mos-global-search-result__meta">{item.meta}</span>
                  {item.meta !== 'Son arama' ? (
                    <span className={`mos-global-search-result__badge mos-global-search-result__badge--${item.kind}`}>
                      {globalSearchKindLabel(item.kind)}
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default memo(GlobalSearchInput)
