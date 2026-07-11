/**
 * Enterprise 2.2 — Saha Operasyon Merkezi çekirdek servisi (domain + persistence).
 *
 * Sadece çekirdek: oluşturma (duplicate guard + operationNumber), durum geçişi
 * (optimistic locking + append-only timeline), soft delete ve personel ataması.
 * UI / route / harita / foto upload / offline sync YOK.
 */

import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import type { AuthUserContext } from '../../lib/authUser.js'
import {
  FIELD_OPERATION_PRIORITY,
  FIELD_OPERATION_STATUS,
  FIELD_OPERATION_TIMELINE_EVENT,
  canTransitionFieldOperation,
  isFieldOperationAssignmentRole,
  isFieldOperationPriority,
  isFieldOperationType,
  isTerminalFieldOperationStatus,
} from '../../constants/fieldOperationConstants.js'
import { buildFieldOperationDedupeKey } from './fieldOperationDedupe.js'

type Tx = Prisma.TransactionClient
type FieldOperationRow = Prisma.FieldOperationGetPayload<{}>

const OPERATION_NUMBER_PREFIX = 'FO-'
const MAX_CREATE_ATTEMPTS = 5

export type CreateFieldOperationInput = {
  type: string
  title: string
  priority?: string
  description?: string | null
  orderId?: string | null
  shipmentPlanId?: string | null
  serviceRecordId?: string | null
  customerId?: string | null
  addressId?: string | null
  plannedDate?: Date | string | null
  plannedStartTime?: string | null
  plannedEndTime?: string | null
  assignedTeamId?: string | null
  assignedVehicleId?: string | null
  requiresPhoto?: boolean
  requiresSignature?: boolean
  requiresPayment?: boolean
  requiresLocation?: boolean
}

export type ServiceActor = { authUser?: AuthUserContext }

function actorId(options?: ServiceActor): string | null {
  return options?.authUser?.id ?? null
}

function isUniqueViolationOn(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
  const target = err.meta?.target
  if (Array.isArray(target)) return target.some((t) => String(t).includes(field))
  return typeof target === 'string' && target.includes(field)
}

function normalizeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

function toPlannedDate(value: CreateFieldOperationInput['plannedDate']): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Create girdisini domain kurallarına göre doğrular (400 fırlatır). */
export function assertValidCreateFieldOperationInput(input: CreateFieldOperationInput): void {
  const details: Record<string, string> = {}
  if (!isFieldOperationType(input.type)) details.type = 'Geçersiz operasyon türü'
  const title = normalizeText(input.title, 200)
  if (!title) details.title = 'Zorunlu, max 200'
  if (input.priority !== undefined && !isFieldOperationPriority(input.priority)) {
    details.priority = 'Geçersiz öncelik'
  }
  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Saha operasyonu doğrulaması başarısız', 'Bad Request', details)
  }
}

async function generateOperationNumber(client: PrismaClient | Tx, attempt: number): Promise<string> {
  const count = await client.fieldOperation.count()
  const seq = count + 1 + attempt
  return `${OPERATION_NUMBER_PREFIX}${String(seq).padStart(6, '0')}`
}

/**
 * Yeni saha operasyonu oluşturur. Duplicate guard aktifse (kaynaklı) aynı kaynak+tip
 * için ikinci aktif operasyonu engeller (409). İlk timeline olayı (CREATED) yazılır.
 */
export async function createFieldOperation(
  prisma: PrismaClient,
  input: CreateFieldOperationInput,
  options?: ServiceActor,
): Promise<FieldOperationRow> {
  assertValidCreateFieldOperationInput(input)

  const type = input.type
  const dedupeKey = buildFieldOperationDedupeKey(
    {
      orderId: input.orderId ?? null,
      shipmentPlanId: input.shipmentPlanId ?? null,
      serviceRecordId: input.serviceRecordId ?? null,
    },
    type,
  )

  if (dedupeKey) {
    const active = await prisma.fieldOperation.findUnique({ where: { dedupeKey } })
    if (active) {
      throw new AppHttpError(409, 'Bu kaynak için zaten aktif bir operasyon var', 'Conflict', {
        dedupeKey,
        existingOperationId: active.id,
      })
    }
  }

  const createdByUserId = actorId(options)
  const now = new Date()

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const operationNumber = await generateOperationNumber(prisma, attempt)
    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.fieldOperation.create({
          data: {
            operationNumber,
            type,
            status: FIELD_OPERATION_STATUS.PLANNED,
            priority: input.priority ?? FIELD_OPERATION_PRIORITY.NORMAL,
            title: normalizeText(input.title, 200) as string,
            description: normalizeText(input.description, 2000),
            orderId: input.orderId ?? null,
            shipmentPlanId: input.shipmentPlanId ?? null,
            serviceRecordId: input.serviceRecordId ?? null,
            customerId: input.customerId ?? null,
            addressId: input.addressId ?? null,
            plannedDate: toPlannedDate(input.plannedDate),
            plannedStartTime: normalizeText(input.plannedStartTime, 16),
            plannedEndTime: normalizeText(input.plannedEndTime, 16),
            assignedTeamId: input.assignedTeamId ?? null,
            assignedVehicleId: input.assignedVehicleId ?? null,
            requiresPhoto: input.requiresPhoto ?? false,
            requiresSignature: input.requiresSignature ?? false,
            requiresPayment: input.requiresPayment ?? false,
            requiresLocation: input.requiresLocation ?? false,
            dedupeKey,
            createdByUserId,
            updatedByUserId: createdByUserId,
            version: 1,
          },
        })

        await tx.fieldOperationTimeline.create({
          data: {
            fieldOperationId: created.id,
            eventType: FIELD_OPERATION_TIMELINE_EVENT.CREATED,
            fromStatus: null,
            toStatus: FIELD_OPERATION_STATUS.PLANNED,
            actorUserId: createdByUserId,
            occurredAt: now,
          },
        })

        return created
      })
    } catch (err) {
      if (isUniqueViolationOn(err, 'dedupeKey')) {
        throw new AppHttpError(409, 'Bu kaynak için zaten aktif bir operasyon var', 'Conflict', {
          dedupeKey,
        })
      }
      if (isUniqueViolationOn(err, 'operationNumber')) {
        continue
      }
      throw err
    }
  }

  throw new AppHttpError(500, 'operationNumber üretilemedi', 'Internal Server Error')
}

export type TransitionOptions = ServiceActor & {
  expectedVersion?: number
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}

async function loadActiveOperation(
  prisma: PrismaClient,
  id: string,
): Promise<FieldOperationRow> {
  const op = await prisma.fieldOperation.findUnique({ where: { id } })
  if (!op || op.deletedAt) {
    throw new AppHttpError(404, 'Saha operasyonu bulunamadı', 'Not Found', { id })
  }
  return op
}

/**
 * Durum geçişi uygular. Optimistic locking (version) + geçiş matrisi doğrulaması +
 * append-only timeline (STATUS_CHANGED). Terminal duruma geçişte dedupeKey NULL'lanır.
 */
export async function transitionFieldOperationStatus(
  prisma: PrismaClient,
  id: string,
  toStatus: string,
  options?: TransitionOptions,
): Promise<FieldOperationRow> {
  const op = await loadActiveOperation(prisma, id)

  if (options?.expectedVersion !== undefined && options.expectedVersion !== op.version) {
    throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
      expectedVersion: options.expectedVersion,
      actualVersion: op.version,
    })
  }

  if (!canTransitionFieldOperation(op.status, toStatus)) {
    throw new AppHttpError(400, 'Geçersiz durum geçişi', 'Bad Request', {
      fromStatus: op.status,
      toStatus,
    })
  }

  const actor = actorId(options)
  const now = new Date()
  const terminal = isTerminalFieldOperationStatus(toStatus)

  const data: Prisma.FieldOperationUpdateManyMutationInput = {
    status: toStatus,
    version: { increment: 1 },
    updatedByUserId: actor,
  }
  if (terminal) data.dedupeKey = null
  if (toStatus === FIELD_OPERATION_STATUS.IN_PROGRESS && !op.actualStartTime) {
    data.actualStartTime = now
  }
  if (
    (toStatus === FIELD_OPERATION_STATUS.COMPLETED || toStatus === FIELD_OPERATION_STATUS.CLOSED) &&
    !op.actualEndTime
  ) {
    data.actualEndTime = now
  }

  return prisma.$transaction(async (tx) => {
    const res = await tx.fieldOperation.updateMany({
      where: { id, version: op.version, deletedAt: null },
      data,
    })
    if (res.count === 0) {
      throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
        actualVersion: op.version,
      })
    }

    await tx.fieldOperationTimeline.create({
      data: {
        fieldOperationId: id,
        eventType: FIELD_OPERATION_TIMELINE_EVENT.STATUS_CHANGED,
        fromStatus: op.status,
        toStatus,
        note: normalizeText(options?.note, 1000),
        actorUserId: actor,
        latitude: options?.latitude ?? null,
        longitude: options?.longitude ?? null,
        occurredAt: now,
      },
    })

    return tx.fieldOperation.findUniqueOrThrow({ where: { id } })
  })
}

/** Soft delete: deletedAt işaretlenir, dedupeKey NULL'lanır, timeline'a olay yazılır. */
export async function softDeleteFieldOperation(
  prisma: PrismaClient,
  id: string,
  options?: ServiceActor & { expectedVersion?: number },
): Promise<void> {
  const op = await loadActiveOperation(prisma, id)
  if (options?.expectedVersion !== undefined && options.expectedVersion !== op.version) {
    throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
      expectedVersion: options.expectedVersion,
      actualVersion: op.version,
    })
  }

  const actor = actorId(options)
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    const res = await tx.fieldOperation.updateMany({
      where: { id, version: op.version, deletedAt: null },
      data: {
        deletedAt: now,
        dedupeKey: null,
        version: { increment: 1 },
        updatedByUserId: actor,
      },
    })
    if (res.count === 0) {
      throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
        actualVersion: op.version,
      })
    }

    await tx.fieldOperationTimeline.create({
      data: {
        fieldOperationId: id,
        eventType: FIELD_OPERATION_TIMELINE_EVENT.SOFT_DELETED,
        fromStatus: op.status,
        toStatus: null,
        actorUserId: actor,
        occurredAt: now,
      },
    })
  })
}

export type AddAssignmentInput = {
  userId: string
  role: string
  isPrimary?: boolean
}

/** Personel ataması ekler (kim atadı audit'i + timeline ASSIGNMENT_ADDED). */
export async function addFieldOperationAssignment(
  prisma: PrismaClient,
  id: string,
  input: AddAssignmentInput,
  options?: ServiceActor,
): Promise<Prisma.FieldOperationAssignmentGetPayload<{}>> {
  await loadActiveOperation(prisma, id)

  const userId = normalizeText(input.userId, 64)
  if (!userId) {
    throw new AppHttpError(400, 'userId zorunlu', 'Bad Request', { userId: 'Zorunlu' })
  }
  if (!isFieldOperationAssignmentRole(input.role)) {
    throw new AppHttpError(400, 'Geçersiz atama rolü', 'Bad Request', { role: input.role })
  }

  const assignedByUserId = actorId(options)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.fieldOperationAssignment.create({
      data: {
        fieldOperationId: id,
        userId,
        role: input.role,
        isPrimary: input.isPrimary ?? false,
        assignedByUserId,
      },
    })

    await tx.fieldOperationTimeline.create({
      data: {
        fieldOperationId: id,
        eventType: FIELD_OPERATION_TIMELINE_EVENT.ASSIGNMENT_ADDED,
        note: `${input.role}:${userId}`,
        actorUserId: assignedByUserId,
        occurredAt: now,
      },
    })

    return assignment
  })
}
