import type { FastifyRequest } from 'fastify'
import { AppHttpError } from '../errors/apiError.js'
import { USER_ROLE, type UserRole } from '../constants/userRoles.js'

/** İnce taneli izinler — route eşlemesi için */
export const PERM = {
  AUTH_SESSION: 'auth:session',
  TASK_STATES: 'task:states',
  ORDERS_READ: 'orders:read',
  ORDERS_CREATE: 'orders:create',
  ORDERS_STATUS: 'orders:status',
  ORDERS_TERMIN: 'orders:termin',
  PAYMENTS_WRITE: 'payments:write',
  PAYMENTS_APPROVE: 'payments:approve',
  SHIPMENTS_READ: 'shipments:read',
  SHIPMENTS_WRITE: 'shipments:write',
  MISSING_READ: 'missing:read',
  MISSING_WRITE: 'missing:write',
  INCOMING_READ: 'incoming:read',
  INCOMING_WRITE: 'incoming:write',
  SUPPLY_ORDER_CONFIRM: 'supply_order:confirm',
  SUPPLIERS_READ: 'suppliers:read',
  SUPPLIERS_WRITE: 'suppliers:write',
  SUPPLIER_PAYMENTS_WRITE: 'supplier_payments:write',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_WRITE: 'products:write',
  REPORTS_READ: 'reports:read',
  CEO_CONTROL_READ: 'ceo_control:read',
  OPERATIONS_AGENTS_READ: 'operations_agents:read',
  OPERATIONS_AGENTS_RUN: 'operations_agents:run',
  EXECUTIVE_DIRECTOR_READ: 'executive_director:read',
  EXECUTIVE_DIRECTOR_RUN: 'executive_director:run',
  STRATEGIC_INTELLIGENCE_READ: 'strategic_intelligence:read',
  COMPANY_SIMULATION_READ: 'company_simulation:read',
  COMPANY_SIMULATION_RUN: 'company_simulation:run',
  BOARD_DIRECTORS_READ: 'board_directors:read',
  CEO_INTELLIGENCE_READ: 'ceo_intelligence:read',
  CHAIRMAN_READ: 'chairman:read',
  FUTURE_ENGINE_READ: 'future_engine:read',
  INVESTOR_INTELLIGENCE_READ: 'investor_intelligence:read',
  HOLDING_CENTER_READ: 'holding_center:read',
  GROUP_CHAIRMAN_READ: 'group_chairman:read',
  BUSINESS_BRAIN_READ: 'business_brain:read',
  ACTION_ORCHESTRATOR_READ: 'action_orchestrator:read',
  ACTION_ORCHESTRATOR_RUN: 'action_orchestrator:run',
  PERFORMANCE_FEEDBACK_READ: 'performance_feedback:read',
  LEARNING_ENGINE_READ: 'learning_engine:read',
  OPTIMIZATION_ENGINE_READ: 'optimization_engine:read',
  OPTIMIZATION_ENGINE_APPLY: 'optimization_engine:apply',
  GOAL_ENGINE_READ: 'goal_engine:read',
  GOAL_ENGINE_WRITE: 'goal_engine:write',
  ENTERPRISE_COMMAND_CENTER_READ: 'enterprise_command_center:read',
  BUSINESS_RULES_READ: 'business_rules:read',
  BUSINESS_RULES_WRITE: 'business_rules:write',
  DOMAIN_EVENTS_APPEND: 'domain_events:append',
  USERS_MANAGE: 'users:manage',
  WOO_CONNECTIONS_READ: 'woo_connections:read',
  WOO_CONNECTIONS_WRITE: 'woo_connections:write',
} as const

export type Permission = (typeof PERM)[keyof typeof PERM]

const ALL_PERMISSIONS = new Set<string>(Object.values(PERM))

const MANAGER_PERMISSIONS = new Set<string>(Object.values(PERM))
MANAGER_PERMISSIONS.delete(PERM.HOLDING_CENTER_READ)
MANAGER_PERMISSIONS.delete(PERM.GROUP_CHAIRMAN_READ)

const ROLE_PERMISSIONS: Record<UserRole, Set<string>> = {
  [USER_ROLE.ADMIN]: ALL_PERMISSIONS,
  [USER_ROLE.MANAGER]: MANAGER_PERMISSIONS,
  [USER_ROLE.SALES]: new Set([
    PERM.AUTH_SESSION,
    PERM.TASK_STATES,
    PERM.ORDERS_READ,
    PERM.ORDERS_CREATE,
    PERM.ORDERS_TERMIN,
    PERM.PAYMENTS_WRITE,
    PERM.PRODUCTS_READ,
    PERM.REPORTS_READ,
    PERM.DOMAIN_EVENTS_APPEND,
    PERM.INCOMING_READ,
    PERM.INCOMING_WRITE,
    PERM.SUPPLY_ORDER_CONFIRM,
    PERM.SUPPLIERS_READ,
  ]),
  [USER_ROLE.OPERATION]: new Set([
    PERM.AUTH_SESSION,
    PERM.TASK_STATES,
    PERM.ORDERS_READ,
    PERM.ORDERS_CREATE,
    PERM.ORDERS_STATUS,
    PERM.ORDERS_TERMIN,
    PERM.PAYMENTS_WRITE,
    PERM.SHIPMENTS_READ,
    PERM.SHIPMENTS_WRITE,
    PERM.MISSING_READ,
    PERM.MISSING_WRITE,
    PERM.INCOMING_READ,
    PERM.INCOMING_WRITE,
    PERM.SUPPLY_ORDER_CONFIRM,
    PERM.SUPPLIERS_READ,
    PERM.PRODUCTS_READ,
    PERM.REPORTS_READ,
    PERM.OPERATIONS_AGENTS_READ,
    PERM.EXECUTIVE_DIRECTOR_READ,
    PERM.STRATEGIC_INTELLIGENCE_READ,
    PERM.BUSINESS_RULES_READ,
    PERM.WOO_CONNECTIONS_READ,
  ]),
  [USER_ROLE.WAREHOUSE]: new Set([
    PERM.AUTH_SESSION,
    PERM.TASK_STATES,
    PERM.ORDERS_READ,
    PERM.SHIPMENTS_READ,
    PERM.INCOMING_READ,
    PERM.INCOMING_WRITE,
    PERM.SUPPLIERS_READ,
    PERM.PRODUCTS_READ,
  ]),
  [USER_ROLE.SERVICE]: new Set([
    PERM.AUTH_SESSION,
    PERM.TASK_STATES,
    PERM.ORDERS_READ,
    PERM.MISSING_READ,
    PERM.MISSING_WRITE,
    PERM.SHIPMENTS_READ,
    PERM.REPORTS_READ,
  ]),
  [USER_ROLE.FINANCE]: new Set([
    PERM.AUTH_SESSION,
    PERM.TASK_STATES,
    PERM.ORDERS_READ,
    PERM.PAYMENTS_WRITE,
    PERM.PAYMENTS_APPROVE,
    PERM.REPORTS_READ,
    PERM.SUPPLIERS_READ,
    PERM.SUPPLIER_PAYMENTS_WRITE,
  ]),
}

type RouteRule = { methods: string[]; pattern: RegExp; permission: Permission }

const ROUTE_RULES: RouteRule[] = [
  { methods: ['GET'], pattern: /^\/v1\/auth\/me$/, permission: PERM.AUTH_SESSION },
  { methods: ['GET', 'PUT', 'DELETE'], pattern: /^\/v1\/task-states/, permission: PERM.TASK_STATES },

  { methods: ['GET'], pattern: /^\/v1\/users/, permission: PERM.USERS_MANAGE },
  { methods: ['POST'], pattern: /^\/v1\/users$/, permission: PERM.USERS_MANAGE },
  { methods: ['PATCH'], pattern: /^\/v1\/users\//, permission: PERM.USERS_MANAGE },
  { methods: ['POST'], pattern: /^\/v1\/users\/[^/]+\/reset-password$/, permission: PERM.USERS_MANAGE },

  { methods: ['GET'], pattern: /^\/v1\/domain-events/, permission: PERM.ORDERS_READ },
  { methods: ['POST'], pattern: /^\/v1\/domain-events$/, permission: PERM.DOMAIN_EVENTS_APPEND },

  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/domain-events/, permission: PERM.ORDERS_READ },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/events/, permission: PERM.ORDERS_READ },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/payments$/, permission: PERM.ORDERS_READ },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/payments$/, permission: PERM.PAYMENTS_WRITE },
  {
    methods: ['POST'],
    pattern: /^\/v1\/orders\/[^/]+\/payments\/[^/]+\/approve$/,
    permission: PERM.PAYMENTS_APPROVE,
  },
  {
    methods: ['POST'],
    pattern: /^\/v1\/orders\/[^/]+\/payments\/[^/]+\/reject$/,
    permission: PERM.PAYMENTS_APPROVE,
  },
  { methods: ['PATCH'], pattern: /^\/v1\/orders\/[^/]+\/status$/, permission: PERM.ORDERS_STATUS },
  { methods: ['PATCH'], pattern: /^\/v1\/orders\/[^/]+\/termin$/, permission: PERM.ORDERS_TERMIN },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/missing-items$/, permission: PERM.MISSING_READ },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/missing-items$/, permission: PERM.MISSING_WRITE },
  { methods: ['PATCH'], pattern: /^\/v1\/missing-items\//, permission: PERM.MISSING_WRITE },
  {
    methods: ['POST'],
    pattern: /^\/v1\/orders\/[^/]+\/missing-items\/[^/]+\/ready-for-shipment$/,
    permission: PERM.MISSING_WRITE,
  },
  {
    methods: ['POST'],
    pattern: /^\/v1\/orders\/[^/]+\/ssh\/[^/]+\/ready-for-shipment$/,
    permission: PERM.MISSING_WRITE,
  },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/shipments/, permission: PERM.SHIPMENTS_READ },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/shipment-plan-lines/, permission: PERM.SHIPMENTS_READ },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/order-lines/, permission: PERM.ORDERS_READ },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/supply-order\/confirm$/, permission: PERM.SUPPLY_ORDER_CONFIRM },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/order-lines\/[^/]+\/revert-arrival$/, permission: PERM.INCOMING_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/order-lines\/[^/]+\/mark-shipment-ready$/, permission: PERM.INCOMING_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/order-lines\/[^/]+\/revert-shipment-ready$/, permission: PERM.INCOMING_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/order-lines\/[^/]+\/revert-supply$/, permission: PERM.SUPPLY_ORDER_CONFIRM },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/order-lines\/[^/]+\/reconcile-state$/, permission: PERM.INCOMING_WRITE },
  { methods: ['GET'], pattern: /^\/v1\/orders\/[^/]+\/order-line-receiving/, permission: PERM.INCOMING_READ },
  { methods: ['POST'], pattern: /^\/v1\/orders\/[^/]+\/shipments$/, permission: PERM.SHIPMENTS_WRITE },
  { methods: ['GET'], pattern: /^\/v1\/orders$/, permission: PERM.ORDERS_READ },
  { methods: ['POST'], pattern: /^\/v1\/orders$/, permission: PERM.ORDERS_CREATE },

  { methods: ['GET'], pattern: /^\/v1\/shipment-plans/, permission: PERM.SHIPMENTS_READ },
  { methods: ['POST'], pattern: /^\/v1\/shipment-plans$/, permission: PERM.SHIPMENTS_WRITE },
  { methods: ['PATCH'], pattern: /^\/v1\/shipment-plans\//, permission: PERM.SHIPMENTS_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/shipment-plans\/[^/]+\/delivery\//, permission: PERM.SHIPMENTS_WRITE },
  { methods: ['DELETE'], pattern: /^\/v1\/shipment-plans\//, permission: PERM.SHIPMENTS_WRITE },
  { methods: ['GET'], pattern: /^\/v1\/shipment-groups/, permission: PERM.SHIPMENTS_READ },
  { methods: ['POST'], pattern: /^\/v1\/shipment-groups$/, permission: PERM.SHIPMENTS_WRITE },

  { methods: ['GET'], pattern: /^\/v1\/shipments/, permission: PERM.SHIPMENTS_READ },
  { methods: ['PATCH'], pattern: /^\/v1\/shipments\//, permission: PERM.SHIPMENTS_WRITE },

  { methods: ['GET'], pattern: /^\/v1\/incoming-goods/, permission: PERM.INCOMING_READ },
  { methods: ['POST'], pattern: /^\/v1\/incoming-goods$/, permission: PERM.INCOMING_WRITE },

  { methods: ['GET'], pattern: /^\/v1\/supply\//, permission: PERM.SUPPLIERS_READ },
  { methods: ['GET'], pattern: /^\/v1\/suppliers\/[^/]+\/ledger/, permission: PERM.SUPPLIERS_READ },
  { methods: ['GET'], pattern: /^\/v1\/suppliers\/[^/]+\/operations/, permission: PERM.SUPPLIERS_READ },
  { methods: ['POST'], pattern: /^\/v1\/suppliers\/[^/]+\/payments$/, permission: PERM.SUPPLIER_PAYMENTS_WRITE },
  { methods: ['GET'], pattern: /^\/v1\/suppliers/, permission: PERM.SUPPLIERS_READ },
  { methods: ['POST'], pattern: /^\/v1\/suppliers$/, permission: PERM.SUPPLIERS_WRITE },
  { methods: ['PATCH'], pattern: /^\/v1\/suppliers\//, permission: PERM.SUPPLIERS_WRITE },

  { methods: ['GET'], pattern: /^\/v1\/product-master/, permission: PERM.PRODUCTS_READ },
  { methods: ['POST'], pattern: /^\/v1\/product-master$/, permission: PERM.PRODUCTS_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/product-master\/[^/]+\/variants$/, permission: PERM.PRODUCTS_WRITE },
  { methods: ['PUT'], pattern: /^\/v1\/product-master\/[^/]+\/media$/, permission: PERM.PRODUCTS_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/product-master\/[^/]+\/woo\/prepare-sync$/, permission: PERM.PRODUCTS_WRITE },
  { methods: ['POST'], pattern: /^\/v1\/product-master\/[^/]+\/woo\/publish-draft$/, permission: PERM.PRODUCTS_WRITE },
  { methods: ['PATCH'], pattern: /^\/v1\/product-master\//, permission: PERM.PRODUCTS_WRITE },
  { methods: ['GET'], pattern: /^\/v1\/media-assets/, permission: PERM.PRODUCTS_READ },
  { methods: ['GET'], pattern: /^\/v1\/products/, permission: PERM.PRODUCTS_READ },
  { methods: ['POST'], pattern: /^\/v1\/products/, permission: PERM.PRODUCTS_WRITE },
  { methods: ['PATCH'], pattern: /^\/v1\/products\//, permission: PERM.PRODUCTS_WRITE },

  { methods: ['GET'], pattern: /^\/v1\/reports\/ceo-control-center$/, permission: PERM.CEO_CONTROL_READ },
  { methods: ['GET'], pattern: /^\/v1\/reports\/operations-agents/, permission: PERM.OPERATIONS_AGENTS_READ },
  { methods: ['POST'], pattern: /^\/v1\/reports\/operations-agents\/run/, permission: PERM.OPERATIONS_AGENTS_RUN },
  { methods: ['GET'], pattern: /^\/v1\/reports\/executive-director$/, permission: PERM.EXECUTIVE_DIRECTOR_READ },
  { methods: ['POST'], pattern: /^\/v1\/reports\/executive-director\/run$/, permission: PERM.EXECUTIVE_DIRECTOR_RUN },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/strategic-intelligence$/,
    permission: PERM.STRATEGIC_INTELLIGENCE_READ,
  },
  { methods: ['GET'], pattern: /^\/v1\/reports\/company-simulation$/, permission: PERM.COMPANY_SIMULATION_READ },
  { methods: ['POST'], pattern: /^\/v1\/reports\/company-simulation\/run$/, permission: PERM.COMPANY_SIMULATION_RUN },
  { methods: ['GET'], pattern: /^\/v1\/reports\/board-directors$/, permission: PERM.BOARD_DIRECTORS_READ },
  { methods: ['GET'], pattern: /^\/v1\/reports\/ceo-intelligence$/, permission: PERM.CEO_INTELLIGENCE_READ },
  { methods: ['GET'], pattern: /^\/v1\/reports\/chairman-intelligence$/, permission: PERM.CHAIRMAN_READ },
  { methods: ['GET'], pattern: /^\/v1\/reports\/future-engine$/, permission: PERM.FUTURE_ENGINE_READ },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/investor-intelligence$/,
    permission: PERM.INVESTOR_INTELLIGENCE_READ,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/holding-center$/,
    permission: PERM.HOLDING_CENTER_READ,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/group-chairman$/,
    permission: PERM.GROUP_CHAIRMAN_READ,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/business-brain$/,
    permission: PERM.BUSINESS_BRAIN_READ,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/action-orchestrator$/,
    permission: PERM.ACTION_ORCHESTRATOR_READ,
  },
  {
    methods: ['POST'],
    pattern: /^\/v1\/reports\/action-orchestrator\/run$/,
    permission: PERM.ACTION_ORCHESTRATOR_RUN,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/performance-feedback$/,
    permission: PERM.PERFORMANCE_FEEDBACK_READ,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/learning-engine$/,
    permission: PERM.LEARNING_ENGINE_READ,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/optimization-engine$/,
    permission: PERM.OPTIMIZATION_ENGINE_READ,
  },
  {
    methods: ['POST'],
    pattern: /^\/v1\/reports\/optimization-engine\/apply$/,
    permission: PERM.OPTIMIZATION_ENGINE_APPLY,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/goal-engine$/,
    permission: PERM.GOAL_ENGINE_READ,
  },
  {
    methods: ['PATCH'],
    pattern: /^\/v1\/reports\/goal-engine\/[^/]+$/,
    permission: PERM.GOAL_ENGINE_WRITE,
  },
  {
    methods: ['GET'],
    pattern: /^\/v1\/reports\/enterprise-command-center$/,
    permission: PERM.ENTERPRISE_COMMAND_CENTER_READ,
  },
  { methods: ['GET'], pattern: /^\/v1\/reports\//, permission: PERM.REPORTS_READ },

  { methods: ['GET'], pattern: /^\/v1\/admin\/business-rules/, permission: PERM.BUSINESS_RULES_READ },
  { methods: ['PATCH', 'POST'], pattern: /^\/v1\/admin\/business-rules/, permission: PERM.BUSINESS_RULES_WRITE },

  { methods: ['GET'], pattern: /^\/v1\/admin\/woo-connections/, permission: PERM.WOO_CONNECTIONS_READ },
  { methods: ['PUT', 'POST'], pattern: /^\/v1\/admin\/woo-connections/, permission: PERM.WOO_CONNECTIONS_WRITE },
]

export function resolveRoutePermission(method: string, path: string): Permission | null {
  const m = method.toUpperCase()
  for (const rule of ROUTE_RULES) {
    if (!rule.methods.includes(m)) continue
    if (rule.pattern.test(path)) return rule.permission
  }
  return null
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  const set = ROLE_PERMISSIONS[role]
  return set?.has(permission) ?? false
}

export function assertRbac(req: FastifyRequest): void {
  if (process.env.AUTH_DISABLED === 'true') return
  const user = req.authUser
  if (!user) {
    throw new AppHttpError(401, 'Oturum gerekli', 'Unauthorized')
  }

  const path = req.url.split('?')[0]
  const permission = resolveRoutePermission(req.method, path)
  if (!permission) {
    throw new AppHttpError(403, 'Bu işlem için yetkiniz yok', 'Forbidden', { route: path })
  }
  if (!roleHasPermission(user.role, permission)) {
    throw new AppHttpError(403, 'Bu işlem için yetkiniz yok', 'Forbidden', {
      role: user.role,
      permission,
    })
  }
}
