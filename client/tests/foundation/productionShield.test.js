import { afterEach, describe, expect, it, vi } from 'vitest'
import { evaluateProductionShield } from '../../src/config/productionShield.js'

// Dalga 0 — Production Shield: production DEPLOY'unda güvensiz veri kaynağı
// yapılandırmasını fail-closed olarak engeller. Guard cihaz-bağımsızdır (tek yol);
// demo/development davranışı DEĞİŞMEZ.

const RUNTIME_KEY = 'mobilya-os.runtime-mode'

afterEach(() => {
  vi.unstubAllEnvs()
  try {
    sessionStorage.removeItem(RUNTIME_KEY)
  } catch {
    /* ignore */
  }
})

describe('evaluateProductionShield', () => {
  it('senaryo 1: production + eksik API → engellenir (missing_api)', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', '')
    vi.stubEnv('VITE_ALLOW_RUNTIME_MODE', 'false')
    const r = evaluateProductionShield()
    expect(r.ok).toBe(false)
    expect(r.code).toBe('missing_api')
    expect(r.production).toBe(true)
  })

  it('senaryo 2: production + localhost API → engellenir (localhost_api)', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000')
    vi.stubEnv('VITE_ALLOW_RUNTIME_MODE', 'false')
    expect(evaluateProductionShield()).toMatchObject({ ok: false, code: 'localhost_api' })
  })

  it('senaryo 2b: production + 127.0.0.1 API → engellenir (localhost_api)', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', 'https://127.0.0.1:8443')
    vi.stubEnv('VITE_ALLOW_RUNTIME_MODE', 'false')
    expect(evaluateProductionShield()).toMatchObject({ ok: false, code: 'localhost_api' })
  })

  it('senaryo 3: production + runtime override bayrağı → engellenir (runtime_override)', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_ALLOW_RUNTIME_MODE', 'true')
    expect(evaluateProductionShield()).toMatchObject({ ok: false, code: 'runtime_override' })
  })

  it('senaryo 6: production + doğru API/config → readiness başarılı (ok)', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    vi.stubEnv('VITE_ALLOW_RUNTIME_MODE', 'false')
    expect(evaluateProductionShield()).toMatchObject({ ok: true, code: 'ok', production: true })
  })

  it('senaryo 6b: production + same-origin relative API ("/api") → izinli', () => {
    vi.stubEnv('VITE_APP_MODE', 'production')
    vi.stubEnv('VITE_API_BASE_URL', '/api')
    vi.stubEnv('VITE_ALLOW_RUNTIME_MODE', 'false')
    expect(evaluateProductionShield().ok).toBe(true)
  })

  it('senaryo 7: development ortamı → guard pasif (ok, production=false)', () => {
    vi.stubEnv('VITE_APP_MODE', 'development')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const r = evaluateProductionShield()
    expect(r.ok).toBe(true)
    expect(r.production).toBe(false)
  })

  it('senaryo 7b: demo ortamı → guard pasif (ok, production=false)', () => {
    vi.stubEnv('VITE_APP_MODE', 'demo')
    vi.stubEnv('VITE_API_BASE_URL', '')
    const r = evaluateProductionShield()
    expect(r.ok).toBe(true)
    expect(r.production).toBe(false)
  })
})
