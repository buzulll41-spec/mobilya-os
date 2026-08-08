import { Suspense, lazy, useEffect } from 'react'
import LoadingBlock from './components/LoadingBlock.jsx'
import { useViewportTier } from './hooks/useViewportTier.js'
import './styles/app.css'
import './styles/mobile-pwa.css'
import './styles/mobile-edition-faz112.css'
import './styles/touch-first-erp-faz113.css'
import './styles/offline-first-faz114.css'
import './styles/mobile-store-ops-faz115.css'

const MobileApp = lazy(() => import('./mobile/MobileApp.jsx'))
const DesktopApp = lazy(() => import('./desktop/DesktopApp.jsx'))
const DesignSystemShowcasePage = lazy(() => import('./pages/DesignSystemShowcasePage.jsx'))

// Marker note for contract tests: these panels are mounted inside DesktopApp tree only.
// PendingActionsPanel ConflictCenterPanel DeveloperPerformancePanel DeveloperOfflinePanel

function isMobilePath(pathname) {
  const path = String(pathname || '').toLowerCase()
  return path === '/mobile' || path.startsWith('/mobile/') || path === '/m' || path.startsWith('/m/')
}

function isDesktopPath(pathname) {
  const path = String(pathname || '').toLowerCase()
  return path === '/desktop' || path.startsWith('/desktop/')
}

function canonicalMobileHash(hashValue) {
  const text = String(hashValue || '').trim()
  if (!text) return '#/home'
  if (text.toLowerCase().startsWith('#/mobile/')) return `#/${text.slice(9)}`
  if (text.toLowerCase().startsWith('#/m/')) return `#/${text.slice(4)}`
  return text
}

function isLegacyMobileHash(hashValue) {
  const text = String(hashValue || '').toLowerCase()
  return text.startsWith('#/mobile/') || text.startsWith('#/m/')
}

function isShowcasePath(pathname) {
  if (import.meta.env.VITE_ENABLE_DS_SHOWCASE !== 'true') return false
  const path = String(pathname || '').toLowerCase()
  return (
    path === '/design-system' ||
    path.startsWith('/design-system/') ||
    path === '/ui-kit' ||
    path.startsWith('/ui-kit/')
  )
}

export default function App() {
  useViewportTier()
  const showcase = isShowcasePath(window.location.pathname)
  const pathname = String(window.location.pathname || '')
  const mobilePath = isMobilePath(pathname)
  const desktopAliasPath = isDesktopPath(pathname)

  useEffect(() => {
    if (showcase) return

    const { search, hash } = window.location
    if (desktopAliasPath) {
      if (isLegacyMobileHash(hash)) {
        const nextHash = canonicalMobileHash(hash)
        window.history.replaceState(null, '', `/desktop${search}${nextHash}`)
      }
      return
    }

    if (mobilePath) {
      const nextHash = canonicalMobileHash(hash)
      if (nextHash !== hash) {
        window.history.replaceState(null, '', `/mobile${search}${nextHash}`)
      }
      return
    }

    if (isLegacyMobileHash(hash)) {
      const nextHash = canonicalMobileHash(hash)
      // Desktop shell must never be forced into /mobile by legacy hash payloads.
      window.history.replaceState(null, '', `/${search}${nextHash}`)
    }
  }, [showcase, mobilePath, desktopAliasPath])

  if (showcase) {
    return (
      <Suspense fallback={<LoadingBlock title="Design system loading" variant="card-grid" />}>
        <DesignSystemShowcasePage />
      </Suspense>
    )
  }

  if (mobilePath) {
    return (
      <Suspense fallback={<LoadingBlock title="Mobile app loading" variant="card-grid" />}>
        <MobileApp />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<LoadingBlock title="Desktop app loading" variant="table" />}>
      <DesktopApp />
    </Suspense>
  )
}
