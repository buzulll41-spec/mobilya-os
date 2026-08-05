import { useCallback, useEffect, useState } from 'react'

const STORAGE_PREFIX = 'mos-pro-filter-'

/**
 * Anında filtre + son kullanılan filtre hafızası.
 * @template T
 * @param {string} scopeKey
 * @param {T} defaultValue
 */
export function useSmartFilter(scopeKey, defaultValue) {
  const storageKey = `${STORAGE_PREFIX}${scopeKey}`

  const [value, setValueState] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw == null) return defaultValue
      return /** @type {T} */ (JSON.parse(raw))
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [storageKey, value])

  /** @param {T | ((prev: T) => T)} next */
  const setValue = useCallback((next) => {
    setValueState((prev) => (typeof next === 'function' ? /** @type {(p: T) => T} */ (next)(prev) : next))
  }, [])

  const reset = useCallback(() => {
    setValueState(defaultValue)
  }, [defaultValue])

  return { value, setValue, reset }
}

/** @param {string} scopeKey */
export function readStoredFilter(scopeKey) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${scopeKey}`)
    return raw == null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}
