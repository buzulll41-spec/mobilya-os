/**
 * Enterprise 2.2 S2 — Assignment Service.
 *
 * Personel ataması ekleme/kaldırma. "Kim atadı" (assignedByUserId) audit'i tutulur
 * ve her atama/kaldırma timeline'a (ASSIGN / UNASSIGN) yazılır.
 */

import { Prisma, type PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import type { AuthUserContext } from '../../lib/authUser.js'
import {
  FIELD_OPERATION_TIMELINE_EVENT,
  isFieldOperationAssignmentRole,
} from '../../constants/fieldOperationConstants.js'
import { appendFieldOperationTimeline } from './fieldOperationTimelineService.js'
import { loadActiveFieldOperation } from './fieldOperationRepository.js'

export type AddAssignmentInput = {
  userId: string
  role: string
  isPrimary?: boolean
}

type AssignmentRow = Prisma.FieldOperationAssignmentGetPayload<{}>

export async function addFieldOperationAssignment(
  prisma: PrismaClient,
  id: string,
  input: AddAssignmentInput,
  options?: { authUser?: AuthUserContext },
): Promise<AssignmentRow> {
  await loadActiveFieldOperation(prisma, id)

  const userId = input.userId?.trim()
  if (!userId) {
    throw new AppHttpError(400, 'userId zorunlu', 'Bad Request', { userId: 'Zorunlu' })
  }
  if (!isFieldOperationAssignmentRole(input.role)) {
    throw new AppHttpError(400, 'Geçersiz atama rolü', 'Bad Request', { role: input.role })
  }

  const assignedByUserId = options?.authUser?.id ?? null
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

    await appendFieldOperationTimeline(tx, {
      fieldOperationId: id,
      eventType: FIELD_OPERATION_TIMELINE_EVENT.ASSIGN,
      note: `${input.role}:${userId}`,
      actorUserId: assignedByUserId,
      occurredAt: now,
    })

    return assignment
  })
}

/** Bir atamayı kaldırır (soft: unassignedAt damgalanır) + timeline UNASSIGN. */
export async function unassignFieldOperationAssignment(
  prisma: PrismaClient,
  id: string,
  assignmentId: string,
  options?: { authUser?: AuthUserContext },
): Promise<void> {
  await loadActiveFieldOperation(prisma, id)
  const actor = options?.authUser?.id ?? null
  const now = new Date()

  const existing = await prisma.fieldOperationAssignment.findFirst({
    where: { id: assignmentId, fieldOperationId: id },
  })
  if (!existing) {
    throw new AppHttpError(404, 'Atama bulunamadı', 'Not Found', { assignmentId })
  }

  await prisma.$transaction(async (tx) => {
    await tx.fieldOperationAssignment.update({
      where: { id: assignmentId },
      data: { unassignedAt: existing.unassignedAt ?? now },
    })
    await appendFieldOperationTimeline(tx, {
      fieldOperationId: id,
      eventType: FIELD_OPERATION_TIMELINE_EVENT.UNASSIGN,
      note: `${existing.role}:${existing.userId}`,
      actorUserId: actor,
      occurredAt: now,
    })
  })
}
