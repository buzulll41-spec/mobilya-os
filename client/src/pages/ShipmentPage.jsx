import { useEffect } from 'react'

/**
 * @deprecated ShipmentOperationsPage kullanın. App yönlendirmesi için tutuldu.
 * @param {{ onRedirect?: () => void }} props
 */
export default function ShipmentPage({ onRedirect }) {
  useEffect(() => {
    onRedirect?.()
  }, [onRedirect])
  return null
}
