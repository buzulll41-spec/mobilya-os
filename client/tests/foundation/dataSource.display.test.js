import { afterEach, describe, expect, it, vi } from 'vitest'
import { getApiBaseUrl, getDataSourceDisplay } from '../../src/config/dataSource.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getDataSourceDisplay', () => {
  it('mock modunda etiket döner', () => {
    const prev = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = ''
    expect(getDataSourceDisplay()).toMatchObject({ mode: 'mock', label: 'Mock veri' })
    import.meta.env.VITE_API_BASE_URL = prev
  })

  it('API modunda taban URL ile etiket döner', () => {
    const prev = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:4000'
    expect(getDataSourceDisplay()).toMatchObject({
      mode: 'api',
      label: 'Demo + API: http://localhost:4000',
      apiBase: 'http://localhost:4000',
    })
    import.meta.env.VITE_API_BASE_URL = prev
  })

  it('LAN origin üzerinde localhost API base mevcut hosta çözülür', () => {
    const prev = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:4000'
    vi.stubGlobal('window', {
      location: {
        origin: 'http://192.168.1.5:5173',
        hostname: '192.168.1.5',
      },
    })

    expect(getApiBaseUrl()).toBe('http://192.168.1.5:4000/')
    expect(getDataSourceDisplay()).toMatchObject({
      mode: 'api',
      label: 'Demo + API: http://192.168.1.5:4000/',
      apiBase: 'http://192.168.1.5:4000/',
    })

    import.meta.env.VITE_API_BASE_URL = prev
  })

  it('localhost origin üzerinde localhost API base korunur', () => {
    const prev = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:4000'
    vi.stubGlobal('window', {
      location: {
        origin: 'http://localhost:5173',
        hostname: 'localhost',
      },
    })

    expect(getApiBaseUrl()).toBe('http://localhost:4000/')

    import.meta.env.VITE_API_BASE_URL = prev
  })
})
