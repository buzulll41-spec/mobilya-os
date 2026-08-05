import { describe, expect, it } from 'vitest'
import { assertValidPatchOrderStatusRequest } from '../src/services/patchOrderStatus.js'

describe('patchOrderStatus validation', () => {
  it('accepts cancel status', () => {
    expect(assertValidPatchOrderStatusRequest({ status: 'İptal' })).toEqual({
      status: 'İptal',
    })
  })

  it('rejects unknown status', () => {
    expect(() => assertValidPatchOrderStatusRequest({ status: 'Canceled' })).toThrow(/Validation failed/)
  })
})
