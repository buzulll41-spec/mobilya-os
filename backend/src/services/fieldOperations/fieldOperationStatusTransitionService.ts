/**
 * Enterprise 2.2 S2 — Status Transition Service.
 *
 * Optimistic locking (version) + geçiş matrisi doğrulaması + append-only timeline
 * (durum-özel semantik olay). Terminal duruma geçişte dedupeKey NULL'lanır.
 * IN_PROGRESS'te actualStartTime, COMPLETED/CLOSED'da actualEndTime damgalanır.
 */

import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import type { AuthUserContext } from '../../lib/authUser.js'
import {
  FIELD_OPERATION_STATUS,
  canTransitionFieldOperation,
  isTerminalFieldOperationStatus,
} from '../../constants/fieldOperationConstants.js'
import { appendFieldOperationTimeline, timelineEventForStatus } from './fieldOperationTimelineService.js'
import { loadActiveFieldOperation, type FieldOperationRow } from './fieldOperationRepository.js'

export type TransitionOptions = {
  authUser?: AuthUserContext
  expectedVersion?: number
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}

export async function transitionFieldOperationStatus(
  prisma: PrismaClient,
  id: string,
  toStatus: string,
  options?: TransitionOptions,
): Promise<FieldOperationRow> {
  const op = await loadActiveFieldOperation(prisma, id)
  const actor = options?.authUser?.id ?? null

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

  const now = new Date()
  const terminal = isTerminalFieldOperationStatus(toStatus)
  const data: Prisma.FieldOperationUpdateManyMutationInput = {
    status: toStatus,
    version: { increment: 1 },
    updatedByUserId: actor,
  }
  if (terminal) data.dedupeKey = null
  if (toStatus === FIELD_OPERATION_STATUS.IN_PROGRESS && !op.actualStartTime) data.actualStartTime = now
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

    await appendFieldOperationTimeline(tx, {
      fieldOperationId: id,
      eventType: timelineEventForStatus(toStatus),
      fromStatus: op.status,
      toStatus,
      note: options?.note ?? null,
      actorUserId: actor,
      latitude: options?.latitude ?? null,
      longitude: options?.longitude ?? null,
      occurredAt: now,
    })

    return tx.fieldOperation.findUniqueOrThrow({ where: { id } })
  })
}
