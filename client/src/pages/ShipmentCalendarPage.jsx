import { useEffect } from 'react'

/**
 * @deprecated ShipmentOperationsPage haftalık sekmesi kullanın.
 * @param {{ onRedirect?: () => void }} props
 */
export default function ShipmentCalendarPage({ onRedirect }) {
  useEffect(() => {
    onRedirect?.()
  }, [onRedirect])
  return null
}
