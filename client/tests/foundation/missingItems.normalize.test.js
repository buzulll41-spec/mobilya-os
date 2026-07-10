import { describe, expect, it } from 'vitest'
import { MISSING_ITEM_STATUS } from '../../src/contracts/v1/missingItemStatuses.js'
import { missingItemStatusLabel } from '../../src/mappers/missingItems/missingItemStatusLabel.js'
import {
  normalizeMissingItemDto,
  pickMissingItemFromMutationResult,
  sanitizeMissingItemsList,
} from '../../src/mappers/missingItems/normalizeMissingItemDto.js'

describe('normalizeMissingItemDto', () => {
  it('status yoksa OPEN', () => {
    const dto = normalizeMissingItemDto({
      id: 'OMI-1',
      orderId: 'S-1',
      title: 'Parça',
      quantity: '2.00',
      reason: 'Eksik',
    })
    expect(dto.status).toBe(MISSING_ITEM_STATUS.OPEN)
  })

  it('POST response düz DTO veya { missingItem } sarmalayıcı', () => {
    const plain = {
      id: 'OMI-2',
      orderId: 'S-2',
      title: 'Kapak',
      quantity: '1.00',
      reason: 'Test',
      status: 'OPEN',
    }
    expect(pickMissingItemFromMutationResult(plain)?.status).toBe(MISSING_ITEM_STATUS.OPEN)
    expect(pickMissingItemFromMutationResult({ missingItem: plain })?.id).toBe('OMI-2')
    expect(pickMissingItemFromMutationResult(undefined)).toBeNull()
  })

  it('sanitizeMissingItemsList undefined satırları atar', () => {
    const list = sanitizeMissingItemsList([
      undefined,
      { id: 'A', orderId: 'S', title: 'x', quantity: '1', reason: 'r' },
    ])
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe(MISSING_ITEM_STATUS.OPEN)
  })

  it('missingItemStatusLabel undefined ile crash etmez', () => {
    expect(missingItemStatusLabel(undefined)).toBe('Açık')
    expect(missingItemStatusLabel(null)).toBe('Açık')
  })
})
