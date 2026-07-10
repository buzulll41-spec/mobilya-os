import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import { OrdersProvider } from './state/OrdersProvider.jsx'
import { AuthProvider } from './state/AuthProvider.jsx'
import { OrderDrawerProvider } from './state/OrderDrawerProvider.jsx'
import { ShipmentPlansProvider } from './hooks/useShipmentPlans.jsx'
import { NetworkStatusProvider } from './state/NetworkStatusProvider.jsx'
import { OfflineFirstProvider } from './state/OfflineFirstProvider.jsx'
import { ToastProvider } from './state/ToastProvider.jsx'
import { dismissSplashScreen, registerServiceWorker } from './pwa/registerServiceWorker.js'

registerServiceWorker()

createRoot(document.getElementById('root')).render(
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

dismissSplashScreen(document.getElementById('mos-splash'))
