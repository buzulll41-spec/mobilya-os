import { describe, expect, it } from 'vitest'
import {
  assertValidAddAssignmentInput,
  assertValidCreateFieldOperationInput,
  assertValidStatusChangeInput,
  assertValidUpdateFieldOperationInput,
  parseListFieldOperationQuery,
} from '../src/services/fieldOperations/fieldOperationValidationService.js'

describe('create validation', () => {
  it('geçerli girdiyi normalize eder', () => {
    const out = assertValidCreateFieldOperationInput({
      type: 'DELIVERY',
      title: '  Teslimat  ',
      orderId: 'S-1',
      requiresPhoto: true,
    })
    expect(out.type).toBe('DELIVERY')
    expect(out.title).toBe('Teslimat')
    expect(out.orderId).toBe('S-1')
    expect(out.requiresPhoto).toBe(true)
  })

  it('geçersiz tür / boş başlık 400', () => {
    expect(() => assertValidCreateFieldOperationInput({ type: 'NOPE', title: 'x' })).toThrowError()
    expect(() => assertValidCreateFieldOperationInput({ type: 'DELIVERY', title: '' })).toThrowError()
    expect(() => assertValidCreateFieldOperationInput(null)).toThrowError()
  })

  it('geçersiz öncelik 400', () => {
    expect(() =>
      assertValidCreateFieldOperationInput({ type: 'SERVICE', title: 't', priority: 'MEGA' }),
    ).toThrowError()
  })
})

describe('update validation', () => {
  it('yalnızca verilen alanları döndürür', () => {
    const out = assertValidUpdateFieldOperationInput({ title: 'Yeni', expectedVersion: 3 })
    expect(out.title).toBe('Yeni')
    expect(out.expectedVersion).toBe(3)
    expect('priority' in out).toBe(false)
  })

  it('null description kabul eder (temizleme)', () => {
    const out = assertValidUpdateFieldOperationInput({ description: null })
    expect(out.description).toBeNull()
  })

  it('geçersiz öncelik 400', () => {
    expect(() => assertValidUpdateFieldOperationInput({ priority: 'X' })).toThrowError()
  })
})

describe('assignment validation', () => {
  it('geçerli rol/kullanıcı', () => {
    const out = assertValidAddAssignmentInput({ userId: 'u1', role: 'DRIVER', isPrimary: true })
    expect(out).toEqual({ userId: 'u1', role: 'DRIVER', isPrimary: true })
  })

  it('geçersiz rol / eksik userId 400', () => {
    expect(() => assertValidAddAssignmentInput({ userId: 'u1', role: 'HACKER' })).toThrowError()
    expect(() => assertValidAddAssignmentInput({ role: 'DRIVER' })).toThrowError()
  })
})

describe('status change validation', () => {
  it('geçerli hedef durum', () => {
    const out = assertValidStatusChangeInput({ toStatus: 'ASSIGNED', expectedVersion: 1 })
    expect(out.toStatus).toBe('ASSIGNED')
    expect(out.expectedVersion).toBe(1)
  })

  it('geçersiz durum 400', () => {
    expect(() => assertValidStatusChangeInput({ toStatus: 'FLYING' })).toThrowError()
  })
})

describe('list query parsing', () => {
  it('csv status/type ayrıştırır, limit clamp eder', () => {
    const q = parseListFieldOperationQuery({
      status: 'PLANNED,ASSIGNED',
      type: 'DELIVERY',
      assigneeUserId: 'u9',
      limit: '9999',
    })
    expect(q.status).toEqual(['PLANNED', 'ASSIGNED'])
    expect(q.type).toEqual(['DELIVERY'])
    expect(q.assigneeUserId).toBe('u9')
    expect(q.limit).toBe(200)
    expect(q.offset).toBe(0)
  })

  it('boş query güvenli varsayılanlar', () => {
    const q = parseListFieldOperationQuery(undefined)
    expect(q.limit).toBe(100)
    expect(q.offset).toBe(0)
  })

  it('geçersiz status değeri 400', () => {
    expect(() => parseListFieldOperationQuery({ status: 'PLANNED,NOPE' })).toThrowError()
  })
})
