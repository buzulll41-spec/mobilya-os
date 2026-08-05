/**
 * Enterprise 2.2 — Field Operation Command Service (create/update/soft-delete/get).
 *
 * Durum geçişi ve atama ayrı servislerdedir; buradan facade olarak yeniden ihraç
 * edilir (S1 API uyumluluğu). Duplicate guard + operationNumber üretimi + CREATE
 * timeline olayı bu serviste üretilir.
 */

import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import type { AuthUserContext } from '../../lib/authUser.js'
import {
  FIELD_OPERATION_PRIORITY,
  FIELD_OPERATION_STATUS,
  FIELD_OPERATION_TIMELINE_EVENT,
} from '../../constants/fieldOperationConstants.js'
import { buildFieldOperationDedupeKey } from './fieldOperationDedupe.js'
import { appendCreateEvent, appendFieldOperationTimeline } from './fieldOperationTimelineService.js'
import { loadActiveFieldOperation, type FieldOperationRow } from './fieldOperationRepository.js'
import {
  assertValidCreateFieldOperationInput,
  type CreateFieldOperationInput,
  type UpdateFieldOperationInput,
} from './fieldOperationValidationService.js'

// S1 API uyumluluğu + tek giriş noktası (facade)
export { transitionFieldOperationStatus } from './fieldOperationStatusTransitionService.js'
export type { TransitionOptions } from './fieldOperationStatusTransitionService.js'
export {
  addFieldOperationAssignment,
  unassignFieldOperationAssignment,
} from './fieldOperationAssignmentService.js'
export type { AddAssignmentInput } from './fieldOperationAssignmentService.js'
export type { CreateFieldOperationInput } from './fieldOperationValidationService.js'

type ServiceActor = { authUser?: AuthUserContext }

const OPERATION_NUMBER_PREFIX = 'FO-'
const MAX_CREATE_ATTEMPTS = 5

function actorId(options?: ServiceActor): string | null {
  return options?.authUser?.id ?? null
}

function toPlannedDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function isUniqueViolationOn(err: unknown, field: string): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false
  const target = err.meta?.target
  if (Array.isArray(target)) return target.some((t) => String(t).includes(field))
  return typeof target === 'string' && target.includes(field)
}

async function generateOperationNumber(prisma: PrismaClient, attempt: number): Promise<string> {
  const count = await prisma.fieldOperation.count()
  return `${OPERATION_NUMBER_PREFIX}${String(count + 1 + attempt).padStart(6, '0')}`
}

/** Yeni saha operasyonu oluşturur (duplicate guard + operationNumber + CREATE timeline). */
export async function createFieldOperation(
  prisma: PrismaClient,
  rawInput: CreateFieldOperationInput,
  options?: ServiceActor,
): Promise<FieldOperationRow> {
  const input = assertValidCreateFieldOperationInput(rawInput)
  const dedupeKey = buildFieldOperationDedupeKey(
    {
      orderId: input.orderId ?? null,
      shipmentPlanId: input.shipmentPlanId ?? null,
      serviceRecordId: input.serviceRecordId ?? null,
    },
    input.type,
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
            type: input.type,
            status: FIELD_OPERATION_STATUS.PLANNED,
            priority: input.priority ?? FIELD_OPERATION_PRIORITY.NORMAL,
            title: input.title,
            description: input.description ?? null,
            orderId: input.orderId ?? null,
            shipmentPlanId: input.shipmentPlanId ?? null,
            serviceRecordId: input.serviceRecordId ?? null,
            customerId: input.customerId ?? null,
            addressId: input.addressId ?? null,
            plannedDate: toPlannedDate(input.plannedDate),
            plannedStartTime: input.plannedStartTime ?? null,
            plannedEndTime: input.plannedEndTime ?? null,
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

        await appendCreateEvent(tx, created.id, FIELD_OPERATION_STATUS.PLANNED, createdByUserId, now)
        return created
      })
    } catch (err) {
      if (isUniqueViolationOn(err, 'dedupeKey')) {
        throw new AppHttpError(409, 'Bu kaynak için zaten aktif bir operasyon var', 'Conflict', {
          dedupeKey,
        })
      }
      if (isUniqueViolationOn(err, 'operationNumber')) continue
      throw err
    }
  }

  throw new AppHttpError(500, 'operationNumber üretilemedi', 'Internal Server Error')
}

/** Operasyon alanlarını kısmi günceller (optimistic locking; durum/atama HARİÇ). */
export async function updateFieldOperation(
  prisma: PrismaClient,
  id: string,
  input: UpdateFieldOperationInput,
  options?: ServiceActor,
): Promise<FieldOperationRow> {
  const op = await loadActiveFieldOperation(prisma, id)
  if (input.expectedVersion !== undefined && input.expectedVersion !== op.version) {
    throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
      expectedVersion: input.expectedVersion,
      actualVersion: op.version,
    })
  }

  const data: Prisma.FieldOperationUpdateManyMutationInput = {
    version: { increment: 1 },
    updatedByUserId: actorId(options),
  }
  if (input.title !== undefined) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.priority !== undefined) data.priority = input.priority
  if (input.plannedDate !== undefined) data.plannedDate = toPlannedDate(input.plannedDate)
  if (input.plannedStartTime !== undefined) data.plannedStartTime = input.plannedStartTime
  if (input.plannedEndTime !== undefined) data.plannedEndTime = input.plannedEndTime
  if (input.assignedTeamId !== undefined) data.assignedTeamId = input.assignedTeamId
  if (input.assignedVehicleId !== undefined) data.assignedVehicleId = input.assignedVehicleId
  if (input.requiresPhoto !== undefined) data.requiresPhoto = input.requiresPhoto
  if (input.requiresSignature !== undefined) data.requiresSignature = input.requiresSignature
  if (input.requiresPayment !== undefined) data.requiresPayment = input.requiresPayment
  if (input.requiresLocation !== undefined) data.requiresLocation = input.requiresLocation

  const res = await prisma.fieldOperation.updateMany({
    where: { id, version: op.version, deletedAt: null },
    data,
  })
  if (res.count === 0) {
    throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
      actualVersion: op.version,
    })
  }
  return prisma.fieldOperation.findUniqueOrThrow({ where: { id } })
}

/** Soft delete: deletedAt işaretlenir, dedupeKey NULL'lanır, timeline'a olay yazılır. */
export async function softDeleteFieldOperation(
  prisma: PrismaClient,
  id: string,
  options?: ServiceActor & { expectedVersion?: number },
): Promise<void> {
  const op = await loadActiveFieldOperation(prisma, id)
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
      data: { deletedAt: now, dedupeKey: null, version: { increment: 1 }, updatedByUserId: actor },
    })
    if (res.count === 0) {
      throw new AppHttpError(409, 'Sürüm çakışması (kayıt değişmiş)', 'Conflict', {
        actualVersion: op.version,
      })
    }
    await appendFieldOperationTimeline(tx, {
      fieldOperationId: id,
      eventType: FIELD_OPERATION_TIMELINE_EVENT.SOFT_DELETED,
      fromStatus: op.status,
      toStatus: null,
      actorUserId: actor,
      occurredAt: now,
    })
  })
}

/** Tek operasyonu döndürür (silinmişse 404). */
export async function getFieldOperationById(
  prisma: PrismaClient,
  id: string,
): Promise<FieldOperationRow> {
  return loadActiveFieldOperation(prisma, id)
}
