import { describe, expect, it } from 'vitest'
import { getDataSourceDisplay } from '../../src/config/dataSource.js'

describe('getDataSourceDisplay', () => {
  it('mock modunda etiket döner', () => {
    const prev = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = ''
    expect(getDataSourceDisplay()).toEqual({ mode: 'mock', label: 'Mock veri' })
    import.meta.env.VITE_API_BASE_URL = prev
  })

  it('API modunda taban URL ile etiket döner', () => {
    const prev = import.meta.env.VITE_API_BASE_URL
    import.meta.env.VITE_API_BASE_URL = 'http://localhost:4000'
    expect(getDataSourceDisplay()).toEqual({
      mode: 'api',
      label: 'Canlı API: http://localhost:4000',
      apiBase: 'http://localhost:4000',
    })
    import.meta.env.VITE_API_BASE_URL = prev
  })
})
