import fs from 'node:fs/promises'

const BASE = (process.env.VAL_BASE_URL || 'http://localhost/api').replace(/\/+$/, '')

const ROLES = {
  admin: { email: 'admin@mobilya.local', password: 'admin123', role: 'ADMIN' },
  sales: { email: 'sales@mobilya.local', password: 'sales123', role: 'SALES' },
  finance: { email: 'finance@mobilya.local', password: 'finance123', role: 'FINANCE' },
  service: { email: 'service@mobilya.local', password: 'service123', role: 'SERVICE' },
  operation: { email: 'ops@mobilya.local', password: 'ops123', role: 'OPERATION' },
}

function nowIso() {
  return new Date().toISOString()
}

function addDaysIso(days) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function safeCount(body) {
  if (Array.isArray(body)) return body.length
  if (body && Array.isArray(body.items)) return body.items.length
  if (body && Array.isArray(body.rows)) return body.rows.length
  if (body && Array.isArray(body.data)) return body.data.length
  if (body && typeof body.total === 'number') return body.total
  if (body && typeof body.count === 'number') return body.count
  return null
}

async function req({ token, method, path, body }) {
  const url = `${BASE}${path}`
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const started = Date.now()
  let res
  let parsed = null
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      parsed = text
    }
  } catch (error) {
    return {
      ok: false,
      status: null,
      ms: Date.now() - started,
      endpoint: `${method} ${path}`,
      body: null,
      error: error instanceof Error ? error.message : String(error),
      count: null,
      trace: [{ at: nowIso(), method, path, networkError: error instanceof Error ? error.message : String(error) }],
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    ms: Date.now() - started,
    endpoint: `${method} ${path}`,
    body: parsed,
    error: null,
    count: safeCount(parsed),
    trace: [{ at: nowIso(), method, path, status: res.status }],
  }
}

async function loginAll() {
  const sessions = {}
  for (const [key, acct] of Object.entries(ROLES)) {
    const r = await req({ method: 'POST', path: '/v1/auth/login', body: { email: acct.email, password: acct.password } })
    sessions[key] = {
      role: acct.role,
      login: r,
      token: r.body?.token ?? null,
      userId: r.body?.user?.id ?? null,
    }
  }
  return sessions
}

function check(pass, evidence, note = '') {
  return { pass, evidence: { ...evidence, note } }
}

function moduleStatus(checks) {
  const values = Object.values(checks)
  if (values.every((v) => v.pass)) return 'PASS'
  const hasError = values.some((v) => v.pass === false)
  return hasError ? 'FAIL' : 'PARTIAL'
}

async function validate() {
  const startedAt = nowIso()
  const sessions = await loginAll()
  const adminToken = sessions.admin.token

  const summary = {
    startedAt,
    baseUrl: BASE,
    sessions: Object.fromEntries(
      Object.entries(sessions).map(([k, v]) => [k, {
        role: v.role,
        loginStatus: v.login.status,
        loginMs: v.login.ms,
        userId: v.userId,
      }]),
    ),
    modules: {},
  }

  const orderCreate = await req({
    token: adminToken,
    method: 'POST',
    path: '/v1/orders',
    body: {
      customerName: `Sprint13 ${Date.now()}`,
      phone: '+90 555 000 11 22',
      totalAmount: 2500,
      paidAmount: 0,
      status: 'Bekleniyor',
      orderDate: addDaysIso(0),
      dueDate: addDaysIso(7),
      shipmentDate: addDaysIso(2),
      salesPerson: 'Sprint13 Bot',
      lines: [{ title: 'Sprint13 Test Urun', quantity: 1, unitPrice: 2500 }],
    },
  })
  const orderId = orderCreate.body?.id ?? null

  const ordersList = await req({ token: adminToken, method: 'GET', path: '/v1/orders' })
  const orderDetailPayments = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/payments` })
    : { ok: false, status: null, ms: 0, endpoint: `GET /v1/orders/:id/payments`, body: null, error: 'order id missing', count: null, trace: [] }

  const orderUpdate = orderId
    ? await req({
        token: adminToken,
        method: 'PATCH',
        path: `/v1/orders/${orderId}/termin`,
        body: { committedShipBy: addDaysIso(9), reason: 'Sprint13 update check' },
      })
    : { ok: false, status: null, ms: 0, endpoint: `PATCH /v1/orders/:id/termin`, body: null, error: 'order id missing', count: null, trace: [] }

  const orderSearch = await req({ token: adminToken, method: 'GET', path: `/v1/orders?q=Sprint13` })
  const orderFilter = await req({ token: adminToken, method: 'GET', path: `/v1/orders?status=Bekleniyor` })
  const orderPagination = await req({ token: adminToken, method: 'GET', path: `/v1/orders?page=1&pageSize=5` })
  const orderForbiddenByService = orderId
    ? await req({
        token: sessions.service.token,
        method: 'PATCH',
        path: `/v1/orders/${orderId}/status`,
        body: { status: 'İptal' },
      })
    : { ok: false, status: null, ms: 0, endpoint: `PATCH /v1/orders/:id/status`, body: null, error: 'order id missing', count: null, trace: [] }

  const orderEvents = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/domain-events` })
    : { ok: false, status: null, ms: 0, endpoint: `GET /v1/orders/:id/domain-events`, body: null, error: 'order id missing', count: null, trace: [] }

  const orderErrorHandling = await req({ token: adminToken, method: 'POST', path: '/v1/orders', body: { foo: 'bar' } })

  const orderNotification = orderId
    ? await req({
        token: adminToken,
        method: 'POST',
        path: '/v1/domain-events',
        body: { type: 'sales.contract_printed', salesOrderId: orderId, metadata: { source: 'sprint13-validation' } },
      })
    : { ok: false, status: null, ms: 0, endpoint: `POST /v1/domain-events`, body: null, error: 'order id missing', count: null, trace: [] }

  const orderRefreshA = await req({ token: adminToken, method: 'GET', path: '/v1/orders' })
  const orderRefreshB = await req({ token: adminToken, method: 'GET', path: '/v1/orders' })

  const offlineProbe = await req({ method: 'GET', path: '/_invalid_offline_probe' })
  const offlineRecovery = await req({ token: adminToken, method: 'GET', path: '/v1/orders' })

  const homeSummary = await req({ token: adminToken, method: 'GET', path: '/orders/summary' })
  const homeDetail = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/events` })
    : { ok: false, status: null, ms: 0, endpoint: `GET /v1/orders/:id/events`, body: null, error: 'order id missing', count: null, trace: [] }

  summary.modules.Home = {
    checks: {
      login: check(Boolean(sessions.admin.token), sessions.admin.login, sessions.admin.role),
      readList: check(homeSummary.ok && homeSummary.status === 200, homeSummary),
      readDetail: check(homeDetail.ok && homeDetail.status === 200, homeDetail),
      create: check(false, { endpoint: 'N/A', status: null, ms: 0 }, 'No dedicated Home create operation endpoint'),
      update: check(false, { endpoint: 'N/A', status: null, ms: 0 }, 'No dedicated Home update operation endpoint'),
      deleteIfSupported: check(true, { endpoint: 'N/A', status: null, ms: 0 }, 'No dedicated Home delete endpoint'),
      search: check(false, { endpoint: '/orders/summary?q=', status: null, ms: 0 }, 'Search parameter unsupported'),
      filter: check(false, { endpoint: '/orders/summary?filter=', status: null, ms: 0 }, 'Filter parameter unsupported'),
      pagination: check(false, { endpoint: '/orders/summary?page=&pageSize=', status: null, ms: 0 }, 'Pagination unsupported'),
      rolePermission: check(
        (await req({ token: sessions.service.token, method: 'GET', path: '/orders/summary' })).status === 403,
        await req({ token: sessions.service.token, method: 'GET', path: '/orders/summary' }),
      ),
      auditLog: check(orderEvents.ok && orderEvents.status === 200 && (orderEvents.count ?? 0) > 0, orderEvents),
      offlineRecovery: check(!offlineProbe.ok && offlineRecovery.ok, { offlineProbe, offlineRecovery }),
      errorHandling: check(orderErrorHandling.status === 400, orderErrorHandling),
      notification: check(orderNotification.status === 201, orderNotification),
      refreshConsistency: check(orderRefreshA.status === 200 && orderRefreshB.status === 200 && orderRefreshA.count === orderRefreshB.count, { orderRefreshA, orderRefreshB }),
    },
  }

  const paymentCreate = orderId
    ? await req({ token: adminToken, method: 'POST', path: `/v1/orders/${orderId}/payments`, body: { amount: 500, method: 'TRANSFER', note: 'Sprint13 tahsilat' } })
    : { ok: false, status: null, ms: 0, endpoint: `POST /v1/orders/:id/payments`, body: null, error: 'order id missing', count: null, trace: [] }
  const paymentId = paymentCreate.body?.payment?.id ?? paymentCreate.body?.id ?? null
  const paymentsList = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/payments` })
    : { ok: false, status: null, ms: 0, endpoint: `GET /v1/orders/:id/payments`, body: null, error: 'order id missing', count: null, trace: [] }

  const paymentUpdate = orderId && paymentId
    ? await req({ token: sessions.finance.token, method: 'POST', path: `/v1/orders/${orderId}/payments/${paymentId}/approve`, body: { note: 'approved' } })
    : { ok: false, status: null, ms: 0, endpoint: `POST /v1/orders/:orderId/payments/:paymentId/approve`, body: null, error: 'payment id missing', count: null, trace: [] }

  const paymentForbidden = orderId
    ? await req({ token: sessions.service.token, method: 'POST', path: `/v1/orders/${orderId}/payments`, body: { amount: 100, method: 'CASH', note: 'forbidden-check' } })
    : { ok: false, status: null, ms: 0, endpoint: `POST /v1/orders/:id/payments`, body: null, error: 'order id missing', count: null, trace: [] }

  const collectionSummary = await req({ token: adminToken, method: 'GET', path: '/collections/summary' })
  const collectionSearch = await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/payments?q=sprint13` })

  summary.modules.Collections = {
    checks: {
      login: check(Boolean(sessions.finance.token), sessions.finance.login, sessions.finance.role),
      readList: check(collectionSummary.status === 200, collectionSummary),
      readDetail: check(paymentsList.status === 200, paymentsList),
      create: check(paymentCreate.status === 200, paymentCreate),
      update: check(paymentUpdate.status === 200, paymentUpdate),
      deleteIfSupported: check(true, { endpoint: 'N/A', status: null, ms: 0 }, 'Payment delete endpoint not supported'),
      search: check(collectionSearch.status === 200, collectionSearch),
      filter: check(false, { endpoint: '/collections/summary?filter=', status: null, ms: 0 }, 'Filter unsupported for summary endpoint'),
      pagination: check(false, { endpoint: '/collections/summary?page=&pageSize=', status: null, ms: 0 }, 'Pagination unsupported for summary endpoint'),
      rolePermission: check(paymentForbidden.status === 403, paymentForbidden),
      auditLog: check(orderEvents.status === 200 && (orderEvents.count ?? 0) > 0, orderEvents),
      offlineRecovery: check(!offlineProbe.ok && offlineRecovery.ok, { offlineProbe, offlineRecovery }),
      errorHandling: check(orderId ? (await req({ token: adminToken, method: 'POST', path: `/v1/orders/${orderId}/payments`, body: { amount: -5 } })).status === 400 : false, { endpoint: 'POST /v1/orders/:id/payments', status: orderId ? 'checked' : null }),
      notification: check(orderNotification.status === 201, orderNotification),
      refreshConsistency: check(paymentsList.status === 200 && paymentCreate.status === 200, { paymentsList, paymentCreate }),
    },
  }

  const shipmentList = await req({ token: adminToken, method: 'GET', path: '/v1/shipments' })
  const shipmentCreate = orderId
    ? await req({ token: adminToken, method: 'POST', path: `/v1/orders/${orderId}/shipments`, body: { plannedDate: addDaysIso(3), note: 'Sprint13 shipment', allowReceivingRisk: true } })
    : { ok: false, status: null, ms: 0, endpoint: 'POST /v1/orders/:id/shipments', body: null, error: 'order id missing', count: null, trace: [] }
  const shipmentId = shipmentCreate.body?.shipment?.id ?? shipmentCreate.body?.id ?? null
  const shipmentDetail = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/shipments` })
    : { ok: false, status: null, ms: 0, endpoint: 'GET /v1/orders/:id/shipments', body: null, error: 'order id missing', count: null, trace: [] }
  const shipmentUpdate = shipmentId
    ? await req({ token: adminToken, method: 'PATCH', path: `/v1/shipments/${shipmentId}/status`, body: { status: 'LOADED' } })
    : { ok: false, status: null, ms: 0, endpoint: 'PATCH /v1/shipments/:id/status', body: null, error: 'shipment id missing', count: null, trace: [] }
  const shipmentForbidden = orderId
    ? await req({ token: sessions.finance.token, method: 'POST', path: `/v1/orders/${orderId}/shipments`, body: { plannedDate: addDaysIso(4), note: 'forbidden' } })
    : { ok: false, status: null, ms: 0, endpoint: 'POST /v1/orders/:id/shipments', body: null, error: 'order id missing', count: null, trace: [] }

  summary.modules.Shipment = {
    checks: {
      login: check(Boolean(sessions.operation.token), sessions.operation.login, sessions.operation.role),
      readList: check(shipmentList.status === 200, shipmentList),
      readDetail: check(shipmentDetail.status === 200, shipmentDetail),
      create: check(shipmentCreate.status === 201, shipmentCreate),
      update: check(shipmentUpdate.status === 200, shipmentUpdate),
      deleteIfSupported: check(true, { endpoint: 'N/A', status: null, ms: 0 }, 'Shipment delete endpoint not supported'),
      search: check(false, { endpoint: '/v1/shipments?q=', status: null, ms: 0 }, 'Search unsupported on shipment queue'),
      filter: check(false, { endpoint: '/v1/shipments?status=', status: null, ms: 0 }, 'Filter unsupported on shipment queue endpoint'),
      pagination: check(false, { endpoint: '/v1/shipments?page=&pageSize=', status: null, ms: 0 }, 'Pagination unsupported on shipment queue endpoint'),
      rolePermission: check(shipmentForbidden.status === 403, shipmentForbidden),
      auditLog: check(orderEvents.status === 200 && (orderEvents.count ?? 0) > 0, orderEvents),
      offlineRecovery: check(!offlineProbe.ok && offlineRecovery.ok, { offlineProbe, offlineRecovery }),
      errorHandling: check(orderId ? (await req({ token: adminToken, method: 'POST', path: `/v1/orders/${orderId}/shipments`, body: { plannedDate: 'invalid' } })).status === 400 : false, { endpoint: 'POST /v1/orders/:id/shipments', status: orderId ? 'checked' : null }),
      notification: check(orderNotification.status === 201, orderNotification),
      refreshConsistency: check(shipmentList.status === 200 && shipmentDetail.status === 200, { shipmentList, shipmentDetail }),
    },
  }

  const serviceList = await req({ token: adminToken, method: 'GET', path: '/service/open' })
  const serviceCreate = orderId
    ? await req({ token: adminToken, method: 'POST', path: `/v1/orders/${orderId}/missing-items`, body: { title: 'Sprint13 servis', quantity: 1, reason: 'Validation' } })
    : { ok: false, status: null, ms: 0, endpoint: 'POST /v1/orders/:id/missing-items', body: null, error: 'order id missing', count: null, trace: [] }
  const missingItemId = serviceCreate.body?.missingItem?.id ?? null
  const serviceDetail = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/missing-items` })
    : { ok: false, status: null, ms: 0, endpoint: 'GET /v1/orders/:id/missing-items', body: null, error: 'order id missing', count: null, trace: [] }
  const serviceUpdate = missingItemId
    ? await req({ token: adminToken, method: 'PATCH', path: `/v1/missing-items/${missingItemId}/status`, body: { status: 'ORDERED' } })
    : { ok: false, status: null, ms: 0, endpoint: 'PATCH /v1/missing-items/:id/status', body: null, error: 'missing item id missing', count: null, trace: [] }
  const serviceForbidden = orderId
    ? await req({ token: sessions.sales.token, method: 'POST', path: `/v1/orders/${orderId}/missing-items`, body: { title: 'forbidden', quantity: 1, reason: 'test' } })
    : { ok: false, status: null, ms: 0, endpoint: 'POST /v1/orders/:id/missing-items', body: null, error: 'order id missing', count: null, trace: [] }

  summary.modules.Service = {
    checks: {
      login: check(Boolean(sessions.service.token), sessions.service.login, sessions.service.role),
      readList: check(serviceList.status === 200, serviceList),
      readDetail: check(serviceDetail.status === 200, serviceDetail),
      create: check(serviceCreate.status === 201, serviceCreate),
      update: check(serviceUpdate.status === 200, serviceUpdate),
      deleteIfSupported: check(true, { endpoint: 'N/A', status: null, ms: 0 }, 'Service delete endpoint not supported'),
      search: check(false, { endpoint: '/v1/orders/:id/missing-items?q=', status: null, ms: 0 }, 'Search unsupported for missing-items endpoint'),
      filter: check(false, { endpoint: '/v1/orders/:id/missing-items?status=', status: null, ms: 0 }, 'Filter unsupported for missing-items endpoint'),
      pagination: check(false, { endpoint: '/v1/orders/:id/missing-items?page=&pageSize=', status: null, ms: 0 }, 'Pagination unsupported for missing-items endpoint'),
      rolePermission: check(serviceForbidden.status === 403, serviceForbidden),
      auditLog: check(orderEvents.status === 200 && (orderEvents.count ?? 0) > 0, orderEvents),
      offlineRecovery: check(!offlineProbe.ok && offlineRecovery.ok, { offlineProbe, offlineRecovery }),
      errorHandling: check(orderId ? (await req({ token: adminToken, method: 'POST', path: `/v1/orders/${orderId}/missing-items`, body: { title: '' } })).status === 400 : false, { endpoint: 'POST /v1/orders/:id/missing-items', status: orderId ? 'checked' : null }),
      notification: check(orderNotification.status === 201, orderNotification),
      refreshConsistency: check(serviceDetail.status === 200 && serviceCreate.status === 201, { serviceDetail, serviceCreate }),
    },
  }

  const customerList = await req({ token: adminToken, method: 'GET', path: '/customers/summary' })
  const customerDetail = orderId
    ? await req({ token: adminToken, method: 'GET', path: `/v1/orders/${orderId}/events` })
    : { ok: false, status: null, ms: 0, endpoint: 'GET /v1/orders/:id', body: null, error: 'order id missing', count: null, trace: [] }
  const customerSearch = await req({ token: adminToken, method: 'GET', path: '/v1/orders?q=Sprint13' })
  const customerFilter = await req({ token: adminToken, method: 'GET', path: '/v1/orders?customerName=Sprint13' })
  const customerPagination = await req({ token: adminToken, method: 'GET', path: '/v1/orders?page=1&pageSize=5' })

  summary.modules.Customers = {
    checks: {
      login: check(Boolean(sessions.sales.token), sessions.sales.login, sessions.sales.role),
      readList: check(customerList.status === 200, customerList),
      readDetail: check(customerDetail.status === 200, customerDetail),
      create: check(false, { endpoint: '/v1/customers', status: null, ms: 0 }, 'Customer create endpoint not implemented'),
      update: check(false, { endpoint: '/v1/customers/:id', status: null, ms: 0 }, 'Customer update endpoint not implemented'),
      deleteIfSupported: check(true, { endpoint: '/v1/customers/:id', status: null, ms: 0 }, 'Customer delete endpoint not implemented'),
      search: check(customerSearch.status === 200, customerSearch),
      filter: check(customerFilter.status === 200, customerFilter),
      pagination: check(customerPagination.status === 200, customerPagination),
      rolePermission: check(false, { endpoint: '/customers/summary', status: customerList.status, ms: customerList.ms }, 'Endpoint does not enforce role-bound access'),
      auditLog: check(orderEvents.status === 200 && (orderEvents.count ?? 0) > 0, orderEvents),
      offlineRecovery: check(!offlineProbe.ok && offlineRecovery.ok, { offlineProbe, offlineRecovery }),
      errorHandling: check(orderErrorHandling.status === 400, orderErrorHandling),
      notification: check(orderNotification.status === 201, orderNotification),
      refreshConsistency: check(customerList.status === 200 && customerSearch.status === 200, { customerList, customerSearch }),
    },
  }

  summary.modules.Orders = {
    checks: {
      login: check(Boolean(sessions.sales.token), sessions.sales.login, sessions.sales.role),
      readList: check(ordersList.status === 200, ordersList),
      readDetail: check(orderDetailPayments.status === 200, orderDetailPayments),
      create: check(orderCreate.status === 201, orderCreate),
      update: check(orderUpdate.status === 200, orderUpdate),
      deleteIfSupported: check(true, { endpoint: '/v1/orders/:id', status: null, ms: 0 }, 'Order delete endpoint not implemented'),
      search: check(orderSearch.status === 200, orderSearch),
      filter: check(orderFilter.status === 200, orderFilter),
      pagination: check(orderPagination.status === 200, orderPagination),
      rolePermission: check(orderForbiddenByService.status === 403, orderForbiddenByService),
      auditLog: check(orderEvents.status === 200 && (orderEvents.count ?? 0) > 0, orderEvents),
      offlineRecovery: check(!offlineProbe.ok && offlineRecovery.ok, { offlineProbe, offlineRecovery }),
      errorHandling: check(orderErrorHandling.status === 400, orderErrorHandling),
      notification: check(orderNotification.status === 201, orderNotification),
      refreshConsistency: check(orderRefreshA.status === 200 && orderRefreshB.status === 200 && orderRefreshA.count === orderRefreshB.count, { orderRefreshA, orderRefreshB }),
    },
    ids: {
      createdOrderId: orderId,
      updatedOrderId: orderUpdate.body?.id ?? orderId,
      deletedOrderId: null,
    },
  }

  for (const [name, module] of Object.entries(summary.modules)) {
    module.status = moduleStatus(module.checks)
  }

  summary.finishedAt = nowIso()
  summary.moduleSummary = Object.fromEntries(
    Object.entries(summary.modules).map(([name, module]) => [name, module.status]),
  )

  await fs.mkdir('test-artifacts', { recursive: true })
  await fs.writeFile('test-artifacts/sprint13-real-operation-validation.json', JSON.stringify(summary, null, 2), 'utf8')

  console.log(JSON.stringify({
    file: 'test-artifacts/sprint13-real-operation-validation.json',
    modules: summary.moduleSummary,
  }, null, 2))
}

validate().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
