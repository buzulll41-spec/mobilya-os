import { useEffect, useState } from 'react'
import { MOBILE_BREAKPOINTS } from '../contracts/v1/mobilePwa.js'

/** @returns {'phone' | 'desktop' | null} */
function resolveRouteTierOverride() {
  if (typeof window === 'undefined') return null
  const path = String(window.location.pathname || '').toLowerCase()
  if (path === '/desktop' || path.startsWith('/desktop/')) return 'desktop'
  if (path === '/mobile' || path.startsWith('/mobile/') || path === '/m' || path.startsWith('/m/')) {
    return 'phone'
  }
  return null
}

/** @returns {boolean} */
export function isMobileViewport() {
  if (typeof window === 'undefined') return false
  const routeTier = resolveRouteTierOverride()
  if (routeTier === 'desktop') return false
  if (routeTier === 'phone') return true
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINTS.PHONE_MAX}px)`).matches
}

/** @returns {boolean} */
export function isTabletViewport() {
  if (typeof window === 'undefined') return false
  const routeTier = resolveRouteTierOverride()
  if (routeTier) return false
  return window.matchMedia(
    `(min-width: ${MOBILE_BREAKPOINTS.TABLET_MIN}px) and (max-width: ${MOBILE_BREAKPOINTS.TABLET_MAX}px)`,
  ).matches
}

/** @returns {'phone' | 'tablet' | 'desktop'} */
export function resolveViewportTier() {
  if (typeof window === 'undefined') return 'desktop'
  const routeTier = resolveRouteTierOverride()
  if (routeTier) return routeTier
  const w = window.innerWidth
  if (w <= MOBILE_BREAKPOINTS.PHONE_MAX) return 'phone'
  if (w <= MOBILE_BREAKPOINTS.TABLET_MAX) return 'tablet'
  return 'desktop'
}

/** @returns {'phone' | 'tablet' | 'desktop'} */
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

/** @returns {boolean} */
export function isCompactPhoneViewport() {
  if (typeof window === 'undefined') return false
  const routeTier = resolveRouteTierOverride()
  if (routeTier === 'desktop') return false
  if (routeTier === 'phone') return true
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINTS.COMPACT_PHONE_MAX}px)`).matches
}

/** @returns {boolean} */
export function useCompactPhoneViewport() {
  const [isCompactPhone, setIsCompactPhone] = useState(isCompactPhoneViewport)

  useEffect(() => {
    function sync() {
      setIsCompactPhone(isCompactPhoneViewport())
    }

    sync()
    window.addEventListener('resize', sync)
    return () => window.removeEventListener('resize', sync)
  }, [])

  return isCompactPhone
}
