import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEMO_ACCOUNT_HINTS, formatDemoAccountsHint } from '../../src/constants/demoAccounts.js'
import { BUILD_STATUS } from '../../src/constants/buildStatus.js'
import { ApiClientError } from '../../src/lib/apiClient.js'
import {
  clearErrorCenterForTests,
  listErrorCenterEntries,
} from '../../src/lib/errorCenterStore.js'
import { logApiFetchError } from '../../src/lib/logApiFetchError.js'
import BuildStatusIndicator from '../../src/components/BuildStatusIndicator.jsx'

describe('FAZ 111 Sprint 1 quality', () => {
  beforeEach(() => {
    clearErrorCenterForTests()
  })

  describe('Login demo accounts', () => {
    it('demo hesapları @mobilya.local domain kullanır', () => {
      expect(DEMO_ACCOUNT_HINTS.every((a) => a.email.endsWith('@mobilya.local'))).toBe(true)
      expect(formatDemoAccountsHint()).toContain('admin@mobilya.local')
      expect(formatDemoAccountsHint()).not.toContain('admin@ /')
    })

    it('LoginPage yardım metni güncellendi', () => {
      const login = readFileSync(resolve('src/pages/LoginPage.jsx'), 'utf8')
      expect(login).toContain('formatDemoAccountsHint')
      expect(login).toContain('placeholder="ornek@mobilya.local"')
      expect(login).not.toContain('admin@ / admin123')
    })
  })

  describe('CEO Dashboard empty states', () => {
    it('boş kart mesajları tanımlı', () => {
      const page = readFileSync(resolve('src/pages/EnterpriseCeoDashboardPage.jsx'), 'utf8')
      expect(page).toContain('CeoPanelList')
      expect(page).toContain('ecd__empty')
      expect(page).toContain('Kritik risk tespit edilmedi')
    })
  })

  describe('Build Status', () => {
    it('Mobile V1 build sabitleri', () => {
      expect(BUILD_STATUS.edition).toBe('MOBILYA OS Mobile V1')
      expect(BUILD_STATUS.build).toBe('mobile-v1.0.0')
    })

    it('BuildStatusIndicator chrome entegrasyonu', () => {
      expect(typeof BuildStatusIndicator).toBe('function')
      const chrome = readFileSync(resolve('src/components/AppChrome.jsx'), 'utf8')
      expect(chrome).toContain('BuildStatusIndicator')
    })
  })

  describe('Error Center fetch logging', () => {
    it('apiClient fetch hatalarını Error Center kaydeder', () => {
      const err = new ApiClientError({
        kind: 'http',
        message: 'HTTP 503: Service Unavailable',
        method: 'GET',
        url: 'http://localhost:4000/v1/orders',
        status: 503,
      })
      logApiFetchError(err, 'GET', err.url)
      const entries = listErrorCenterEntries()
      expect(entries.length).toBe(1)
      expect(entries[0].category).toBe('api')
      expect(entries[0].message).toContain('/v1/orders')
    })

    it('apiClient request katmanı logApiFetchError kullanır', () => {
      const apiClient = readFileSync(resolve('src/lib/apiClient.js'), 'utf8')
      expect(apiClient).toContain('logApiFetchError')
    })
  })
})
