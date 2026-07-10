import { describe, expect, it } from 'vitest'
import { ApiClientError } from '../../src/lib/apiClient.js'
import { formatApiErrorMessage, formatSupplyConfirmError } from '../../src/utils/apiErrorMessage.js'

describe('formatApiErrorMessage', () => {
  it('POST localhost Failed to fetch → backend kapalı mesajı', () => {
    const err = new ApiClientError({
      kind: 'network',
      message: 'Failed to fetch',
      method: 'POST',
      url: 'http://localhost:4000/v1/orders',
      cause: new TypeError('Failed to fetch'),
    })
    expect(formatApiErrorMessage(err)).toMatch(/Backend çalışmıyor/)
    expect(formatApiErrorMessage(err)).not.toMatch(/CORS/)
  })

  it('PATCH network Failed to fetch → CORS ipucu', () => {
    const err = new ApiClientError({
      kind: 'network',
      message: 'Failed to fetch',
      method: 'PATCH',
      url: 'http://localhost:4000/v1/missing-items/OMI-1/status',
      cause: new TypeError('Failed to fetch'),
    })
    expect(formatApiErrorMessage(err)).toMatch(/CORS/)
  })

  it('HTTP 400 additional properties → sipariş formatı', () => {
    const err = new ApiClientError({
      kind: 'http',
      message: 'HTTP 400',
      status: 400,
      method: 'POST',
      url: 'http://localhost:4000/v1/orders',
      body: { message: 'body must NOT have additional properties' },
    })
    expect(formatApiErrorMessage(err)).toMatch(/uyumsuz/)
  })

  it('HTTP 404 body.message gösterilir', () => {
    const err = new ApiClientError({
      kind: 'http',
      message: 'HTTP 404',
      status: 404,
      body: { message: 'Eksik kaydı bulunamadı' },
    })
    expect(formatApiErrorMessage(err)).toBe('Eksik kaydı bulunamadı')
  })
})

describe('formatSupplyConfirmError', () => {
  it('401/403 → tedarik onay mesajı', () => {
    for (const status of [401, 403]) {
      const err = new ApiClientError({
        kind: 'http',
        message: `HTTP ${status}`,
        status,
      })
      expect(formatSupplyConfirmError(err)).toBe(
        'Tedarik gönderimi onaylanamadı. Yetkiniz yok veya oturum süreniz dolmuş olabilir.',
      )
    }
  })
})
