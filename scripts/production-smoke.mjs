import fs from 'node:fs/promises'

const baseRaw = process.env.SMOKE_BASE_URL ?? 'http://localhost'
const base = baseRaw.replace(/\/+$/, '')
const email = process.env.SMOKE_USER_EMAIL ?? 'admin@mobilya.local'
const password = process.env.SMOKE_USER_PASSWORD ?? 'admin123'
const REQUIRED_CHECKS = [
  'Login',
  'Dashboard',
  'Orders',
  'Revision',
  'Cancel',
  'Collections',
  'Shipments',
  'Delivery',
  'Customers',
  'Service',
  'Notifications',
  'Logout',
]

function resolveUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${base}${path}`
}

async function request(path, options = {}) {
  const url = resolveUrl(path)
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  return { status: res.status, ok: res.ok, body }
}

function assertOk(step, response, expectedStatus) {
  if (response.status !== expectedStatus) {
    throw new Error(`${step} failed: expected ${expectedStatus}, got ${response.status} -> ${JSON.stringify(response.body)}`)
  }
}

function assertOneOf(step, response, expectedStatuses) {
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${step} failed: expected one of ${expectedStatuses.join(', ')}, got ${response.status} -> ${JSON.stringify(response.body)}`,
    )
  }
}

function todayIso(offsetDays = 0) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function runSmoke() {
  const results = Object.fromEntries(REQUIRED_CHECKS.map((name) => [name, { status: 'FAIL', detail: 'not_run' }]))

  const markPass = (name, detail = 'ok') => {
    results[name] = { status: 'PASS', detail }
  }

  const markFail = (name, error) => {
    const detail = error instanceof Error ? error.message : String(error)
    results[name] = { status: 'FAIL', detail }
  }

  const report = {
    startedAt: new Date().toISOString(),
    base,
    results,
    steps: [],
  }

  let activeCheck = 'Login'
  try {
    const login = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    assertOk('login', login, 200)
    const token = login.body?.token
    if (!token) throw new Error('login token missing')
    markPass('Login')
    report.steps.push({ step: 'login', status: 'ok' })

    const auth = { Authorization: `Bearer ${token}` }

    activeCheck = 'Dashboard'
    const dashboard = await request('/api/health', { method: 'GET', headers: auth })
    assertOk('dashboard', dashboard, 200)
    markPass('Dashboard')
    report.steps.push({ step: 'dashboard', status: 'ok' })

    activeCheck = 'Orders'
    const createOrder = await request('/api/v1/orders', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        customerName: 'Smoke Test Musteri',
        phone: '+90 555 111 22 33',
        totalAmount: 2500,
        paidAmount: 0,
        status: 'Bekleniyor',
        orderDate: todayIso(0),
        dueDate: todayIso(7),
        shipmentDate: todayIso(2),
        salesPerson: 'Smoke Runner',
        lines: [{ title: 'Smoke Urun', quantity: 1, unitPrice: 2500 }],
      }),
    })
    assertOk('order', createOrder, 201)
    const orderId = createOrder.body?.id
    if (!orderId) throw new Error('order id missing')
    markPass('Orders', orderId)
    report.steps.push({ step: 'orders', status: 'ok', orderId })

    activeCheck = 'Revision'
    const revision = await request(`/api/v1/orders/${orderId}/termin`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        committedShipBy: todayIso(9),
        reason: 'Smoke revision check',
      }),
    })
    assertOk('revision', revision, 200)
    markPass('Revision')
    report.steps.push({ step: 'revision', status: 'ok' })

    activeCheck = 'Cancel'
    const cancelOrder = await request('/api/v1/orders', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        customerName: 'Smoke Cancel Musteri',
        phone: '+90 555 333 44 55',
        totalAmount: 1800,
        paidAmount: 0,
        status: 'Bekleniyor',
        orderDate: todayIso(0),
        dueDate: todayIso(5),
        shipmentDate: todayIso(2),
        salesPerson: 'Smoke Runner',
        lines: [{ title: 'Cancel Urun', quantity: 1, unitPrice: 1800 }],
      }),
    })
    assertOk('cancel-order-create', cancelOrder, 201)
    const cancelOrderId = cancelOrder.body?.id
    if (!cancelOrderId) throw new Error('cancel order id missing')

    const cancel = await request(`/api/v1/orders/${cancelOrderId}/status`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'İptal' }),
    })
    assertOk('cancel-order-status', cancel, 200)
    markPass('Cancel', cancelOrderId)
    report.steps.push({ step: 'cancel', status: 'ok', orderId: cancelOrderId })

    activeCheck = 'Collections'
    const collections = await request('/api/collections/summary', {
      method: 'GET',
      headers: auth,
    })
    assertOk('collections', collections, 200)
    markPass('Collections')
    report.steps.push({ step: 'collections', status: 'ok' })

    activeCheck = 'Customers'
    const customers = await request('/api/customers/summary', {
      method: 'GET',
      headers: auth,
    })
    assertOk('customers', customers, 200)
    markPass('Customers')
    report.steps.push({ step: 'customers', status: 'ok' })

    const payment = await request(`/api/v1/orders/${orderId}/payments`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ amount: 500, method: 'TRANSFER', note: 'Smoke payment' }),
    })
    assertOk('payment', payment, 200)
    report.steps.push({ step: 'collections_payment', status: 'ok' })

    activeCheck = 'Service'
    const service = await request(`/api/v1/orders/${orderId}/missing-items`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ title: 'Montaj aparati', quantity: 1, reason: 'Servis smoke kontrolu' }),
    })
    assertOk('service', service, 201)
    markPass('Service')
    report.steps.push({ step: 'service', status: 'ok' })

    activeCheck = 'Shipments'
    const shipment = await request(`/api/v1/orders/${orderId}/shipments`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        plannedDate: todayIso(3),
        note: 'Smoke shipment',
        allowReceivingRisk: true,
        policyOverrides: ['shipment.not_received', 'shipment.open_missing_ssh'],
      }),
    })
    assertOk('shipment', shipment, 201)
    markPass('Shipments')
    report.steps.push({ step: 'shipments', status: 'ok' })

    activeCheck = 'Delivery'
    const deliveryOrder = await request('/api/v1/orders', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        customerName: 'Smoke Delivery Musteri',
        phone: '+90 555 666 77 88',
        totalAmount: 3200,
        paidAmount: 3200,
        status: 'Hazır',
        orderDate: todayIso(0),
        dueDate: todayIso(4),
        shipmentDate: todayIso(1),
        salesPerson: 'Smoke Runner',
        lines: [{ title: 'Delivery Urun', quantity: 1, unitPrice: 3200 }],
      }),
    })
    assertOk('delivery-order-create', deliveryOrder, 201)
    const deliveryOrderId = deliveryOrder.body?.id
    if (!deliveryOrderId) throw new Error('delivery order id missing')

    const deliveryShipment = await request(`/api/v1/orders/${deliveryOrderId}/shipments`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        plannedDate: todayIso(1),
        note: 'Delivery smoke shipment',
        allowReceivingRisk: true,
      }),
    })
    assertOk('delivery-shipment-create', deliveryShipment, 201)
    const deliveryShipmentId = deliveryShipment.body?.shipment?.id
    if (!deliveryShipmentId) throw new Error('delivery shipment id missing')

    const loaded = await request(`/api/v1/shipments/${deliveryShipmentId}/status`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'LOADED' }),
    })
    assertOk('delivery-shipment-loaded', loaded, 200)

    const dispatched = await request(`/api/v1/shipments/${deliveryShipmentId}/status`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ status: 'DISPATCHED' }),
    })
    assertOk('delivery-shipment-dispatched', dispatched, 200)

    const delivered = await request(`/api/v1/shipments/${deliveryShipmentId}/status`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({
        status: 'DELIVERED',
        deliveredBy: 'Smoke Team',
        vehicle: 'Smoke Van 1',
        deliveredAt: todayIso(2),
      }),
    })
    assertOk('delivery-shipment-delivered', delivered, 200)
    markPass('Delivery', deliveryOrderId)
    report.steps.push({
      step: 'delivery',
      status: 'ok',
      orderId: deliveryOrderId,
      shipmentId: deliveryShipmentId,
    })

    const menu = await request('/api/reports/summary', {
      method: 'GET',
      headers: auth,
    })
    assertOk('menu', menu, 200)
    report.steps.push({ step: 'menu', status: 'ok' })

    activeCheck = 'Notifications'
    const notification = await request('/api/v1/domain-events', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        type: 'sales.contract_printed',
        salesOrderId: orderId,
        metadata: { source: 'production-smoke' },
      }),
    })
    assertOk('notification', notification, 201)
    markPass('Notifications')
    report.steps.push({ step: 'notification', status: 'ok' })

    activeCheck = 'Logout'
    const logout = await request('/api/v1/auth/logout', {
      method: 'POST',
      headers: auth,
    })
    assertOneOf('logout', logout, [204, 403])
    markPass('Logout')
    report.steps.push({ step: 'logout', status: 'ok' })

    report.finishedAt = new Date().toISOString()
    report.status = 'ok'
  } catch (error) {
    markFail(activeCheck, error)
    report.finishedAt = new Date().toISOString()
    report.status = 'failed'
    report.error = error instanceof Error ? error.message : String(error)
  }

  await fs.mkdir('test-artifacts', { recursive: true })
  await fs.writeFile('test-artifacts/production-smoke-report.json', JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
  if (report.status !== 'ok') {
    process.exit(1)
  }
}

runSmoke().catch(async (error) => {
  const report = {
    startedAt: new Date().toISOString(),
    base,
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
  }
  await fs.mkdir('test-artifacts', { recursive: true })
  await fs.writeFile('test-artifacts/production-smoke-report.json', JSON.stringify(report, null, 2), 'utf8')
  console.error(report.error)
  process.exit(1)
})
