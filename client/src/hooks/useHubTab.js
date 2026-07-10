import { useCallback, useEffect, useState } from 'react'
import { buildHubHash, HUB_PAGE_ALIASES, parseHashRoute } from '../lib/hubRouting.js'

/**
 * @param {string} hubPageId
 * @param {string} defaultTab
 * @param {readonly string[]} validTabs
 */
export function useHubTab(hubPageId, defaultTab, validTabs) {
  const resolveTab = useCallback(
    /** @param {string | null} raw */
    (raw) => {
      if (raw && validTabs.includes(raw)) return raw
      return defaultTab
    },
    [defaultTab, validTabs],
  )

  const readTabFromHash = useCallback(() => {
    const { pageId, tab: raw } = parseHashRoute(window.location.hash)
    const alias = HUB_PAGE_ALIASES[pageId]
    if (alias?.hub === hubPageId) return resolveTab(raw ?? alias.tab)
    return resolveTab(raw)
  }, [hubPageId, resolveTab])

  const [tab, setTab] = useState(() => readTabFromHash())

  useEffect(() => {
    function syncFromHash() {
      setTab(readTabFromHash())
    }
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [readTabFromHash])

  const setHubTab = useCallback(
    /** @param {string} next */
    (next) => {
      const resolved = resolveTab(next)
      setTab(resolved)
      window.history.replaceState(null, '', buildHubHash(hubPageId, resolved))
    },
    [hubPageId, resolveTab],
  )

  return [tab, setHubTab]
}
