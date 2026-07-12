/**
 * Enterprise 2.2 S2 — Validation Service.
 *
 * HTTP gövde/başlık doğrulaması + domain kural doğrulaması. Geçersiz girdide
 * AppHttpError(400) fırlatır ve normalize edilmiş, güvenli tipli nesne döndürür.
 */

import { AppHttpError } from '../../errors/apiError.js'
import {
  isFieldOperationAssignmentRole,
  isFieldOperationPriority,
  isFieldOperationStatus,
  isFieldOperationType,
} from '../../constants/fieldOperationConstants.js'

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

export type UpdateFieldOperationInput = {
  title?: string
  description?: string | null
  priority?: string
  plannedDate?: Date | string | null
  plannedStartTime?: string | null
  plannedEndTime?: string | null
  assignedTeamId?: string | null
  assignedVehicleId?: string | null
  requiresPhoto?: boolean
  requiresSignature?: boolean
  requiresPayment?: boolean
  requiresLocation?: boolean
  expectedVersion?: number
}

export type AddAssignmentInput = {
  userId: string
  role: string
  isPrimary?: boolean
}

export type StatusChangeInput = {
  toStatus: string
  expectedVersion?: number
  note?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type ListFieldOperationQuery = {
  status?: string[]
  type?: string[]
  assigneeUserId?: string
  vehicleId?: string
  teamId?: string
  dateFrom?: string
  dateTo?: string
  includeDeleted?: boolean
  limit: number
  offset: number
}

function asObject(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppHttpError(400, 'İstek gövdesi JSON nesnesi olmalı', 'Bad Request')
  }
  return body as Record<string, unknown>
}

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  return t ? t : undefined
}

function optBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function fail(details: Record<string, string>): never {
  throw new AppHttpError(400, 'Saha operasyonu doğrulaması başarısız', 'Bad Request', details)
}

/** POST /v1/field-operations gövdesi. */
export function assertValidCreateFieldOperationInput(body: unknown): CreateFieldOperationInput {
  const o = asObject(body)
  const details: Record<string, string> = {}

  const type = str(o.type)
  if (!type || !isFieldOperationType(type)) details.type = 'Geçersiz operasyon türü'
  const title = str(o.title)
  if (!title || title.length > 200) details.title = 'Zorunlu, max 200'
  const priority = str(o.priority)
  if (priority !== undefined && !isFieldOperationPriority(priority)) details.priority = 'Geçersiz öncelik'

  if (Object.keys(details).length > 0) fail(details)

  return {
    type: type as string,
    title: title as string,
    ...(priority ? { priority } : {}),
    description: str(o.description) ?? null,
    orderId: str(o.orderId) ?? null,
    shipmentPlanId: str(o.shipmentPlanId) ?? null,
    serviceRecordId: str(o.serviceRecordId) ?? null,
    customerId: str(o.customerId) ?? null,
    addressId: str(o.addressId) ?? null,
    plannedDate: str(o.plannedDate) ?? null,
    plannedStartTime: str(o.plannedStartTime) ?? null,
    plannedEndTime: str(o.plannedEndTime) ?? null,
    assignedTeamId: str(o.assignedTeamId) ?? null,
    assignedVehicleId: str(o.assignedVehicleId) ?? null,
    ...(optBool(o.requiresPhoto) !== undefined ? { requiresPhoto: optBool(o.requiresPhoto) } : {}),
    ...(optBool(o.requiresSignature) !== undefined ? { requiresSignature: optBool(o.requiresSignature) } : {}),
    ...(optBool(o.requiresPayment) !== undefined ? { requiresPayment: optBool(o.requiresPayment) } : {}),
    ...(optBool(o.requiresLocation) !== undefined ? { requiresLocation: optBool(o.requiresLocation) } : {}),
  }
}

/** PATCH /v1/field-operations/:id gövdesi (kısmi güncelleme). */
export function assertValidUpdateFieldOperationInput(body: unknown): UpdateFieldOperationInput {
  const o = asObject(body)
  const details: Record<string, string> = {}

  const title = str(o.title)
  if (title !== undefined && title.length > 200) details.title = 'Max 200'
  const priority = str(o.priority)
  if (priority !== undefined && !isFieldOperationPriority(priority)) details.priority = 'Geçersiz öncelik'
  const expectedVersion = typeof o.expectedVersion === 'number' ? o.expectedVersion : undefined
  if (o.expectedVersion !== undefined && expectedVersion === undefined) {
    details.expectedVersion = 'Sayı olmalı'
  }
  if (Object.keys(details).length > 0) fail(details)

  const out: UpdateFieldOperationInput = {}
  if (title !== undefined) out.title = title
  if (o.description !== undefined) out.description = str(o.description) ?? null
  if (priority !== undefined) out.priority = priority
  if (o.plannedDate !== undefined) out.plannedDate = str(o.plannedDate) ?? null
  if (o.plannedStartTime !== undefined) out.plannedStartTime = str(o.plannedStartTime) ?? null
  if (o.plannedEndTime !== undefined) out.plannedEndTime = str(o.plannedEndTime) ?? null
  if (o.assignedTeamId !== undefined) out.assignedTeamId = str(o.assignedTeamId) ?? null
  if (o.assignedVehicleId !== undefined) out.assignedVehicleId = str(o.assignedVehicleId) ?? null
  if (optBool(o.requiresPhoto) !== undefined) out.requiresPhoto = optBool(o.requiresPhoto)
  if (optBool(o.requiresSignature) !== undefined) out.requiresSignature = optBool(o.requiresSignature)
  if (optBool(o.requiresPayment) !== undefined) out.requiresPayment = optBool(o.requiresPayment)
  if (optBool(o.requiresLocation) !== undefined) out.requiresLocation = optBool(o.requiresLocation)
  if (expectedVersion !== undefined) out.expectedVersion = expectedVersion
  return out
}

/** POST /v1/field-operations/:id/assignments gövdesi. */
export function assertValidAddAssignmentInput(body: unknown): AddAssignmentInput {
  const o = asObject(body)
  const details: Record<string, string> = {}
  const userId = str(o.userId)
  if (!userId) details.userId = 'Zorunlu'
  const role = str(o.role)
  if (!role || !isFieldOperationAssignmentRole(role)) details.role = 'Geçersiz atama rolü'
  if (Object.keys(details).length > 0) fail(details)
  return {
    userId: userId as string,
    role: role as string,
    ...(optBool(o.isPrimary) !== undefined ? { isPrimary: optBool(o.isPrimary) } : {}),
  }
}

/** POST /v1/field-operations/:id/transition gövdesi. */
export function assertValidStatusChangeInput(body: unknown): StatusChangeInput {
  const o = asObject(body)
  const details: Record<string, string> = {}
  const toStatus = str(o.toStatus)
  if (!toStatus || !isFieldOperationStatus(toStatus)) details.toStatus = 'Geçersiz hedef durum'
  const expectedVersion = typeof o.expectedVersion === 'number' ? o.expectedVersion : undefined
  if (o.expectedVersion !== undefined && expectedVersion === undefined) {
    details.expectedVersion = 'Sayı olmalı'
  }
  const latitude = typeof o.latitude === 'number' ? o.latitude : undefined
  const longitude = typeof o.longitude === 'number' ? o.longitude : undefined
  if (Object.keys(details).length > 0) fail(details)
  return {
    toStatus: toStatus as string,
    ...(expectedVersion !== undefined ? { expectedVersion } : {}),
    note: str(o.note) ?? null,
    ...(latitude !== undefined ? { latitude } : {}),
    ...(longitude !== undefined ? { longitude } : {}),
  }
}

/** GET /v1/field-operations query string doğrulama/normalizasyon. */
export function parseListFieldOperationQuery(query: unknown): ListFieldOperationQuery {
  const q = (query && typeof query === 'object' ? query : {}) as Record<string, unknown>

  const splitCsv = (v: unknown): string[] | undefined => {
    const s = str(v)
    if (!s) return undefined
    const parts = s.split(',').map((p) => p.trim()).filter(Boolean)
    return parts.length ? parts : undefined
  }

  const status = splitCsv(q.status)
  if (status && !status.every((s) => isFieldOperationStatus(s))) {
    fail({ status: 'Geçersiz durum değeri' })
  }
  const type = splitCsv(q.type)
  if (type && !type.every((t) => isFieldOperationType(t))) {
    fail({ type: 'Geçersiz tür değeri' })
  }

  const rawLimit = Number(q.limit)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 200) : 100
  const rawOffset = Number(q.offset)
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0

  return {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(str(q.assigneeUserId) ? { assigneeUserId: str(q.assigneeUserId) } : {}),
    ...(str(q.vehicleId) ? { vehicleId: str(q.vehicleId) } : {}),
    ...(str(q.teamId) ? { teamId: str(q.teamId) } : {}),
    ...(str(q.dateFrom) ? { dateFrom: str(q.dateFrom) } : {}),
    ...(str(q.dateTo) ? { dateTo: str(q.dateTo) } : {}),
    ...(q.includeDeleted === 'true' || q.includeDeleted === true ? { includeDeleted: true } : {}),
    limit,
    offset,
  }
}
