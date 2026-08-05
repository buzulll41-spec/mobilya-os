import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/design-system.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import ProductionShieldScreen from './components/ProductionShieldScreen.jsx'
import { OrdersProvider } from './state/OrdersProvider.jsx'
import { AuthProvider } from './state/AuthProvider.jsx'
import { OrderDrawerProvider } from './state/OrderDrawerProvider.jsx'
import { ShipmentPlansProvider } from './hooks/useShipmentPlans.jsx'
import { NetworkStatusProvider } from './state/NetworkStatusProvider.jsx'
import { OfflineFirstProvider } from './state/OfflineFirstProvider.jsx'
import { ToastProvider } from './state/ToastProvider.jsx'
import { dismissSplashScreen, registerServiceWorker } from './pwa/registerServiceWorker.js'
import { evaluateProductionShield, logProductionShield } from './config/productionShield.js'
import { getApiBaseUrl } from './config/dataSource.js'

async function probeBackendAvailability() {
  const apiBase = getApiBaseUrl()
  if (!apiBase) {
    window.__MOBILYA_BACKEND_AVAILABLE__ = false
    return
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(`${apiBase.replace(/\/+$/, '')}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    window.__MOBILYA_BACKEND_AVAILABLE__ = res.ok
  } catch {
    window.__MOBILYA_BACKEND_AVAILABLE__ = false
  } finally {
    window.clearTimeout(timer)
  }
}

const root = createRoot(document.getElementById('root'))

function renderApp() {
  root.render(
    <StrictMode>
      <AppErrorBoundary>
        <NetworkStatusProvider>
          <OfflineFirstProvider>
            <ToastProvider>
              <AuthProvider>
                <OrdersProvider>
                  <OrderDrawerProvider>
                    <ShipmentPlansProvider>
                      <App />
                    </ShipmentPlansProvider>
                  </OrderDrawerProvider>
                </OrdersProvider>
              </AuthProvider>
            </ToastProvider>
          </OfflineFirstProvider>
        </NetworkStatusProvider>
      </AppErrorBoundary>
    </StrictMode>,
  )
}

function renderShieldError() {
  root.render(
    <StrictMode>
      <ProductionShieldScreen onRetry={boot} />
    </StrictMode>,
  )
}

async function boot() {
  if ((import.meta.env.VITE_APP_MODE ?? '').toLowerCase() === 'auto') {
    await probeBackendAvailability()
  }

  const shield = evaluateProductionShield()

  if (!shield.ok) {
    // Production yanlış yapılandırılmış → fail-closed. Mock fallback YOK, SW kaydı YOK.
    logProductionShield(shield)
    renderShieldError()
    // Splash'ı kaldır ki hata ekranı görünsün.
    dismissSplashScreen(document.getElementById('mos-splash'))
    return
  }

  // Ok-path: mevcut davranış birebir korunur (register → render → splash dismiss).
  registerServiceWorker()
  renderApp()
  dismissSplashScreen(document.getElementById('mos-splash'))
}

void boot()
