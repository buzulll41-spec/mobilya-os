import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
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

function boot() {
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

boot()
