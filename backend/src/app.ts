import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { prisma } from './prisma.js'
import { normalizeError, AppHttpError } from './errors/apiError.js'
import { listSalesOrderListItems } from './services/listOrdersProjection.js'
import { listDomainEvents, listDomainEventsForOrder } from './services/listDomainEvents.js'
import {
  assertValidPostDomainEventRequest,
  createDomainEvent,
} from './services/createDomainEvent.js'
import { registerAiWorkerRoutes } from './routes/aiWorkerRoutes.js'
import { registerAiToolRoutes } from './routes/aiToolRoutes.js'
import { registerGraphRoutes } from './routes/graphRoutes.js'
import { registerPredictionRoutes } from './routes/predictionRoutes.js'
import { registerLearningRoutes } from './routes/learningRoutes.js'
import { registerDecisionRoutes } from './routes/decisionRoutes.js'
import { registerOptimizationRoutes } from './routes/optimizationRoutes.js'
import { registerCollaborationRoutes } from './routes/collaborationRoutes.js'
import { registerBoardMeetingRoutes } from './routes/boardMeetingRoutes.js'
import { registerEnterpriseReleaseRoutes } from './routes/enterpriseReleaseRoutes.js'
import { registerFieldOperationRoutes } from './routes/fieldOperationRoutes.js'
import { registerEnterpriseRateLimit } from './middleware/enterpriseRateLimit.js'
import { registerAuthHook, requireAuthUser } from './middleware/authenticateRequest.js'
import {
  assertValidLoginRequest,
  getUserById,
  loginUser,
} from './services/auth/loginUser.js'
import { listTaskStatesForUser } from './services/taskState/listTaskStates.js'
import {
  assertValidUpsertTaskStateRequest,
  deleteTaskState,
  upsertTaskState,
} from './services/taskState/upsertTaskState.js'
import { assertValidCreateOrderRequest, createSalesOrder } from './services/createSalesOrder.js'
import {
  assertValidPostOrderPaymentRequest,
  postOrderPayment,
} from './services/postOrderPayment.js'
import {
  assertValidApproveOrderPaymentRequest,
  approveOrderPayment,
} from './services/approveOrderPayment.js'
import {
  assertValidRejectOrderPaymentRequest,
  rejectOrderPayment,
} from './services/rejectOrderPayment.js'
import {
  assertValidPatchOrderTerminRequest,
  patchOrderTermin,
} from './services/patchOrderTermin.js'
import {
  assertValidCreateOrderMissingItemRequest,
  createOrderMissingItem,
} from './services/createOrderMissingItem.js'
import { listOrderMissingItems } from './services/listOrderMissingItems.js'
import {
  assertValidPatchMissingItemStatusRequest,
  patchMissingItemStatus,
} from './services/patchMissingItemStatus.js'
import {
  assertValidMarkMissingItemReadyForShipmentRequest,
  markMissingItemReadyForShipment,
} from './services/markMissingItemReadyForShipment.js'
import {
  assertValidPatchOrderStatusRequest,
  patchOrderStatus,
} from './services/patchOrderStatus.js'
import {
  assertValidCreateOrderShipmentRequest,
  createOrderShipment,
} from './services/createOrderShipment.js'
import { listOrderShipments } from './services/listOrderShipments.js'
import { listOrderPayments } from './services/listOrderPayments.js'
import { listShipmentPlanLines } from './services/listShipmentPlanLines.js'
import { listOrderLines } from './services/listOrderLines.js'
import {
  assertValidConfirmOrderLineSupplyRequest,
  confirmOrderLineSupplySent,
  revertOrderLineWarehouseArrival,
} from './services/confirmOrderLineSupplySent.js'
import {
  markOrderLineShipmentReady,
  reconcileOrderLineSupplyState,
  revertOrderLineShipmentReady,
  revertOrderLineSupplySent,
} from './services/orderLineSupplyActions.js'
import { listShipmentQueue } from './services/listShipmentQueue.js'
import {
  assertValidPatchShipmentStatusRequest,
  patchShipmentStatus,
} from './services/patchShipmentStatus.js'
import { listShipmentPlans } from './services/listShipmentPlans.js'
import {
  assertValidConfirmPlanDeliveryRequest,
  assertValidFailPlanDeliveryRequest,
  assertValidPostponePlanDeliveryRequest,
  confirmPlanDelivery,
  failPlanDelivery,
  postponePlanDelivery,
  revertPlanDelivery,
} from './services/planDeliveryActions.js'
import {
  assertValidPatchShipmentPlanRequest,
  assertValidUpsertShipmentPlanRequest,
  deleteShipmentPlan,
  patchShipmentPlan,
  upsertShipmentPlan,
} from './services/upsertShipmentPlan.js'
import { listShipmentGroups } from './services/listShipmentGroups.js'
import {
  assertValidCreateShipmentGroupRequest,
  createShipmentGroup,
} from './services/createShipmentGroup.js'
import { createOrderBodySchema } from './schemas/createOrderSchema.js'
import { CORS_ALLOWED_HEADERS, CORS_ALLOWED_METHODS } from './config/cors.js'
import { assertServiceErrorMapped } from './errors/mapServiceError.js'
import { listSuppliers } from './services/listSuppliers.js'
import {
  assertValidCreateSupplierRequest,
  createSupplier,
} from './services/createSupplier.js'
import { getSupplier } from './services/getSupplier.js'
import {
  assertValidPatchSupplierRequest,
  patchSupplier,
} from './services/patchSupplier.js'
import { listSupplierLedger } from './services/listSupplierLedger.js'
import {
  assertValidPostSupplierPaymentRequest,
  postSupplierPayment,
} from './services/postSupplierPayment.js'
import {
  assertValidCreateIncomingGoodsRequest,
  createIncomingGoods,
} from './services/createIncomingGoods.js'
import { listIncomingGoods } from './services/listIncomingGoods.js'
import { getIncomingGoodsKpis } from './services/getIncomingGoodsKpis.js'
import { listPendingOrderLinesForIncoming } from './services/listPendingOrderLinesForIncoming.js'
import { listOrderLineReceiving } from './services/listOrderLineReceiving.js'
import { getSalesSourceAnalytics } from './services/getSalesSourceAnalytics.js'
import { listWarehouseEntries } from './services/listWarehouseEntries.js'
import { getDataQualityReport } from './services/getDataQualityReport.js'
import { getProfitabilityAnalytics } from './services/getProfitabilityAnalytics.js'
import { getManagerCockpit } from './services/getManagerCockpit.js'
import { getCeoControlCenter } from './services/getCeoControlCenter.js'
import { getOperationsAgents } from './services/getOperationsAgents.js'
import { getExecutiveDirector, runExecutiveDirector } from './services/getExecutiveDirector.js'
import { getStrategicIntelligence } from './services/getStrategicIntelligence.js'
import { getCompanySimulation, runCompanySimulation } from './services/getCompanySimulation.js'
import { getBoardDirectors } from './services/getBoardDirectors.js'
import { getCeoIntelligence } from './services/getCeoIntelligence.js'
import { getChairmanIntelligence } from './services/getChairmanIntelligence.js'
import { getFutureEngine } from './services/getFutureEngine.js'
import { getInvestorIntelligence } from './services/getInvestorIntelligence.js'
import { getHoldingCenter } from './services/getHoldingCenter.js'
import { getGroupChairman } from './services/getGroupChairman.js'
import { getBusinessBrain } from './services/getBusinessBrain.js'
import { getActionOrchestrator } from './services/getActionOrchestrator.js'
import { runActionOrchestrator } from './services/runActionOrchestrator.js'
import { getPerformanceFeedback } from './services/getPerformanceFeedback.js'
import { getLearningEngine } from './services/getLearningEngine.js'
import { getOptimizationEngine } from './services/getOptimizationEngine.js'
import { applyOptimizationEngine } from './services/applyOptimizationEngine.js'
import { getGoalEngine } from './services/getGoalEngine.js'
import { getEnterpriseCommandCenter } from './services/getEnterpriseCommandCenter.js'
import { updateGoalProgress } from './services/updateGoalProgress.js'
import type { SimulationInputDto } from './contracts/companySimulationDto.js'
import { getOperationsAgentDetail } from './services/getOperationsAgentDetail.js'
import { runOperationsAgents } from './services/runOperationsAgents.js'
import { getForecastEngine } from './services/getForecastEngine.js'
import { getOperationsAdvisor } from './services/getOperationsAdvisor.js'
import { getActionCenter } from './services/getActionCenter.js'
import { assertValidActionStatus, updateActionStatus } from './services/updateActionStatus.js'
import { getOperationCases } from './services/getOperationCases.js'
import { getOperationCaseDetail } from './services/getOperationCaseDetail.js'
import { assertValidOperationCasePatch, updateOperationCase } from './services/updateOperationCase.js'
import { getAutomationJobs } from './services/getAutomationJobs.js'
import {
  approveAutomationJob,
  assertValidApproveBody,
  assertValidBulkIds,
  bulkApproveAutomationJobs,
  bulkCancelAutomationJobs,
  cancelAutomationJob,
} from './services/approveAutomationJob.js'
import { bulkRunAutomationJobs, runAutomationJob } from './services/runAutomationJob.js'
import { getBusinessRules } from './services/getBusinessRules.js'
import {
  assertValidBusinessRulePatch,
  getBusinessRuleDetail,
  updateBusinessRule,
} from './services/updateBusinessRule.js'
import { assertValidRuleTestBody, testBusinessRule } from './services/testBusinessRules.js'
import { getSupplyOperationsBoard } from './services/getSupplyOperationsBoard.js'
import { getSupplierLedgerCenter } from './services/getSupplierLedgerCenter.js'
import { getSupplierOperations } from './services/getSupplierOperations.js'
import { listProducts } from './services/listProducts.js'
import { getProduct } from './services/getProduct.js'
import { listProductMaster } from './services/listProductMaster.js'
import { getProductMaster } from './services/getProductMaster.js'
import {
  assertValidCreateProductMasterRequest,
  createProductMaster,
} from './services/createProductMaster.js'
import {
  assertValidPatchProductMasterRequest,
  patchProductMaster,
} from './services/patchProductMaster.js'
import {
  assertValidCreateProductVariantRequest,
  createProductVariant,
} from './services/createProductVariant.js'
import {
  assertValidPatchProductVariantRequest,
  patchProductVariant,
} from './services/patchProductVariant.js'
import { listMediaAssets } from './services/listMediaAssets.js'
import {
  assertValidPutProductMediaRequest,
  getProductMediaBundle,
  putProductMediaLinks,
} from './services/productMediaLinks.js'
import { prepareWooSync } from './services/prepareWooSync.js'
import { publishWooDraft } from './services/publishWooDraft.js'
import {
  assertValidUpsertWooConnectionRequest,
} from './contracts/wooConnectionDto.js'
import {
  getActiveWooConnection,
  upsertWooConnection,
} from './services/wooConnection/manageWooConnection.js'
import {
  getWooConnectionHealth,
  testWooConnectionLive,
} from './services/wooConnection/testWooConnectionLive.js'
import {
  assertValidCreateProductRequest,
  createProduct,
} from './services/createProduct.js'
import {
  assertValidPatchProductRequest,
  patchProduct,
} from './services/patchProduct.js'
import { duplicateProduct } from './services/duplicateProduct.js'
import { listUsers } from './services/users/listUsers.js'
import {
  assertValidCreateUserRequest,
  assertValidPatchUserRequest,
  createUser,
  patchUser,
  resetUserPassword,
} from './services/users/manageUser.js'

/** GET handler'ları — Prisma bağlantı hatalarını 503'e çevirir. */
function safeGet<T>(handler: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      return await handler()
    } catch (err) {
      assertServiceErrorMapped(err)
      throw err
    }
  }
}

function resolveCorsOrigin():
  | boolean
  | string
  | string[]
  | ((origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => void) {
  const raw = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ]
  const allowed = [...new Set([...list, ...defaults])]

  if (process.env.NODE_ENV === 'production' && list.length === 1) {
    return list[0]
  }

  return (origin, cb) => {
    if (!origin || allowed.includes(origin)) {
      cb(null, true)
      return
    }
    cb(null, false)
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })

  await app.register(cors, {
    origin: resolveCorsOrigin(),
    methods: [...CORS_ALLOWED_METHODS],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
  })

  registerAuthHook(app)
  registerEnterpriseRateLimit(app)

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof AppHttpError) {
      return reply.status(err.statusCode).send(err.toJSON())
    }
    if (err && typeof err === 'object' && 'validation' in err) {
      const v = err as { message: string; validation?: unknown }
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: v.message,
        details: v.validation,
      })
    }
    app.log.error(err)
    const normalized = normalizeError(err)
    return reply.status(normalized.statusCode).send(normalized)
  })

  app.get(
    '/health',
    safeGet(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return { ok: true, database: 'up' as const }
      } catch {
        return { ok: false, database: 'down' as const }
      }
    }),
  )

  app.post('/v1/auth/login', async (req, reply) => {
    const body = assertValidLoginRequest(req.body)
    const result = await loginUser(prisma, body)
    return reply.status(200).send(result)
  })

  app.post('/v1/auth/logout', async (_req, reply) => {
    return reply.status(204).send()
  })

  app.get('/v1/auth/me', async (req) => {
    const user = requireAuthUser(req)
    const dto = await getUserById(prisma, user.id)
    if (!dto) {
      throw new AppHttpError(401, 'Kullanıcı bulunamadı', 'Unauthorized')
    }
    return dto
  })

  app.get('/v1/task-states', async (req) => {
    const user = requireAuthUser(req)
    return listTaskStatesForUser(prisma, user.id)
  })

  app.put('/v1/task-states', async (req) => {
    const user = requireAuthUser(req)
    const body = assertValidUpsertTaskStateRequest(req.body)
    return upsertTaskState(prisma, user.id, body)
  })

  app.delete('/v1/task-states/:dedupeKey', async (req, reply) => {
    const user = requireAuthUser(req)
    const dedupeKey = decodeURIComponent(String((req.params as { dedupeKey: string }).dedupeKey))
    await deleteTaskState(prisma, user.id, dedupeKey)
    return reply.status(204).send()
  })

  app.get('/v1/users', async (req) => {
    requireAuthUser(req)
    return listUsers(prisma)
  })

  app.post('/v1/users', async (req, reply) => {
    requireAuthUser(req)
    const body = assertValidCreateUserRequest(req.body)
    const dto = await createUser(prisma, body)
    return reply.status(201).send(dto)
  })

  app.patch('/v1/users/:id', async (req) => {
    requireAuthUser(req)
    const userId = String((req.params as { id: string }).id)
    const body = assertValidPatchUserRequest(req.body)
    return patchUser(prisma, userId, body)
  })

  app.post('/v1/users/:id/reset-password', async (req) => {
    requireAuthUser(req)
    const userId = String((req.params as { id: string }).id)
    return resetUserPassword(prisma, userId)
  })

  app.get('/v1/orders', safeGet(() => listSalesOrderListItems(prisma)))

  app.get('/v1/domain-events', safeGet(() => listDomainEvents(prisma)))

  app.post('/v1/domain-events', async (req, reply) => {
    const body = assertValidPostDomainEventRequest(req.body)
    const event = await createDomainEvent(prisma, body, { authUser: requireAuthUser(req) })
    return reply.status(201).send(event)
  })

  registerAiWorkerRoutes(app, prisma)
  registerAiToolRoutes(app, prisma)
  registerGraphRoutes(app, prisma)
  registerPredictionRoutes(app, prisma)
  registerLearningRoutes(app, prisma)
  registerDecisionRoutes(app, prisma)
  registerOptimizationRoutes(app, prisma)
  registerCollaborationRoutes(app, prisma)
  registerBoardMeetingRoutes(app, prisma)
  registerEnterpriseReleaseRoutes(app, prisma)
  registerFieldOperationRoutes(app, prisma)

  app.get('/v1/orders/:id/domain-events', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listDomainEventsForOrder(prisma, orderId))()
  })

  app.get('/v1/orders/:id/events', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listDomainEventsForOrder(prisma, orderId))()
  })

  app.post(
    '/v1/orders',
    {
      schema: {
        body: createOrderBodySchema,
      },
    },
    async (req, reply) => {
      const body = assertValidCreateOrderRequest(req.body)
      const { dto, createdAt, updatedAt } = await createSalesOrder(prisma, body, {
        authUser: requireAuthUser(req),
      })
      return reply
        .header('X-Created-At', createdAt.toISOString())
        .header('X-Updated-At', updatedAt.toISOString())
        .status(201)
        .send(dto)
    },
  )

  app.get('/v1/orders/:id/payments', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listOrderPayments(prisma, orderId))()
  })

  app.post('/v1/orders/:id/payments', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const body = assertValidPostOrderPaymentRequest(req.body)
    const dto = await postOrderPayment(prisma, orderId, body, { authUser: requireAuthUser(req) })
    return reply.status(200).send(dto)
  })

  app.post('/v1/orders/:orderId/payments/:paymentId/approve', async (req, reply) => {
    const { orderId, paymentId } = req.params as { orderId: string; paymentId: string }
    const body = assertValidApproveOrderPaymentRequest(req.body)
    const dto = await approveOrderPayment(prisma, orderId, paymentId, body, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(dto)
  })

  app.post('/v1/orders/:orderId/payments/:paymentId/reject', async (req, reply) => {
    const { orderId, paymentId } = req.params as { orderId: string; paymentId: string }
    const body = assertValidRejectOrderPaymentRequest(req.body)
    const dto = await rejectOrderPayment(prisma, orderId, paymentId, body, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(dto)
  })

  app.patch('/v1/orders/:id/termin', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    const body = assertValidPatchOrderTerminRequest(req.body)
    return patchOrderTermin(prisma, orderId, body, { authUser: requireAuthUser(req) })
  })

  app.get('/v1/orders/:id/missing-items', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listOrderMissingItems(prisma, orderId))()
  })

  app.post('/v1/orders/:id/missing-items', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const body = assertValidCreateOrderMissingItemRequest(req.body)
    const result = await createOrderMissingItem(prisma, orderId, body, {
      authUser: requireAuthUser(req),
    })
    return reply.status(201).send(result)
  })

  app.patch('/v1/missing-items/:id/status', async (req) => {
    const missingItemId = String((req.params as { id: string }).id)
    const body = assertValidPatchMissingItemStatusRequest(req.body)
    return patchMissingItemStatus(prisma, missingItemId, body, {
      authUser: requireAuthUser(req),
    })
  })

  app.post('/v1/orders/:orderId/missing-items/:missingItemId/ready-for-shipment', async (req) => {
    const { orderId, missingItemId } = req.params as { orderId: string; missingItemId: string }
    const body = assertValidMarkMissingItemReadyForShipmentRequest(req.body)
    return markMissingItemReadyForShipment(prisma, orderId, missingItemId, body, {
      authUser: requireAuthUser(req),
    })
  })

  app.post('/v1/orders/:orderId/ssh/:sshId/ready-for-shipment', async (req) => {
    const { orderId, sshId } = req.params as { orderId: string; sshId: string }
    const body = assertValidMarkMissingItemReadyForShipmentRequest(req.body)
    return markMissingItemReadyForShipment(prisma, orderId, sshId, body, {
      authUser: requireAuthUser(req),
    })
  })

  app.patch('/v1/orders/:id/status', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    const body = assertValidPatchOrderStatusRequest(req.body)
    return patchOrderStatus(prisma, orderId, body, undefined, { authUser: requireAuthUser(req) })
  })

  app.get('/v1/shipments', safeGet(() => listShipmentQueue(prisma)))

  app.get('/v1/orders/:id/shipments', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listOrderShipments(prisma, orderId))()
  })

  app.get('/v1/orders/:id/shipment-plan-lines', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listShipmentPlanLines(prisma, orderId))()
  })

  app.get('/v1/orders/:id/order-lines', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listOrderLines(prisma, orderId))()
  })

  app.post('/v1/orders/:id/supply-order/confirm', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const body = assertValidConfirmOrderLineSupplyRequest(req.body)
    const result = await confirmOrderLineSupplySent(prisma, orderId, body, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(result)
  })

  app.post('/v1/orders/:id/order-lines/:lineId/revert-arrival', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const lineId = String((req.params as { lineId: string }).lineId)
    const result = await revertOrderLineWarehouseArrival(prisma, orderId, lineId, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(result)
  })

  app.post('/v1/orders/:id/order-lines/:lineId/mark-shipment-ready', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const lineId = String((req.params as { lineId: string }).lineId)
    const result = await markOrderLineShipmentReady(prisma, orderId, lineId, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(result)
  })

  app.post('/v1/orders/:id/order-lines/:lineId/revert-shipment-ready', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const lineId = String((req.params as { lineId: string }).lineId)
    const result = await revertOrderLineShipmentReady(prisma, orderId, lineId, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(result)
  })

  app.post('/v1/orders/:id/order-lines/:lineId/revert-supply', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const lineId = String((req.params as { lineId: string }).lineId)
    const result = await revertOrderLineSupplySent(prisma, orderId, lineId, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(result)
  })

  app.post('/v1/orders/:id/order-lines/:lineId/reconcile-state', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const lineId = String((req.params as { lineId: string }).lineId)
    const result = await reconcileOrderLineSupplyState(prisma, orderId, lineId, {
      authUser: requireAuthUser(req),
    })
    return reply.status(200).send(result)
  })

  app.post('/v1/orders/:id/shipments', async (req, reply) => {
    const orderId = String((req.params as { id: string }).id)
    const body = assertValidCreateOrderShipmentRequest(req.body)
    const result = await createOrderShipment(prisma, orderId, body, { authUser: requireAuthUser(req) })
    return reply.status(201).send(result)
  })

  app.patch('/v1/shipments/:id/status', async (req) => {
    const shipmentId = String((req.params as { id: string }).id)
    const body = assertValidPatchShipmentStatusRequest(req.body)
    return patchShipmentStatus(prisma, shipmentId, body, {
      authUser: requireAuthUser(req),
    })
  })

  app.get('/v1/shipment-plans', async (req) => {
    const q = req.query as { plannedDate?: string; salesOrderId?: string }
    return safeGet(() =>
      listShipmentPlans(
        prisma,
        {
          plannedDate: typeof q.plannedDate === 'string' ? q.plannedDate : undefined,
          salesOrderId: typeof q.salesOrderId === 'string' ? q.salesOrderId : undefined,
        },
        { authUser: requireAuthUser(req) },
      ),
    )()
  })

  app.post('/v1/shipment-plans', async (req, reply) => {
    const body = assertValidUpsertShipmentPlanRequest(req.body)
    const result = await upsertShipmentPlan(prisma, body, { authUser: requireAuthUser(req) })
    return reply.status(201).send(result)
  })

  app.patch('/v1/shipment-plans/:id', async (req) => {
    const planId = String((req.params as { id: string }).id)
    const patch = assertValidPatchShipmentPlanRequest(req.body)
    return patchShipmentPlan(prisma, planId, patch, { authUser: requireAuthUser(req) })
  })

  app.delete('/v1/shipment-plans/:id', async (req) => {
    const planId = String((req.params as { id: string }).id)
    return deleteShipmentPlan(prisma, planId)
  })

  app.post('/v1/shipment-plans/:id/delivery/confirm', async (req) => {
    const planId = String((req.params as { id: string }).id)
    const body = assertValidConfirmPlanDeliveryRequest(req.body)
    return confirmPlanDelivery(prisma, planId, body, { authUser: requireAuthUser(req) })
  })

  app.post('/v1/shipment-plans/:id/delivery/fail', async (req) => {
    const planId = String((req.params as { id: string }).id)
    const body = assertValidFailPlanDeliveryRequest(req.body)
    return failPlanDelivery(prisma, planId, body, { authUser: requireAuthUser(req) })
  })

  app.post('/v1/shipment-plans/:id/delivery/postpone', async (req) => {
    const planId = String((req.params as { id: string }).id)
    const body = assertValidPostponePlanDeliveryRequest(req.body)
    return postponePlanDelivery(prisma, planId, body, { authUser: requireAuthUser(req) })
  })

  app.post('/v1/shipment-plans/:id/delivery/revert', async (req) => {
    const planId = String((req.params as { id: string }).id)
    return revertPlanDelivery(prisma, planId, { authUser: requireAuthUser(req) })
  })

  app.get('/v1/shipment-groups', safeGet(() => listShipmentGroups(prisma)))

  app.post('/v1/shipment-groups', async (req, reply) => {
    const body = assertValidCreateShipmentGroupRequest(req.body)
    const result = await createShipmentGroup(prisma, body, { authUser: requireAuthUser(req) })
    return reply.status(201).send(result)
  })

  app.get('/v1/supply/operations-board', async (req) => {
    const q = req.query as {
      q?: string
      activeOnly?: string
      city?: string
      health?: string
      sort?: string
    }
    return safeGet(() =>
      getSupplyOperationsBoard(prisma, {
        q: typeof q.q === 'string' ? q.q : undefined,
        activeOnly: q.activeOnly === 'false' ? false : true,
        city: typeof q.city === 'string' ? q.city : undefined,
        health: typeof q.health === 'string' ? q.health : undefined,
        sort:
          q.sort === 'balance_asc' || q.sort === 'name' || q.sort === 'balance_desc'
            ? q.sort
            : 'balance_desc',
      }),
    )()
  })

  app.get('/v1/supply/ledger-center', async (req) => {
    const q = req.query as { q?: string; activeOnly?: string; sort?: string }
    return safeGet(() =>
      getSupplierLedgerCenter(prisma, {
        q: typeof q.q === 'string' ? q.q : undefined,
        activeOnly: q.activeOnly === 'false' ? false : true,
        sort:
          q.sort === 'balance_asc' ||
          q.sort === 'name' ||
          q.sort === 'overdue_desc' ||
          q.sort === 'balance_desc'
            ? q.sort
            : 'balance_desc',
      }),
    )()
  })

  app.get('/v1/suppliers/:id/operations', async (req) => {
    const supplierId = String((req.params as { id: string }).id)
    return safeGet(() => getSupplierOperations(prisma, supplierId))()
  })

  app.get('/v1/suppliers', async (req) => {
    const q = req.query as { q?: string; activeOnly?: string }
    return safeGet(() =>
      listSuppliers(prisma, {
        q: typeof q.q === 'string' ? q.q : undefined,
        activeOnly: q.activeOnly === 'false' ? false : true,
      }),
    )()
  })

  app.post('/v1/suppliers', async (req, reply) => {
    const body = assertValidCreateSupplierRequest(req.body)
    const dto = await createSupplier(prisma, body)
    return reply.status(201).send(dto)
  })

  app.get('/v1/suppliers/:id', async (req) => {
    const supplierId = String((req.params as { id: string }).id)
    return safeGet(() => getSupplier(prisma, supplierId))()
  })

  app.patch('/v1/suppliers/:id', async (req) => {
    const supplierId = String((req.params as { id: string }).id)
    const body = assertValidPatchSupplierRequest(req.body)
    return patchSupplier(prisma, supplierId, body)
  })

  app.get('/v1/suppliers/:id/ledger', async (req) => {
    const supplierId = String((req.params as { id: string }).id)
    return safeGet(() => listSupplierLedger(prisma, supplierId))()
  })

  app.post('/v1/suppliers/:id/payments', async (req, reply) => {
    const supplierId = String((req.params as { id: string }).id)
    const body = assertValidPostSupplierPaymentRequest(req.body)
    const result = await postSupplierPayment(prisma, supplierId, body, {
      authUser: requireAuthUser(req),
    })
    return reply.status(201).send(result)
  })

  app.get('/v1/product-master', async (req) => {
    const q = req.query as {
      q?: string
      category?: string
      publishStatus?: string
      activeOnly?: string
      page?: string
      pageSize?: string
    }
    return safeGet(() =>
      listProductMaster(prisma, {
        q: typeof q.q === 'string' ? q.q : undefined,
        category: typeof q.category === 'string' ? q.category : undefined,
        publishStatus: typeof q.publishStatus === 'string' ? q.publishStatus : undefined,
        activeOnly: q.activeOnly === 'true' ? true : undefined,
        page: typeof q.page === 'string' ? Number(q.page) : undefined,
        pageSize: typeof q.pageSize === 'string' ? Number(q.pageSize) : undefined,
      }),
    )()
  })

  app.get('/v1/product-master/:id', async (req) => {
    const productId = String((req.params as { id: string }).id)
    return safeGet(() => getProductMaster(prisma, productId))()
  })

  app.post('/v1/product-master', async (req, reply) => {
    const body = assertValidCreateProductMasterRequest(req.body)
    const dto = await createProductMaster(prisma, body)
    return reply.status(201).send(dto)
  })

  app.patch('/v1/product-master/:id', async (req) => {
    const productId = String((req.params as { id: string }).id)
    const body = assertValidPatchProductMasterRequest(req.body)
    return patchProductMaster(prisma, productId, body)
  })

  app.post('/v1/product-master/:id/variants', async (req, reply) => {
    const productId = String((req.params as { id: string }).id)
    const body = assertValidCreateProductVariantRequest(req.body)
    const dto = await createProductVariant(prisma, productId, body)
    return reply.status(201).send(dto)
  })

  app.patch('/v1/product-master/:id/variants/:variantId', async (req) => {
    const productId = String((req.params as { id: string }).id)
    const variantId = String((req.params as { variantId: string }).variantId)
    const body = assertValidPatchProductVariantRequest(req.body)
    return patchProductVariant(prisma, productId, variantId, body)
  })

  app.get('/v1/media-assets', async (req) => {
    const q = req.query as { q?: string; mimeType?: string; page?: string; pageSize?: string }
    return safeGet(() =>
      listMediaAssets(prisma, {
        q: typeof q.q === 'string' ? q.q : undefined,
        mimeType: typeof q.mimeType === 'string' ? q.mimeType : undefined,
        page: typeof q.page === 'string' ? Number(q.page) : undefined,
        pageSize: typeof q.pageSize === 'string' ? Number(q.pageSize) : undefined,
      }),
    )()
  })

  app.get('/v1/product-master/:id/media', async (req) => {
    const productId = String((req.params as { id: string }).id)
    return safeGet(() => getProductMediaBundle(prisma, productId))()
  })

  app.put('/v1/product-master/:id/media', async (req) => {
    const productId = String((req.params as { id: string }).id)
    const body = assertValidPutProductMediaRequest(req.body)
    return putProductMediaLinks(prisma, productId, body)
  })

  app.post('/v1/product-master/:id/woo/prepare-sync', async (req) => {
    const productId = String((req.params as { id: string }).id)
    return prepareWooSync(prisma, productId)
  })

  app.post('/v1/product-master/:id/woo/publish-draft', async (req) => {
    const productId = String((req.params as { id: string }).id)
    return publishWooDraft(prisma, productId)
  })

  app.get('/v1/products', async (req) => {
    const q = req.query as {
      q?: string
      category?: string
      supplierId?: string
      suiteType?: string
      stockType?: string
      minPrice?: string
      maxPrice?: string
      activeOnly?: string
      page?: string
      pageSize?: string
    }
    return safeGet(() =>
      listProducts(prisma, {
        q: typeof q.q === 'string' ? q.q : undefined,
        category: typeof q.category === 'string' ? q.category : undefined,
        supplierId: typeof q.supplierId === 'string' ? q.supplierId : undefined,
        suiteType: typeof q.suiteType === 'string' ? q.suiteType : undefined,
        stockType: typeof q.stockType === 'string' ? q.stockType : undefined,
        minPrice: typeof q.minPrice === 'string' ? Number(q.minPrice) : undefined,
        maxPrice: typeof q.maxPrice === 'string' ? Number(q.maxPrice) : undefined,
        activeOnly: q.activeOnly === 'false' ? false : true,
        page: typeof q.page === 'string' ? Number(q.page) : undefined,
        pageSize: typeof q.pageSize === 'string' ? Number(q.pageSize) : undefined,
      }),
    )()
  })

  app.post('/v1/products', async (req, reply) => {
    const body = assertValidCreateProductRequest(req.body)
    const dto = await createProduct(prisma, body)
    return reply.status(201).send(dto)
  })

  app.get('/v1/products/:id', async (req) => {
    const productId = String((req.params as { id: string }).id)
    return safeGet(() => getProduct(prisma, productId))()
  })

  app.patch('/v1/products/:id', async (req) => {
    const productId = String((req.params as { id: string }).id)
    const body = assertValidPatchProductRequest(req.body)
    return patchProduct(prisma, productId, body)
  })

  app.post('/v1/products/:id/duplicate', async (req, reply) => {
    const productId = String((req.params as { id: string }).id)
    const dto = await duplicateProduct(prisma, productId)
    return reply.status(201).send(dto)
  })

  app.get('/v1/incoming-goods/kpis', safeGet(() => getIncomingGoodsKpis(prisma)))

  app.get('/v1/incoming-goods/pending-order-lines', async (req) => {
    const q = req.query as { q?: string }
    return safeGet(() =>
      listPendingOrderLinesForIncoming(prisma, typeof q.q === 'string' ? q.q : undefined),
    )()
  })

  app.get('/v1/incoming-goods', async (req) => {
    const q = req.query as { receivedAt?: string; purpose?: string; supplierId?: string }
    return safeGet(() =>
      listIncomingGoods(prisma, {
        receivedAt: typeof q.receivedAt === 'string' ? q.receivedAt : undefined,
        purpose: typeof q.purpose === 'string' ? q.purpose : undefined,
        supplierId: typeof q.supplierId === 'string' ? q.supplierId : undefined,
      }),
    )()
  })

  app.post('/v1/incoming-goods', async (req, reply) => {
    const body = assertValidCreateIncomingGoodsRequest(req.body)
    const dto = await createIncomingGoods(prisma, body, { authUser: requireAuthUser(req) })
    return reply.status(201).send(dto)
  })

  app.get('/v1/orders/:id/order-line-receiving', async (req) => {
    const orderId = String((req.params as { id: string }).id)
    return safeGet(() => listOrderLineReceiving(prisma, orderId))()
  })

  app.get('/v1/reports/sales-source-analytics', async (req) => {
    const q = req.query as {
      from?: string
      to?: string
      salesPerson?: string
      salesSourceType?: string
      displayFloor?: string
      externalSupplyType?: string
      category?: string
      supplierId?: string
    }
    return safeGet(() =>
      getSalesSourceAnalytics(prisma, {
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        salesSourceType: typeof q.salesSourceType === 'string' ? q.salesSourceType : undefined,
        displayFloor: typeof q.displayFloor === 'string' ? q.displayFloor : undefined,
        externalSupplyType:
          typeof q.externalSupplyType === 'string' ? q.externalSupplyType : undefined,
        category: typeof q.category === 'string' ? q.category : undefined,
        supplierId: typeof q.supplierId === 'string' ? q.supplierId : undefined,
      }),
    )()
  })

  app.get('/v1/reports/warehouse-entries', async (req) => {
    const q = req.query as {
      supplierId?: string
      physicalLocation?: string
      stockStatus?: string
      q?: string
    }
    return safeGet(() =>
      listWarehouseEntries(prisma, {
        supplierId: typeof q.supplierId === 'string' ? q.supplierId : undefined,
        physicalLocation: typeof q.physicalLocation === 'string' ? q.physicalLocation : undefined,
        stockStatus: typeof q.stockStatus === 'string' ? q.stockStatus : undefined,
        q: typeof q.q === 'string' ? q.q : undefined,
      }),
    )()
  })

  app.get('/v1/reports/data-quality', async (req) => {
    const q = req.query as {
      from?: string
      to?: string
      salesPerson?: string
      status?: string
      issueCode?: string
      q?: string
    }
    return safeGet(() =>
      getDataQualityReport(prisma, {
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        status: typeof q.status === 'string' ? q.status : undefined,
        issueCode: typeof q.issueCode === 'string' ? q.issueCode : undefined,
        q: typeof q.q === 'string' ? q.q : undefined,
      }),
    )()
  })

  app.get('/v1/reports/profitability-analytics', async (req) => {
    const q = req.query as {
      from?: string
      to?: string
      salesPerson?: string
      salesSourceType?: string
      category?: string
      brand?: string
      supplierId?: string
      productId?: string
      customer?: string
      paymentStatus?: string
      riskLevel?: string
      groupBy?: string
    }
    return safeGet(() =>
      getProfitabilityAnalytics(prisma, {
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        salesSourceType: typeof q.salesSourceType === 'string' ? q.salesSourceType : undefined,
        category: typeof q.category === 'string' ? q.category : undefined,
        brand: typeof q.brand === 'string' ? q.brand : undefined,
        supplierId: typeof q.supplierId === 'string' ? q.supplierId : undefined,
        productId: typeof q.productId === 'string' ? q.productId : undefined,
        customer: typeof q.customer === 'string' ? q.customer : undefined,
        paymentStatus: typeof q.paymentStatus === 'string' ? q.paymentStatus : undefined,
        riskLevel: typeof q.riskLevel === 'string' ? q.riskLevel : undefined,
        groupBy: typeof q.groupBy === 'string' ? q.groupBy : undefined,
      }),
    )()
  })

  app.get('/v1/reports/ceo-control-center', async () => {
    return safeGet(() => getCeoControlCenter(prisma))()
  })

  app.get('/v1/reports/operations-agents', async () => {
    return safeGet(() => getOperationsAgents(prisma))()
  })

  app.get('/v1/reports/operations-agents/:agentCode', async (req) => {
    const agentCode = String((req.params as { agentCode: string }).agentCode)
    return safeGet(() => getOperationsAgentDetail(prisma, agentCode))()
  })

  app.post('/v1/reports/operations-agents/run', async () => {
    return runOperationsAgents(prisma)
  })

  app.post('/v1/reports/operations-agents/run/:agentCode', async (req) => {
    const agentCode = String((req.params as { agentCode: string }).agentCode)
    return runOperationsAgents(prisma, agentCode)
  })

  app.get('/v1/reports/executive-director', async () => {
    return safeGet(() => getExecutiveDirector(prisma))()
  })

  app.post('/v1/reports/executive-director/run', async () => {
    return runExecutiveDirector(prisma)
  })

  app.get('/v1/reports/strategic-intelligence', async () => {
    return safeGet(() => getStrategicIntelligence(prisma))()
  })

  app.get('/v1/reports/company-simulation', async () => {
    return safeGet(() => getCompanySimulation(prisma))()
  })

  app.post('/v1/reports/company-simulation/run', async (req) => {
    const body = (req.body ?? {}) as SimulationInputDto
    return runCompanySimulation(prisma, body)
  })

  app.get('/v1/reports/board-directors', async () => {
    return safeGet(() => getBoardDirectors(prisma))()
  })

  app.get('/v1/reports/ceo-intelligence', async () => {
    return safeGet(() => getCeoIntelligence(prisma))()
  })

  app.get('/v1/reports/chairman-intelligence', async () => {
    return safeGet(() => getChairmanIntelligence(prisma))()
  })

  app.get('/v1/reports/future-engine', async () => {
    return safeGet(() => getFutureEngine(prisma))()
  })

  app.get('/v1/reports/investor-intelligence', async () => {
    return safeGet(() => getInvestorIntelligence(prisma))()
  })

  app.get('/v1/reports/holding-center', async () => {
    return safeGet(() => getHoldingCenter(prisma))()
  })

  app.get('/v1/reports/group-chairman', async () => {
    return safeGet(() => getGroupChairman(prisma))()
  })

  app.get('/v1/reports/business-brain', async () => {
    return safeGet(() => getBusinessBrain(prisma))()
  })

  app.get('/v1/reports/action-orchestrator', async () => {
    return safeGet(() => getActionOrchestrator(prisma))()
  })

  app.post('/v1/reports/action-orchestrator/run', async () => {
    return runActionOrchestrator(prisma)
  })

  app.get('/v1/reports/performance-feedback', async () => {
    return safeGet(() => getPerformanceFeedback(prisma))()
  })

  app.get('/v1/reports/learning-engine', async () => {
    return safeGet(() => getLearningEngine(prisma))()
  })

  app.get('/v1/reports/optimization-engine', async () => {
    return safeGet(() => getOptimizationEngine(prisma))()
  })

  app.post('/v1/reports/optimization-engine/apply', async () => {
    return applyOptimizationEngine(prisma)
  })

  app.get('/v1/reports/goal-engine', async () => {
    return safeGet(() => getGoalEngine(prisma))()
  })

  app.patch('/v1/reports/goal-engine/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    return updateGoalProgress(prisma, id)
  })

  app.get('/v1/reports/enterprise-command-center', async () => {
    return safeGet(() => getEnterpriseCommandCenter(prisma))()
  })

  app.get('/v1/reports/manager-cockpit', async (req) => {
    const q = req.query as {
      from?: string
      to?: string
      month?: string
      year?: string
      salesPerson?: string
      riskLevel?: string
      paymentStatus?: string
      shipmentStatus?: string
      salesSourceType?: string
      limitedView?: string
    }
    return safeGet(() =>
      getManagerCockpit(prisma, {
        from: typeof q.from === 'string' ? q.from : undefined,
        to: typeof q.to === 'string' ? q.to : undefined,
        month: typeof q.month === 'string' ? q.month : undefined,
        year: typeof q.year === 'string' ? q.year : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        riskLevel: typeof q.riskLevel === 'string' ? q.riskLevel : undefined,
        paymentStatus: typeof q.paymentStatus === 'string' ? q.paymentStatus : undefined,
        shipmentStatus: typeof q.shipmentStatus === 'string' ? q.shipmentStatus : undefined,
        salesSourceType: typeof q.salesSourceType === 'string' ? q.salesSourceType : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  app.get('/v1/reports/forecast-engine', async (req) => {
    const q = req.query as {
      month?: string
      salesPerson?: string
      salesSourceType?: string
      limitedView?: string
    }
    return safeGet(() =>
      getForecastEngine(prisma, {
        month: typeof q.month === 'string' ? q.month : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        salesSourceType: typeof q.salesSourceType === 'string' ? q.salesSourceType : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  app.get('/v1/reports/operations-advisor', async (req) => {
    const q = req.query as {
      category?: string
      severity?: string
      date?: string
      q?: string
      salesPerson?: string
      limitedView?: string
    }
    return safeGet(() =>
      getOperationsAdvisor(prisma, {
        category: typeof q.category === 'string' ? q.category : undefined,
        severity: typeof q.severity === 'string' ? q.severity : undefined,
        date: typeof q.date === 'string' ? q.date : undefined,
        q: typeof q.q === 'string' ? q.q : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  app.get('/v1/reports/action-center', async (req) => {
    const q = req.query as {
      priority?: string
      category?: string
      status?: string
      q?: string
      salesPerson?: string
      limitedView?: string
    }
    return safeGet(() =>
      getActionCenter(prisma, {
        priority: typeof q.priority === 'string' ? q.priority : undefined,
        category: typeof q.category === 'string' ? q.category : undefined,
        status: typeof q.status === 'string' ? q.status : undefined,
        q: typeof q.q === 'string' ? q.q : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  app.patch('/v1/reports/action-center/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    const status = assertValidActionStatus(req.body)
    return updateActionStatus(id, status)
  })

  app.get('/v1/reports/operation-cases', async (req) => {
    const q = req.query as {
      priority?: string
      status?: string
      q?: string
      salesPerson?: string
      limitedView?: string
    }
    return safeGet(() =>
      getOperationCases(prisma, {
        priority: typeof q.priority === 'string' ? q.priority : undefined,
        status: typeof q.status === 'string' ? q.status : undefined,
        q: typeof q.q === 'string' ? q.q : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  app.get('/v1/reports/operation-cases/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    return safeGet(() =>
      getOperationCaseDetail(prisma, id, {
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  app.patch('/v1/reports/operation-cases/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    const patch = assertValidOperationCasePatch(req.body)
    return updateOperationCase(id, patch)
  })

  app.get('/v1/reports/automation-jobs', async (req) => {
    const q = req.query as {
      status?: string
      priority?: string
      q?: string
      salesPerson?: string
      limitedView?: string
    }
    return safeGet(() =>
      getAutomationJobs(prisma, {
        status: typeof q.status === 'string' ? q.status : undefined,
        priority: typeof q.priority === 'string' ? q.priority : undefined,
        q: typeof q.q === 'string' ? q.q : undefined,
        salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
        limitedView: q.limitedView === 'true' || q.limitedView === '1',
      }),
    )()
  })

  async function resolveAutomationJob(id: string, query: { salesPerson?: string; limitedView?: boolean }) {
    const res = await getAutomationJobs(prisma, query)
    const job = res.jobs.find((j) => j.id === id)
    if (!job) {
      throw new AppHttpError(404, 'Otomasyon işi bulunamadı', 'Not Found', { id })
    }
    return { job, allJobs: res.jobs }
  }

  app.patch('/v1/reports/automation-jobs/:id/approve', async (req) => {
    const id = String((req.params as { id: string }).id)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    const query = {
      salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
      limitedView: q.limitedView === 'true' || q.limitedView === '1',
    }
    const body = assertValidApproveBody(req.body)
    const { job } = await resolveAutomationJob(id, query)
    return approveAutomationJob(id, body, job.status)
  })

  app.patch('/v1/reports/automation-jobs/:id/run', async (req) => {
    const id = String((req.params as { id: string }).id)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    const query = {
      salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
      limitedView: q.limitedView === 'true' || q.limitedView === '1',
    }
    const { job } = await resolveAutomationJob(id, query)
    return runAutomationJob(id, {
      requiresApproval: job.requiresApproval,
      relatedCaseId: job.relatedCaseId,
      jobType: job.jobType,
      currentStatus: job.status,
    })
  })

  app.patch('/v1/reports/automation-jobs/:id/cancel', async (req) => {
    const id = String((req.params as { id: string }).id)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    const query = {
      salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
      limitedView: q.limitedView === 'true' || q.limitedView === '1',
    }
    const { job } = await resolveAutomationJob(id, query)
    return cancelAutomationJob(id, job.status)
  })

  app.patch('/v1/reports/automation-jobs/bulk/approve', async (req) => {
    const ids = assertValidBulkIds(req.body)
    const body = assertValidApproveBody(req.body)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    const query = {
      salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
      limitedView: q.limitedView === 'true' || q.limitedView === '1',
    }
    const res = await getAutomationJobs(prisma, query)
    const statusById = new Map(res.jobs.map((j) => [j.id, j.status]))
    return bulkApproveAutomationJobs(ids, body, statusById)
  })

  app.patch('/v1/reports/automation-jobs/bulk/run', async (req) => {
    const ids = assertValidBulkIds(req.body)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    const query = {
      salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
      limitedView: q.limitedView === 'true' || q.limitedView === '1',
    }
    const res = await getAutomationJobs(prisma, query)
    const byId = new Map(res.jobs.map((j) => [j.id, j]))
    const items = ids.map((id) => {
      const job = byId.get(id)
      return {
        id,
        requiresApproval: job?.requiresApproval,
        relatedCaseId: job?.relatedCaseId,
        jobType: job?.jobType,
        currentStatus: job?.status,
      }
    })
    return bulkRunAutomationJobs(items)
  })

  app.get('/v1/admin/business-rules', async (req) => {
    const q = req.query as { category?: string; q?: string; enabled?: string }
    return getBusinessRules({
      category: typeof q.category === 'string' ? q.category : undefined,
      q: typeof q.q === 'string' ? q.q : undefined,
      enabled: typeof q.enabled === 'string' ? q.enabled : undefined,
    })
  })

  app.get('/v1/admin/business-rules/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    return getBusinessRuleDetail(id)
  })

  app.patch('/v1/admin/business-rules/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    const patch = assertValidBusinessRulePatch(req.body)
    return updateBusinessRule(id, patch)
  })

  app.post('/v1/admin/business-rules/test', async (req) => {
    const body = assertValidRuleTestBody(req.body)
    return testBusinessRule(prisma, body)
  })

  app.get('/v1/admin/woo-connections', async () => {
    return getActiveWooConnection(prisma)
  })

  app.get('/v1/admin/woo-connections/health', async () => {
    return getWooConnectionHealth(prisma)
  })

  app.put('/v1/admin/woo-connections', async (req) => {
    const body = assertValidUpsertWooConnectionRequest(req.body)
    return upsertWooConnection(prisma, body)
  })

  app.post('/v1/admin/woo-connections/test', async () => {
    return testWooConnectionLive(prisma)
  })

  app.patch('/v1/reports/automation-jobs/bulk/cancel', async (req) => {
    const ids = assertValidBulkIds(req.body)
    const q = req.query as { salesPerson?: string; limitedView?: string }
    const query = {
      salesPerson: typeof q.salesPerson === 'string' ? q.salesPerson : undefined,
      limitedView: q.limitedView === 'true' || q.limitedView === '1',
    }
    const res = await getAutomationJobs(prisma, query)
    const statusById = new Map(res.jobs.map((j) => [j.id, j.status]))
    return bulkCancelAutomationJobs(ids, statusById)
  })

  return app
}
