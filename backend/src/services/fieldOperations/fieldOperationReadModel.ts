/**
 * Enterprise 2.2 S2 — Read Model.
 *
 * Listeleme (durum/tip/personel/araç/ekip/tarih filtreleri), detay (tüm ilişkiler)
 * ve "Bugünkü İşler" sorguları. Soft-delete varsayılan olarak hariç tutulur.
 */

import type { Prisma, PrismaClient } from '@prisma/client'
import { AppHttpError } from '../../errors/apiError.js'
import {
  toFieldOperationDetailDto,
  toFieldOperationListItemDto,
} from '../../contracts/fieldOperationDto.js'
import type { ListFieldOperationQuery } from './fieldOperationValidationService.js'

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function buildWhere(query: ListFieldOperationQuery): Prisma.FieldOperationWhereInput {
  const where: Prisma.FieldOperationWhereInput = {}
  if (!query.includeDeleted) where.deletedAt = null
  if (query.status?.length) where.status = { in: query.status }
  if (query.type?.length) where.type = { in: query.type }
  if (query.teamId) where.assignedTeamId = query.teamId
  if (query.assigneeUserId) {
    where.assignments = { some: { userId: query.assigneeUserId, unassignedAt: null } }
  }
  if (query.vehicleId) {
    where.OR = [
      { assignedVehicleId: query.vehicleId },
      { vehicles: { some: { vehicleId: query.vehicleId, releasedAt: null } } },
    ]
  }
  const from = toDate(query.dateFrom)
  const to = toDate(query.dateTo)
  if (from || to) {
    where.plannedDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
  }
  return where
}

export type FieldOperationListResult = {
  items: ReturnType<typeof toFieldOperationListItemDto>[]
  total: number
  limit: number
  offset: number
}

/** Filtrelenmiş operasyon listesi (+ toplam sayı, sayfalama). */
export async function listFieldOperations(
  prisma: PrismaClient,
  query: ListFieldOperationQuery,
): Promise<FieldOperationListResult> {
  const where = buildWhere(query)
  const [rows, total] = await Promise.all([
    prisma.fieldOperation.findMany({
      where,
      include: { assignments: true },
      orderBy: [{ plannedDate: 'asc' }, { plannedStartTime: 'asc' }, { createdAt: 'asc' }],
      take: query.limit,
      skip: query.offset,
    }),
    prisma.fieldOperation.count({ where }),
  ])
  return {
    items: rows.map(toFieldOperationListItemDto),
    total,
    limit: query.limit,
    offset: query.offset,
  }
}

/** "Bugünkü İşler" — verilen (veya bugünkü) tarihe planlı, silinmemiş operasyonlar. */
export async function listTodayFieldOperations(
  prisma: PrismaClient,
  todayIso?: string,
): Promise<FieldOperationListResult> {
  const today = todayIso ?? process.env.DEMO_TODAY ?? new Date().toISOString().slice(0, 10)
  return listFieldOperations(prisma, {
    dateFrom: today,
    dateTo: today,
    limit: 200,
    offset: 0,
  })
}

/** Tek operasyonun tüm ilişkileriyle detayını döndürür (silinmişse 404). */
export async function getFieldOperationDetail(prisma: PrismaClient, id: string) {
  const row = await prisma.fieldOperation.findUnique({
    where: { id },
    include: {
      timeline: true,
      assignments: true,
      vehicles: true,
      issues: true,
      partRequests: true,
      evidence: true,
      customerApprovals: true,
      tasks: true,
    },
  })
  if (!row || row.deletedAt) {
    throw new AppHttpError(404, 'Saha operasyonu bulunamadı', 'Not Found', { id })
  }
  return toFieldOperationDetailDto(row)
}
