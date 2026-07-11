/**
 * Enterprise 2.2 — Saha Operasyon Merkezi çekirdek domain sabitleri.
 *
 * Repo konvansiyonu: durum/tip alanları Prisma'da `String` kolon; kanonik değerler
 * ve geçişler burada tanımlanır (ayrı enum/lookup tablosu YOK). Bu dosya saf domain'dir
 * (Prisma/DB'ye bağımlı değil) → hızlı unit testlerle doğrulanır.
 */

/** İş türleri (FieldOperationType). */
export const FIELD_OPERATION_TYPE = {
  DELIVERY: 'DELIVERY',
  INSTALLATION: 'INSTALLATION',
  SERVICE: 'SERVICE',
  MEASUREMENT: 'MEASUREMENT',
  PART_REQUEST: 'PART_REQUEST',
  RETURN_PICKUP: 'RETURN_PICKUP',
  EXCHANGE: 'EXCHANGE',
  PAYMENT_COLLECTION: 'PAYMENT_COLLECTION',
  PRODUCT_PICKUP: 'PRODUCT_PICKUP',
  FINAL_INSPECTION: 'FINAL_INSPECTION',
  DISCOVERY: 'DISCOVERY',
  MAINTENANCE: 'MAINTENANCE',
  OTHER: 'OTHER',
} as const

export type FieldOperationType = (typeof FIELD_OPERATION_TYPE)[keyof typeof FIELD_OPERATION_TYPE]

/** Durumlar (FieldOperationStatus). */
export const FIELD_OPERATION_STATUS = {
  PLANNED: 'PLANNED',
  ASSIGNED: 'ASSIGNED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  ON_THE_WAY: 'ON_THE_WAY',
  ARRIVED: 'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  WAITING: 'WAITING',
  PARTIAL_COMPLETED: 'PARTIAL_COMPLETED',
  COMPLETED: 'COMPLETED',
  CUSTOMER_APPROVAL_PENDING: 'CUSTOMER_APPROVAL_PENDING',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
  RESCHEDULED: 'RESCHEDULED',
} as const

export type FieldOperationStatus =
  (typeof FIELD_OPERATION_STATUS)[keyof typeof FIELD_OPERATION_STATUS]

/** Öncelikler. */
export const FIELD_OPERATION_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const

export type FieldOperationPriority =
  (typeof FIELD_OPERATION_PRIORITY)[keyof typeof FIELD_OPERATION_PRIORITY]

/** Atama rolleri (saha alt-tipi; auth rolü DEĞİL). */
export const FIELD_OPERATION_ASSIGNMENT_ROLE = {
  DRIVER: 'DRIVER',
  INSTALLER: 'INSTALLER',
  ASSISTANT: 'ASSISTANT',
  SERVICE_TECHNICIAN: 'SERVICE_TECHNICIAN',
  MEASUREMENT_STAFF: 'MEASUREMENT_STAFF',
  WAREHOUSE_STAFF: 'WAREHOUSE_STAFF',
  SUPERVISOR: 'SUPERVISOR',
} as const

export type FieldOperationAssignmentRole =
  (typeof FIELD_OPERATION_ASSIGNMENT_ROLE)[keyof typeof FIELD_OPERATION_ASSIGNMENT_ROLE]

/** Sorun türleri. */
export const FIELD_OPERATION_ISSUE_TYPE = {
  MISSING_PRODUCT: 'MISSING_PRODUCT',
  DAMAGED_PRODUCT: 'DAMAGED_PRODUCT',
  WRONG_PRODUCT: 'WRONG_PRODUCT',
  CUSTOMER_NOT_HOME: 'CUSTOMER_NOT_HOME',
  ADDRESS_PROBLEM: 'ADDRESS_PROBLEM',
  INSTALLATION_AREA_NOT_READY: 'INSTALLATION_AREA_NOT_READY',
  VEHICLE_PROBLEM: 'VEHICLE_PROBLEM',
  PAYMENT_PROBLEM: 'PAYMENT_PROBLEM',
  REPEAT_SERVICE_REQUIRED: 'REPEAT_SERVICE_REQUIRED',
  OTHER: 'OTHER',
} as const

export type FieldOperationIssueType =
  (typeof FIELD_OPERATION_ISSUE_TYPE)[keyof typeof FIELD_OPERATION_ISSUE_TYPE]

export const FIELD_OPERATION_ISSUE_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export const FIELD_OPERATION_ISSUE_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const

/** Kanıt türleri. */
export const FIELD_OPERATION_EVIDENCE_TYPE = {
  BEFORE_PHOTO: 'BEFORE_PHOTO',
  AFTER_PHOTO: 'AFTER_PHOTO',
  DAMAGE_PHOTO: 'DAMAGE_PHOTO',
  DELIVERY_PHOTO: 'DELIVERY_PHOTO',
  PART_PHOTO: 'PART_PHOTO',
  SIGNATURE: 'SIGNATURE',
  DOCUMENT: 'DOCUMENT',
  OTHER: 'OTHER',
} as const

export type FieldOperationEvidenceType =
  (typeof FIELD_OPERATION_EVIDENCE_TYPE)[keyof typeof FIELD_OPERATION_EVIDENCE_TYPE]

/** Eksik parça talebi durumları. */
export const FIELD_OPERATION_PART_REQUEST_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DELIVERED: 'DELIVERED',
} as const

/** Timeline olay türleri. */
export const FIELD_OPERATION_TIMELINE_EVENT = {
  CREATED: 'CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNMENT_ADDED: 'ASSIGNMENT_ADDED',
  ASSIGNMENT_REMOVED: 'ASSIGNMENT_REMOVED',
  SOFT_DELETED: 'SOFT_DELETED',
} as const

/** Duplicate guard için kaynak türleri (öncelik sırasıyla türetilir). */
export const FIELD_OPERATION_SOURCE_TYPE = {
  SHIPMENT_PLAN: 'SHIPMENT_PLAN',
  SERVICE_RECORD: 'SERVICE_RECORD',
  ORDER: 'ORDER',
} as const

/** Terminal (kapanmış) durumlar — bu durumlarda operasyon "aktif" değildir. */
export const FIELD_OPERATION_TERMINAL_STATUSES: ReadonlySet<string> = new Set<string>([
  FIELD_OPERATION_STATUS.CLOSED,
  FIELD_OPERATION_STATUS.CANCELLED,
])

/**
 * Durum makinesi — izin verilen geçişler (yalnızca domain seviyesi; UI yok).
 */
export const FIELD_OPERATION_ALLOWED_NEXT: Readonly<Record<string, readonly string[]>> = {
  PLANNED: ['ASSIGNED', 'RESCHEDULED', 'CANCELLED'],
  ASSIGNED: ['PREPARING', 'ON_THE_WAY', 'RESCHEDULED', 'CANCELLED'],
  PREPARING: ['READY', 'ON_THE_WAY', 'BLOCKED', 'RESCHEDULED', 'CANCELLED'],
  READY: ['ON_THE_WAY', 'RESCHEDULED', 'CANCELLED'],
  ON_THE_WAY: ['ARRIVED', 'BLOCKED', 'RESCHEDULED', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'BLOCKED', 'WAITING', 'RESCHEDULED'],
  IN_PROGRESS: ['BLOCKED', 'WAITING', 'PARTIAL_COMPLETED', 'COMPLETED'],
  BLOCKED: ['IN_PROGRESS', 'WAITING', 'RESCHEDULED', 'CANCELLED'],
  WAITING: ['IN_PROGRESS', 'BLOCKED', 'RESCHEDULED', 'CANCELLED'],
  PARTIAL_COMPLETED: ['IN_PROGRESS', 'COMPLETED', 'CUSTOMER_APPROVAL_PENDING', 'CLOSED'],
  COMPLETED: ['CUSTOMER_APPROVAL_PENDING', 'CLOSED'],
  CUSTOMER_APPROVAL_PENDING: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: [],
  RESCHEDULED: ['PLANNED', 'ASSIGNED', 'CANCELLED'],
}

const ALL_TYPES = new Set<string>(Object.values(FIELD_OPERATION_TYPE))
const ALL_STATUSES = new Set<string>(Object.values(FIELD_OPERATION_STATUS))
const ALL_PRIORITIES = new Set<string>(Object.values(FIELD_OPERATION_PRIORITY))
const ALL_ASSIGNMENT_ROLES = new Set<string>(Object.values(FIELD_OPERATION_ASSIGNMENT_ROLE))

export function isFieldOperationType(value: unknown): value is FieldOperationType {
  return typeof value === 'string' && ALL_TYPES.has(value)
}

export function isFieldOperationStatus(value: unknown): value is FieldOperationStatus {
  return typeof value === 'string' && ALL_STATUSES.has(value)
}

export function isFieldOperationPriority(value: unknown): value is FieldOperationPriority {
  return typeof value === 'string' && ALL_PRIORITIES.has(value)
}

export function isFieldOperationAssignmentRole(
  value: unknown,
): value is FieldOperationAssignmentRole {
  return typeof value === 'string' && ALL_ASSIGNMENT_ROLES.has(value)
}

/** Terminal durum mu (kapanmış/iptal)? */
export function isTerminalFieldOperationStatus(status: string): boolean {
  return FIELD_OPERATION_TERMINAL_STATUSES.has(status)
}

/** Operasyon "aktif" mi (terminal değil ve silinmemiş)? Duplicate guard bunu kullanır. */
export function isActiveFieldOperation(status: string, deletedAt: Date | null | undefined): boolean {
  return !deletedAt && !isTerminalFieldOperationStatus(status)
}

/** `from → to` geçişine izin var mı? */
export function canTransitionFieldOperation(from: string, to: string): boolean {
  if (from === to) return false
  const allowed = FIELD_OPERATION_ALLOWED_NEXT[from]
  return Array.isArray(allowed) && allowed.includes(to)
}
