import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import type { TaskStateDto } from './listTaskStates.js'

const ALLOWED_STATES = new Set(['dismissed', 'completed', 'snoozed'])

export type UpsertTaskStateRequest = {
  dedupeKey: string
  state: string
  snoozedUntil?: string
}

export function assertValidUpsertTaskStateRequest(body: unknown): UpsertTaskStateRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const dedupeKey = typeof o.dedupeKey === 'string' ? o.dedupeKey.trim() : ''
  const state = typeof o.state === 'string' ? o.state.trim() : ''
  const snoozedUntil =
    typeof o.snoozedUntil === 'string' && o.snoozedUntil.trim() ? o.snoozedUntil.trim() : undefined

  const details: Record<string, string> = {}
  if (!dedupeKey) details.dedupeKey = 'Required'
  if (!ALLOWED_STATES.has(state)) details.state = 'Must be dismissed, completed, or snoozed'
  if (state === 'snoozed' && snoozedUntil && Number.isNaN(Date.parse(snoozedUntil))) {
    details.snoozedUntil = 'Invalid ISO date'
  }
  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return { dedupeKey, state, ...(snoozedUntil ? { snoozedUntil } : {}) }
}

export async function upsertTaskState(
  prisma: PrismaClient,
  userId: string,
  body: UpsertTaskStateRequest,
): Promise<TaskStateDto> {
  const snoozedUntil =
    body.state === 'snoozed' && body.snoozedUntil
      ? new Date(body.snoozedUntil)
      : body.state === 'snoozed'
        ? new Date(Date.now() + 86_400_000)
        : null

  const row = await prisma.taskState.upsert({
    where: { userId_dedupeKey: { userId, dedupeKey: body.dedupeKey } },
    create: {
      dedupeKey: body.dedupeKey,
      userId,
      state: body.state,
      snoozedUntil,
    },
    update: {
      state: body.state,
      snoozedUntil,
    },
  })

  return {
    id: row.id,
    dedupeKey: row.dedupeKey,
    userId: row.userId,
    state: row.state,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function deleteTaskState(
  prisma: PrismaClient,
  userId: string,
  dedupeKey: string,
): Promise<void> {
  await prisma.taskState.deleteMany({ where: { userId, dedupeKey } })
}
