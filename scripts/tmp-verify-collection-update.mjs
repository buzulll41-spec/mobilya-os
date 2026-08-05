const base = 'http://localhost/api'

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const started = Date.now()
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }
  return { status: res.status, ms: Date.now() - started, body: parsed }
}

const login = await req('POST', '/v1/auth/login', {
  email: 'admin@mobilya.local',
  password: 'admin123',
})
const token = login.body?.token

const order = await req('POST', '/v1/orders', {
  customerName: `S13C ${Date.now()}`,
  phone: '+905550001122',
  totalAmount: 1000,
  paidAmount: 0,
  status: 'Bekleniyor',
  orderDate: new Date().toISOString().slice(0, 10),
  dueDate: '2026-08-20',
  shipmentDate: '2026-08-10',
  salesPerson: 'Bot',
  lines: [{ title: 'Urun', quantity: 1, unitPrice: 1000 }],
}, token)

const orderId = order.body?.id

const payment = await req('POST', `/v1/orders/${orderId}/payments`, {
  amount: 100,
  method: 'TRANSFER',
  note: 's13',
}, token)

const list = await req('GET', `/v1/orders/${orderId}/payments`, null, token)
const paymentId = Array.isArray(list.body)
  ? list.body[0]?.id
  : list.body?.items?.[0]?.id

const approve = paymentId
  ? await req('POST', `/v1/orders/${orderId}/payments/${paymentId}/approve`, { note: 'ok' }, token)
  : { status: null, body: { message: 'payment id not found' }, ms: 0 }

console.log(JSON.stringify({
  loginStatus: login.status,
  orderId,
  paymentCreateStatus: payment.status,
  paymentListStatus: list.status,
  paymentCount: Array.isArray(list.body) ? list.body.length : (list.body?.items?.length ?? null),
  paymentId,
  paymentApproveStatus: approve.status,
  paymentApproveBody: approve.body,
}, null, 2))
