import { useCallback, useEffect, useState } from 'react'
import { getApiBaseUrl } from '../config/dataSource.js'
import { BUILD_STATUS } from '../constants/buildStatus.js'

/**
 * @typedef {'connected' | 'disconnected' | 'mock' | 'checking'} ConnectionState
 */

/**
 * @typedef {Object} BuildStatusSnapshot
 * @property {typeof BUILD_STATUS} build
 * @property {ConnectionState} api
 * @property {ConnectionState} database
 */

const POLL_MS = 30_000

/**
 * @returns {BuildStatusSnapshot}
 */
function initialSnapshot() {
  const apiBase = getApiBaseUrl()
  return {
    build: BUILD_STATUS,
    api: apiBase ? 'checking' : 'mock',
    database: apiBase ? 'checking' : 'mock',
  }
}

/** @returns {Promise<{ api: ConnectionState; database: ConnectionState }>} */
async function probeConnections() {
  const apiBase = getApiBaseUrl()
  if (!apiBase) {
    return { api: 'mock', database: 'mock' }
  }

  try {
    const url = `${apiBase.replace(/\/+$/, '')}/health`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      return { api: 'disconnected', database: 'disconnected' }
    }
    const body = await res.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return { api: 'disconnected', database: 'disconnected' }
    }
    const dbUp = /** @type {{ database?: string }} */ (body).database === 'up'
    return {
      api: 'connected',
      database: dbUp ? 'connected' : 'disconnected',
    }
  } catch {
    return { api: 'disconnected', database: 'disconnected' }
  }
}

/** @returns {BuildStatusSnapshot} */
export function useBuildStatus() {
  const [snapshot, setSnapshot] = useState(initialSnapshot)

  const refresh = useCallback(async () => {
    const connections = await probeConnections()
    setSnapshot((prev) => ({ ...prev, ...connections }))
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(id)
  }, [refresh])

  return snapshot
}
