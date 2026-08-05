import { describe, expect, it } from 'vitest'
import {
  collectProductionConfigIssues,
  validateProductionConfig,
  ProductionConfigError,
} from '../src/config/validateProductionConfig.js'

// Dalga 0 — Production Config Guard: production'da güvensiz auth/DB/origin
// yapılandırmasında süreç başlamamalı (fail-closed). Development/test DEĞİŞMEZ.

const baseProd = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a-very-strong-random-secret-value-1234',
  DATABASE_URL: 'postgresql://user:pass@db-host:5432/app',
  CORS_ALLOWED_ORIGINS: 'https://app.example.com',
} as NodeJS.ProcessEnv

describe('collectProductionConfigIssues', () => {
  it('senaryo 6: production + doğru config → sorun yok', () => {
    expect(collectProductionConfigIssues(baseProd)).toEqual([])
  })

  it('senaryo 4: production + AUTH_DISABLED=true → unsafe_enabled', () => {
    const r = collectProductionConfigIssues({ ...baseProd, AUTH_DISABLED: 'true' })
    expect(r).toContainEqual({ variable: 'AUTH_DISABLED', type: 'unsafe_enabled' })
  })

  it('senaryo 5: production + placeholder JWT secret → placeholder', () => {
    const r = collectProductionConfigIssues({ ...baseProd, JWT_SECRET: 'change-me-in-production' })
    expect(r).toContainEqual({ variable: 'JWT_SECRET', type: 'placeholder' })
  })

  it('production + eksik JWT secret → missing', () => {
    const r = collectProductionConfigIssues({ ...baseProd, JWT_SECRET: '' })
    expect(r).toContainEqual({ variable: 'JWT_SECRET', type: 'missing' })
  })

  it('production + çok kısa JWT secret → too_short', () => {
    const r = collectProductionConfigIssues({ ...baseProd, JWT_SECRET: 'short' })
    expect(r).toContainEqual({ variable: 'JWT_SECRET', type: 'too_short' })
  })

  it('production + eksik DATABASE_URL → missing', () => {
    const r = collectProductionConfigIssues({ ...baseProd, DATABASE_URL: '' })
    expect(r).toContainEqual({ variable: 'DATABASE_URL', type: 'missing' })
  })

  it('production + geçersiz DATABASE_URL → invalid', () => {
    const r = collectProductionConfigIssues({ ...baseProd, DATABASE_URL: 'mysql://x' })
    expect(r).toContainEqual({ variable: 'DATABASE_URL', type: 'invalid' })
  })

  it('production + loopback DATABASE_URL host → invalid', () => {
    const r = collectProductionConfigIssues({
      ...baseProd,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/app',
    })
    expect(r).toContainEqual({ variable: 'DATABASE_URL', type: 'invalid' })
  })

  it('production + placeholder DATABASE_URL credentials → placeholder', () => {
    const r = collectProductionConfigIssues({
      ...baseProd,
      DATABASE_URL: 'postgresql://mobilya:prod_change_me@db-host:5432/app',
    })
    expect(r).toContainEqual({ variable: 'DATABASE_URL', type: 'placeholder' })
  })

  it('production + eksik CORS_ALLOWED_ORIGINS → missing', () => {
    const r = collectProductionConfigIssues({ ...baseProd, CORS_ALLOWED_ORIGINS: '' })
    expect(r).toContainEqual({ variable: 'CORS_ALLOWED_ORIGINS', type: 'missing' })
  })

  it('senaryo 7: development → guard pasif (sorun yok)', () => {
    const r = collectProductionConfigIssues({
      ...baseProd,
      NODE_ENV: 'development',
      JWT_SECRET: '',
      AUTH_DISABLED: 'true',
    })
    expect(r).toEqual([])
  })

  it('senaryo 8: test ortamı → guard pasif (sorun yok)', () => {
    const r = collectProductionConfigIssues({
      ...baseProd,
      NODE_ENV: 'test',
      JWT_SECRET: '',
    })
    expect(r).toEqual([])
  })

  it('production + RUN_SEED_ON_BOOT=true → unsafe_enabled', () => {
    const r = collectProductionConfigIssues({ ...baseProd, RUN_SEED_ON_BOOT: 'true' })
    expect(r).toContainEqual({ variable: 'RUN_SEED_ON_BOOT', type: 'unsafe_enabled' })
  })
})

describe('validateProductionConfig', () => {
  it('doğru config → throw etmez', () => {
    expect(() => validateProductionConfig(baseProd)).not.toThrow()
  })

  it('güvensiz config → ProductionConfigError fırlatır (secret değeri sızmaz)', () => {
    let caught: unknown
    try {
      validateProductionConfig({ ...baseProd, JWT_SECRET: 'change-me-in-production' })
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(ProductionConfigError)
    const message = (caught as Error).message
    expect(message).toContain('JWT_SECRET')
    expect(message).not.toContain('change-me-in-production')
  })
})
