import { createContext, useContext, useEffect, useMemo, useState } from 'react'

/**
 * @typedef {Object} NetworkStatusValue
 * @property {boolean} online
 * @property {boolean} wasOffline
 * @property {() => void} clearWasOffline
 */

/** @type {import('react').Context<NetworkStatusValue | null>} */
const NetworkStatusContext = createContext(null)

/** @param {{ children: import('react').ReactNode }} props */
export function NetworkStatusProvider({ children }) {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
    }
    const onOffline = () => {
      setOnline(false)
      setWasOffline(true)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const value = useMemo(
    () => ({
      online,
      wasOffline,
      clearWasOffline: () => setWasOffline(false),
    }),
    [online, wasOffline],
  )

  return <NetworkStatusContext.Provider value={value}>{children}</NetworkStatusContext.Provider>
}

export function useNetworkStatus() {
  const ctx = useContext(NetworkStatusContext)
  if (!ctx) {
    throw new Error('useNetworkStatus: NetworkStatusProvider eksik (main.jsx).')
  }
  return ctx
}
