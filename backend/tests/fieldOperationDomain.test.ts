import { describe, expect, it } from 'vitest'
import {
  FIELD_OPERATION_STATUS as S,
  FIELD_OPERATION_TYPE,
  canTransitionFieldOperation,
  isActiveFieldOperation,
  isFieldOperationAssignmentRole,
  isFieldOperationPriority,
  isFieldOperationStatus,
  isFieldOperationType,
  isTerminalFieldOperationStatus,
} from '../src/constants/fieldOperationConstants.js'
import {
  buildFieldOperationDedupeKey,
  resolveFieldOperationSource,
} from '../src/services/fieldOperations/fieldOperationDedupe.js'

describe('field operation — domain constants', () => {
  it('tip/durum/öncelik/rol doğrulayıcıları kanonik değerleri kabul, çöpü reddeder', () => {
    expect(isFieldOperationType('DELIVERY')).toBe(true)
    expect(isFieldOperationType('installation')).toBe(false)
    expect(isFieldOperationType('NOPE')).toBe(false)
    expect(isFieldOperationStatus('IN_PROGRESS')).toBe(true)
    expect(isFieldOperationStatus('DONE')).toBe(false)
    expect(isFieldOperationPriority('URGENT')).toBe(true)
    expect(isFieldOperationPriority('SUPER')).toBe(false)
    expect(isFieldOperationAssignmentRole('DRIVER')).toBe(true)
    expect(isFieldOperationAssignmentRole('ADMIN')).toBe(false)
  })

  it('terminal ve aktiflik kuralları', () => {
    expect(isTerminalFieldOperationStatus(S.CLOSED)).toBe(true)
    expect(isTerminalFieldOperationStatus(S.CANCELLED)).toBe(true)
    expect(isTerminalFieldOperationStatus(S.IN_PROGRESS)).toBe(false)
    expect(isActiveFieldOperation(S.IN_PROGRESS, null)).toBe(true)
    expect(isActiveFieldOperation(S.IN_PROGRESS, new Date())).toBe(false)
    expect(isActiveFieldOperation(S.CLOSED, null)).toBe(false)
  })
})

describe('field operation — durum makinesi', () => {
  it('izinli geçişler kabul, izinsizler reddedilir', () => {
    expect(canTransitionFieldOperation(S.PLANNED, S.ASSIGNED)).toBe(true)
    expect(canTransitionFieldOperation(S.IN_PROGRESS, S.COMPLETED)).toBe(true)
    expect(canTransitionFieldOperation(S.COMPLETED, S.CLOSED)).toBe(true)
    expect(canTransitionFieldOperation(S.PLANNED, S.COMPLETED)).toBe(false)
    expect(canTransitionFieldOperation(S.ARRIVED, S.PLANNED)).toBe(false)
  })

  it('aynı duruma geçiş ve terminal durumdan çıkış yasak', () => {
    expect(canTransitionFieldOperation(S.IN_PROGRESS, S.IN_PROGRESS)).toBe(false)
    expect(canTransitionFieldOperation(S.CLOSED, S.IN_PROGRESS)).toBe(false)
    expect(canTransitionFieldOperation(S.CANCELLED, S.PLANNED)).toBe(false)
  })
})

describe('field operation — dedupe anahtarı', () => {
  it('kaynağı öncelik sırasıyla çözer (ShipmentPlan > Service > Order)', () => {
    expect(
      resolveFieldOperationSource({ orderId: 'o1', shipmentPlanId: 'sp1', serviceRecordId: 'sr1' }),
    ).toEqual({ sourceType: 'SHIPMENT_PLAN', sourceId: 'sp1' })
    expect(resolveFieldOperationSource({ orderId: 'o1', serviceRecordId: 'sr1' })).toEqual({
      sourceType: 'SERVICE_RECORD',
      sourceId: 'sr1',
    })
    expect(resolveFieldOperationSource({ orderId: 'o1' })).toEqual({
      sourceType: 'ORDER',
      sourceId: 'o1',
    })
    expect(resolveFieldOperationSource({})).toBeNull()
  })

  it('kaynak varsa deterministik anahtar, yoksa null (guard uygulanmaz)', () => {
    expect(buildFieldOperationDedupeKey({ orderId: 'o1' }, FIELD_OPERATION_TYPE.DELIVERY)).toBe(
      'ORDER:o1:DELIVERY',
    )
    expect(buildFieldOperationDedupeKey({}, FIELD_OPERATION_TYPE.DELIVERY)).toBeNull()
  })
})
