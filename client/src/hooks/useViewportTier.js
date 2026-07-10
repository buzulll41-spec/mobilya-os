import { useEffect, useState } from 'react'
import { MOBILE_BREAKPOINTS } from '../contracts/v1/mobilePwa.js'

/** @returns {boolean} */
export function isMobileViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINTS.PHONE_MAX}px)`).matches
}

/** @returns {boolean} */
export function isTabletViewport() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(
    `(min-width: ${MOBILE_BREAKPOINTS.TABLET_MIN}px) and (max-width: ${MOBILE_BREAKPOINTS.TABLET_MAX}px)`,
  ).matches
}

/** @returns {'phone' | 'tablet' | 'laptop' | 'desktop'} */
export function resolveViewportTier() {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w <= MOBILE_BREAKPOINTS.PHONE_MAX) return 'phone'
  if (w <= MOBILE_BREAKPOINTS.TABLET_MAX) return 'tablet'
  if (w < MOBILE_BREAKPOINTS.DESKTOP_MIN) return 'laptop'
  return 'desktop'
}

/** @returns {'phone' | 'tablet' | 'laptop' | 'desktop'} */
export function useViewportTier() {
  const [tier, setTier] = useState(resolveViewportTier)

  useEffect(() => {
    function sync() {
      setTier(resolveViewportTier())
    }
    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return tier
}
