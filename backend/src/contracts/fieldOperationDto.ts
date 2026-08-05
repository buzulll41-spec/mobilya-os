/**
 * Enterprise 2.2 S2 — Field Operation DTO'ları (list item + detail response).
 * Prisma satırlarını istemci sözleşmesine (ISO tarih, sade alanlar) dönüştürür.
 */

import type { Prisma } from '@prisma/client'

type FieldOperationBase = Prisma.FieldOperationGetPayload<{}>

export type FieldOperationDetailRow = Prisma.FieldOperationGetPayload<{
  include: {
    timeline: true
    assignments: true
    vehicles: true
    issues: true
    partRequests: true
    evidence: true
    customerApprovals: true
    tasks: true
  }
}>

export type FieldOperationListRow = Prisma.FieldOperationGetPayload<{
  include: { assignments: true }
}>

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null
}

function dateOnly(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null
}

function baseFields(row: FieldOperationBase) {
  return {
    id: row.id,
    operationNumber: row.operationNumber,
    type: row.type,
    status: row.status,
    priority: row.priority,
    title: row.title,
    description: row.description,
    orderId: row.orderId,
    shipmentPlanId: row.shipmentPlanId,
    serviceRecordId: row.serviceRecordId,
    customerId: row.customerId,
    addressId: row.addressId,
    plannedDate: dateOnly(row.plannedDate),
    plannedStartTime: row.plannedStartTime,
    plannedEndTime: row.plannedEndTime,
    actualStartTime: iso(row.actualStartTime),
    actualEndTime: iso(row.actualEndTime),
    assignedTeamId: row.assignedTeamId,
    assignedVehicleId: row.assignedVehicleId,
    requiresPhoto: row.requiresPhoto,
    requiresSignature: row.requiresSignature,
    requiresPayment: row.requiresPayment,
    requiresLocation: row.requiresLocation,
    version: row.version,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  }
}

function mapAssignment(a: FieldOperationDetailRow['assignments'][number]) {
  return {
    id: a.id,
    userId: a.userId,
    role: a.role,
    isPrimary: a.isPrimary,
    assignedByUserId: a.assignedByUserId,
    assignedAt: iso(a.assignedAt),
    unassignedAt: iso(a.unassignedAt),
  }
}

/** Liste kartı DTO'su (özet + aktif atama bilgisi). */
export function toFieldOperationListItemDto(row: FieldOperationListRow) {
  const activeAssignments = row.assignments.filter((a) => !a.unassignedAt)
  const primary = activeAssignments.find((a) => a.isPrimary) ?? activeAssignments[0] ?? null
  return {
    ...baseFields(row),
    assigneeCount: activeAssignments.length,
    primaryAssigneeUserId: primary?.userId ?? null,
    primaryAssigneeRole: primary?.role ?? null,
  }
}

/** Detay DTO'su (tüm ilişkiler + timeline). */
export function toFieldOperationDetailDto(row: FieldOperationDetailRow) {
  return {
    ...baseFields(row),
    assignments: row.assignments.map(mapAssignment),
    vehicles: row.vehicles.map((v) => ({
      id: v.id,
      vehicleId: v.vehicleId,
      assignedAt: iso(v.assignedAt),
      releasedAt: iso(v.releasedAt),
    })),
    timeline: row.timeline
      .slice()
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .map((t) => ({
        id: t.id,
        eventType: t.eventType,
        fromStatus: t.fromStatus,
        toStatus: t.toStatus,
        note: t.note,
        actorUserId: t.actorUserId,
        latitude: t.latitude,
        longitude: t.longitude,
        occurredAt: iso(t.occurredAt),
      })),
    issues: row.issues.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      status: i.status,
      description: i.description,
      reportedByUserId: i.reportedByUserId,
      assignedToUserId: i.assignedToUserId,
      resolvedAt: iso(i.resolvedAt),
      createdAt: iso(i.createdAt),
    })),
    partRequests: row.partRequests.map((p) => ({
      id: p.id,
      productId: p.productId,
      quantity: p.quantity,
      reason: p.reason,
      status: p.status,
      requestedByUserId: p.requestedByUserId,
      approvedByUserId: p.approvedByUserId,
      createdAt: iso(p.createdAt),
    })),
    evidence: row.evidence
      .filter((e) => !e.deletedAt)
      .map((e) => ({
        id: e.id,
        type: e.type,
        fileUrl: e.fileUrl,
        fileName: e.fileName,
        mimeType: e.mimeType,
        capturedAt: iso(e.capturedAt),
        uploadedByUserId: e.uploadedByUserId,
      })),
    customerApprovals: row.customerApprovals.map((c) => ({
      id: c.id,
      customerName: c.customerName,
      approvalType: c.approvalType,
      approved: c.approved,
      signatureEvidenceId: c.signatureEvidenceId,
      approvedAt: iso(c.approvedAt),
    })),
    tasks: row.tasks
      .filter((t) => !t.deletedAt)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        sequence: t.sequence,
        assignedUserId: t.assignedUserId,
      })),
  }
}
