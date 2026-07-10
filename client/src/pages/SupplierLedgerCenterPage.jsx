import { useEffect } from 'react'
import SupplyIncomingPage from './SupplyIncomingPage.jsx'

/** @deprecated Tedarikçi cari, Tedarik & Gelen Ürün ekranına taşındı. */
export default function SupplierLedgerCenterPage() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash.includes('supplier-ledger-center')) {
      window.history.replaceState(null, '', '#/supply-incoming?tab=cari')
    }
  }, [])

  return <SupplyIncomingPage />
}
