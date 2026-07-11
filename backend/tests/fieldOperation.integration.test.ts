import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  FIELD_OPERATION_STATUS as S,
  FIELD_OPERATION_TIMELINE_EVENT,
  FIELD_OPERATION_TYPE,
} from '../src/constants/fieldOperationConstants.js'
import {
  addFieldOperationAssignment,
  createFieldOperation,
  softDeleteFieldOperation,
  transitionFieldOperationStatus,
} from '../src/services/fieldOperations/fieldOperationService.js'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('field operation core — persistence + domain guards', () => {
  const prisma = new PrismaClient()
  const createdIds: string[] = []
  // Her testte benzersiz kaynak → paralel/tekrar çalıştırmada dedupe çakışması olmaz
  const uniq = () => `IT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  async function makeOperation(overrides: Record<string, unknown> = {}) {
    const op = await createFieldOperation(prisma, {
      type: FIELD_OPERATION_TYPE.DELIVERY,
      title: 'Entegrasyon testi operasyonu',
      orderId: uniq(),
      ...overrides,
    })
    createdIds.push(op.id)
    return op
  }

  afterAll(async () => {
    if (createdIds.length > 0) {
      // Alt kayıtlar onDelete: Cascade ile temizlenir
      await prisma.fieldOperation.deleteMany({ where: { id: { in: createdIds } } })
    }
    await prisma.$disconnect()
  })

  beforeEach(() => {
    createdIds.length = 0
  })

  it('create → operationNumber + PLANNED + audit + ilk timeline olayı', async () => {
    const op = await makeOperation()
    expect(op.operationNumber).toMatch(/^FO-\d{6}$/)
    expect(op.status).toBe(S.PLANNED)
    expect(op.version).toBe(1)
    expect(op.deletedAt).toBeNull()
    expect(op.dedupeKey).toContain('ORDER:')

    const timeline = await prisma.fieldOperationTimeline.findMany({
      where: { fieldOperationId: op.id },
    })
    expect(timeline).toHaveLength(1)
    expect(timeline[0]!.eventType).toBe(FIELD_OPERATION_TIMELINE_EVENT.CREATED)
    expect(timeline[0]!.toStatus).toBe(S.PLANNED)
  })

  it('duplicate guard: aynı kaynak+tip için ikinci aktif operasyon 409', async () => {
    const orderId = uniq()
    await makeOperation({ orderId })
    await expect(
      createFieldOperation(prisma, {
        type: FIELD_OPERATION_TYPE.DELIVERY,
        title: 'İkinci (yasak) operasyon',
        orderId,
      }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('duplicate guard farklı tip için serbest; kaynaksız operasyon guard dışı', async () => {
    const orderId = uniq()
    const first = await makeOperation({ orderId, type: FIELD_OPERATION_TYPE.DELIVERY })
    createdIds.push(first.id)
    const second = await createFieldOperation(prisma, {
      type: FIELD_OPERATION_TYPE.SERVICE,
      title: 'Farklı tip',
      orderId,
    })
    createdIds.push(second.id)
    expect(second.id).not.toBe(first.id)

    // Kaynaksız iki operasyon → dedupeKey null → çakışma yok
    const a = await createFieldOperation(prisma, { type: FIELD_OPERATION_TYPE.OTHER, title: 'A' })
    const b = await createFieldOperation(prisma, { type: FIELD_OPERATION_TYPE.OTHER, title: 'B' })
    createdIds.push(a.id, b.id)
    expect(a.dedupeKey).toBeNull()
    expect(b.dedupeKey).toBeNull()
  })

  it('soft delete: deletedAt işaretlenir, dedupeKey serbest kalır, tekrar oluşturulabilir', async () => {
    const orderId = uniq()
    const op = await makeOperation({ orderId })
    await softDeleteFieldOperation(prisma, op.id)

    const row = await prisma.fieldOperation.findUniqueOrThrow({ where: { id: op.id } })
    expect(row.deletedAt).not.toBeNull()
    expect(row.dedupeKey).toBeNull()

    // Artık aynı kaynak için yeni aktif operasyon açılabilir
    const again = await createFieldOperation(prisma, {
      type: FIELD_OPERATION_TYPE.DELIVERY,
      title: 'Silme sonrası yeniden',
      orderId,
    })
    createdIds.push(again.id)
    expect(again.id).not.toBe(op.id)

    // Silinmiş kayıt üzerinde işlem 404
    await expect(transitionFieldOperationStatus(prisma, op.id, S.ASSIGNED)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('durum geçişi: geçerli geçiş version artırır + timeline ekler; geçersiz geçiş 400', async () => {
    const op = await makeOperation()
    const assigned = await transitionFieldOperationStatus(prisma, op.id, S.ASSIGNED, {
      note: 'Ekip atandı',
    })
    expect(assigned.status).toBe(S.ASSIGNED)
    expect(assigned.version).toBe(2)

    await expect(
      transitionFieldOperationStatus(prisma, op.id, S.COMPLETED),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('optimistic locking: eski expectedVersion ile geçiş 409', async () => {
    const op = await makeOperation()
    await transitionFieldOperationStatus(prisma, op.id, S.ASSIGNED, { expectedVersion: 1 })
    await expect(
      transitionFieldOperationStatus(prisma, op.id, S.PREPARING, { expectedVersion: 1 }),
    ).rejects.toMatchObject({ statusCode: 409 })
  })

  it('terminal duruma geçiş dedupeKey NULL yapar (kaynak yeniden kullanılabilir)', async () => {
    const orderId = uniq()
    const op = await makeOperation({ orderId })
    await transitionFieldOperationStatus(prisma, op.id, S.CANCELLED)
    const row = await prisma.fieldOperation.findUniqueOrThrow({ where: { id: op.id } })
    expect(row.status).toBe(S.CANCELLED)
    expect(row.dedupeKey).toBeNull()

    const reborn = await createFieldOperation(prisma, {
      type: FIELD_OPERATION_TYPE.DELIVERY,
      title: 'İptal sonrası yeni',
      orderId,
    })
    createdIds.push(reborn.id)
    expect(reborn.id).not.toBe(op.id)
  })

  it('timeline append-only: her geçiş yeni satır ekler, mevcut satırlar değişmez', async () => {
    const op = await makeOperation()
    const t1 = await prisma.fieldOperationTimeline.findMany({
      where: { fieldOperationId: op.id },
      orderBy: { occurredAt: 'asc' },
    })

    await transitionFieldOperationStatus(prisma, op.id, S.ASSIGNED)
    await transitionFieldOperationStatus(prisma, op.id, S.PREPARING)

    const t2 = await prisma.fieldOperationTimeline.findMany({
      where: { fieldOperationId: op.id },
      orderBy: { occurredAt: 'asc' },
    })
    expect(t2.length).toBe(t1.length + 2)
    // İlk (CREATED) satır olduğu gibi korunmuş (append-only)
    expect(t2[0]!.id).toBe(t1[0]!.id)
    expect(t2[0]!.eventType).toBe(FIELD_OPERATION_TIMELINE_EVENT.CREATED)
    expect(t2.at(-1)!.eventType).toBe(FIELD_OPERATION_TIMELINE_EVENT.STATUS_CHANGED)
    expect(t2.at(-1)!.fromStatus).toBe(S.ASSIGNED)
    expect(t2.at(-1)!.toStatus).toBe(S.PREPARING)
  })

  it('atama: kayıt + timeline olayı oluşturur; geçersiz rol 400', async () => {
    const op = await makeOperation()
    const assignment = await addFieldOperationAssignment(prisma, op.id, {
      userId: 'user-123',
      role: 'DRIVER',
      isPrimary: true,
    })
    expect(assignment.userId).toBe('user-123')
    expect(assignment.role).toBe('DRIVER')
    expect(assignment.isPrimary).toBe(true)

    const events = await prisma.fieldOperationTimeline.findMany({
      where: { fieldOperationId: op.id, eventType: FIELD_OPERATION_TIMELINE_EVENT.ASSIGNMENT_ADDED },
    })
    expect(events.length).toBe(1)

    await expect(
      addFieldOperationAssignment(prisma, op.id, { userId: 'u', role: 'HACKER' }),
    ).rejects.toMatchObject({ statusCode: 400 })
  })
})
