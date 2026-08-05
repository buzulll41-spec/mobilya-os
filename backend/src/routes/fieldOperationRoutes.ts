/**
 * Enterprise 2.2 S2 — Field Operation API rotaları.
 *
 * CRUD + listeleme + detay + durum geçişi + atama + soft delete + bugünkü işler.
 * Global RBAC hook'una ek olarak servis seviyesinde de yetki (Permission Service)
 * kontrol edilir. UI/harita/foto/offline YOK — yalnızca backend omurgası.
 */

import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { requireAuthUser } from '../middleware/authenticateRequest.js'
import {
  addFieldOperationAssignment,
  createFieldOperation,
  softDeleteFieldOperation,
  transitionFieldOperationStatus,
  unassignFieldOperationAssignment,
  updateFieldOperation,
} from '../services/fieldOperations/fieldOperationService.js'
import {
  getFieldOperationDetail,
  listFieldOperations,
  listTodayFieldOperations,
} from '../services/fieldOperations/fieldOperationReadModel.js'
import {
  assertValidAddAssignmentInput,
  assertValidCreateFieldOperationInput,
  assertValidStatusChangeInput,
  assertValidUpdateFieldOperationInput,
  parseListFieldOperationQuery,
} from '../services/fieldOperations/fieldOperationValidationService.js'
import {
  assertFieldOpPermission,
  FIELD_OP_ACTION,
} from '../services/fieldOperations/fieldOperationPermissionService.js'

function paramId(req: { params: unknown }): string {
  return String((req.params as { id: string }).id)
}

export function registerFieldOperationRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/field-operations', async (req) => {
    assertFieldOpPermission(requireAuthUser(req), FIELD_OP_ACTION.READ)
    const query = parseListFieldOperationQuery(req.query)
    return listFieldOperations(prisma, query)
  })

  app.get('/v1/field-operations/today', async (req) => {
    assertFieldOpPermission(requireAuthUser(req), FIELD_OP_ACTION.READ)
    const q = req.query as Record<string, string | undefined>
    return listTodayFieldOperations(prisma, q.date)
  })

  app.get('/v1/field-operations/:id', async (req) => {
    assertFieldOpPermission(requireAuthUser(req), FIELD_OP_ACTION.READ)
    return getFieldOperationDetail(prisma, paramId(req))
  })

  app.post('/v1/field-operations', async (req, reply) => {
    const user = requireAuthUser(req)
    assertFieldOpPermission(user, FIELD_OP_ACTION.CREATE)
    const input = assertValidCreateFieldOperationInput(req.body)
    const created = await createFieldOperation(prisma, input, { authUser: user })
    const detail = await getFieldOperationDetail(prisma, created.id)
    return reply.status(201).send(detail)
  })

  app.patch('/v1/field-operations/:id', async (req) => {
    const user = requireAuthUser(req)
    assertFieldOpPermission(user, FIELD_OP_ACTION.UPDATE)
    const input = assertValidUpdateFieldOperationInput(req.body)
    await updateFieldOperation(prisma, paramId(req), input, { authUser: user })
    return getFieldOperationDetail(prisma, paramId(req))
  })

  app.post('/v1/field-operations/:id/transition', async (req) => {
    const user = requireAuthUser(req)
    assertFieldOpPermission(user, FIELD_OP_ACTION.TRANSITION)
    const input = assertValidStatusChangeInput(req.body)
    await transitionFieldOperationStatus(prisma, paramId(req), input.toStatus, {
      authUser: user,
      expectedVersion: input.expectedVersion,
      note: input.note,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    return getFieldOperationDetail(prisma, paramId(req))
  })

  app.post('/v1/field-operations/:id/assignments', async (req, reply) => {
    const user = requireAuthUser(req)
    assertFieldOpPermission(user, FIELD_OP_ACTION.ASSIGN)
    const input = assertValidAddAssignmentInput(req.body)
    await addFieldOperationAssignment(prisma, paramId(req), input, { authUser: user })
    const detail = await getFieldOperationDetail(prisma, paramId(req))
    return reply.status(201).send(detail)
  })

  app.delete('/v1/field-operations/:id/assignments/:assignmentId', async (req) => {
    const user = requireAuthUser(req)
    assertFieldOpPermission(user, FIELD_OP_ACTION.ASSIGN)
    const assignmentId = String((req.params as { assignmentId: string }).assignmentId)
    await unassignFieldOperationAssignment(prisma, paramId(req), assignmentId, { authUser: user })
    return getFieldOperationDetail(prisma, paramId(req))
  })

  app.delete('/v1/field-operations/:id', async (req, reply) => {
    const user = requireAuthUser(req)
    assertFieldOpPermission(user, FIELD_OP_ACTION.DELETE)
    const q = req.query as Record<string, string | undefined>
    const expectedVersion = q.expectedVersion !== undefined ? Number(q.expectedVersion) : undefined
    await softDeleteFieldOperation(prisma, paramId(req), {
      authUser: user,
      ...(expectedVersion !== undefined && Number.isFinite(expectedVersion) ? { expectedVersion } : {}),
    })
    return reply.status(204).send()
  })
}
