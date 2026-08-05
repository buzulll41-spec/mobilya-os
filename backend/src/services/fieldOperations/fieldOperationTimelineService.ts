/**
 * Enterprise 2.2 S2 — Timeline Service.
 *
 * Append-only saha operasyonu zaman çizelgesi. Tüm timeline kayıtları backend'de
 * üretilir; hiçbir satır güncellenmez/silinmez (yalnızca create). Servis, verilen
 * transaction client üzerinden yazar ki çağıran akışla atomik olsun.
 */

import { Prisma } from '@prisma/client'
import { FIELD_OPERATION_TIMELINE_EVENT, timelineEventForStatus } from '../../constants/fieldOperationConstants.js'

export { timelineEventForStatus }

type Tx = Prisma.TransactionClient

export type AppendTimelineInput = {
  fieldOperationId: string
  eventType: string
  fromStatus?: string | null
  toStatus?: string | null
  note?: string | null
  actorUserId?: string | null
  latitude?: number | null
  longitude?: number | null
  occurredAt?: Date
}

/** Timeline'a tek bir olay ekler (append-only). */
export async function appendFieldOperationTimeline(
  tx: Tx,
  input: AppendTimelineInput,
): Promise<void> {
  await tx.fieldOperationTimeline.create({
    data: {
      fieldOperationId: input.fieldOperationId,
      eventType: input.eventType,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      note: input.note ?? null,
      actorUserId: input.actorUserId ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      occurredAt: input.occurredAt ?? new Date(),
    },
  })
}

/** Oluşturma olayını (CREATE) yazar. */
export async function appendCreateEvent(
  tx: Tx,
  fieldOperationId: string,
  toStatus: string,
  actorUserId: string | null,
  occurredAt: Date,
): Promise<void> {
  await appendFieldOperationTimeline(tx, {
    fieldOperationId,
    eventType: FIELD_OPERATION_TIMELINE_EVENT.CREATE,
    fromStatus: null,
    toStatus,
    actorUserId,
    occurredAt,
  })
}
