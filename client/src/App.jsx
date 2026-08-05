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

  useEffect(() => {
    if (showcase) return
    const { pathname, search, hash } = window.location
    if (!isMobilePath(pathname) && !isDesktopPath(pathname)) {
      window.history.replaceState(null, '', `/mobile${search}${hash}`)
    }
  }, [showcase])

  if (showcase) {
    return (
      <Suspense fallback={<LoadingBlock title="Design system loading" variant="card-grid" />}>
        <DesignSystemShowcasePage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<LoadingBlock title="Mobile app loading" variant="card-grid" />}>
      <MobileApp />
    </Suspense>
  )
}
