import { useEffect, useState } from 'react'

/**
 * @template T
 * @param {T} value
 * @param {number} [delayMs=300]
 * @returns {T}
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
