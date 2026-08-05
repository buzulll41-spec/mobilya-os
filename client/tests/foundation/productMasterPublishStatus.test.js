import { describe, expect, it } from 'vitest'
import {
  PUBLISH_STATUS,
  normalizePublishStatus,
} from '../../src/mappers/product/productMasterCenterModel.js'
import { emptyProductMasterForm } from '../../src/lib/productMasterFormPayload.js'

describe('product master publish status', () => {
  it('normalizePublishStatus keeps canonical values', () => {
    expect(normalizePublishStatus(PUBLISH_STATUS.DRAFT)).toBe(PUBLISH_STATUS.DRAFT)
    expect(normalizePublishStatus(PUBLISH_STATUS.PUBLISHED)).toBe(PUBLISH_STATUS.PUBLISHED)
    expect(normalizePublishStatus(PUBLISH_STATUS.PASSIVE)).toBe(PUBLISH_STATUS.PASSIVE)
  })

  it('normalizePublishStatus accepts legacy casing', () => {
    expect(normalizePublishStatus('draft')).toBe(PUBLISH_STATUS.DRAFT)
    expect(normalizePublishStatus('published')).toBe(PUBLISH_STATUS.PUBLISHED)
    expect(normalizePublishStatus('passive')).toBe(PUBLISH_STATUS.PASSIVE)
  })

  it('normalizePublishStatus falls back for missing or unknown values', () => {
    expect(normalizePublishStatus(null)).toBe(PUBLISH_STATUS.DRAFT)
    expect(normalizePublishStatus(undefined)).toBe(PUBLISH_STATUS.DRAFT)
    expect(normalizePublishStatus('LEGACY')).toBe(PUBLISH_STATUS.DRAFT)
    expect(normalizePublishStatus('LEGACY', { isActive: false })).toBe(PUBLISH_STATUS.PASSIVE)
  })

  it('emptyProductMasterForm exposes publishStatus without ReferenceError', () => {
    const form = emptyProductMasterForm()
    expect(form.publishStatus).toBe(PUBLISH_STATUS.DRAFT)
  })
})
