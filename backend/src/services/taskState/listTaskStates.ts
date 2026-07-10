import type { PrismaClient } from '@prisma/client'

export type TaskStateDto = {
  id: string
  dedupeKey: string
  userId: string
  state: string
  snoozedUntil: string | null
  updatedAt: string
}

function mapRow(row: {
  id: string
  dedupeKey: string
  userId: string
  state: string
  snoozedUntil: Date | null
  updatedAt: Date
}): TaskStateDto {
  return {
    id: row.id,
    dedupeKey: row.dedupeKey,
    userId: row.userId,
    state: row.state,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listTaskStatesForUser(
  prisma: PrismaClient,
  userId: string,
): Promise<TaskStateDto[]> {
  const rows = await prisma.taskState.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })
  return rows.map(mapRow)
}
