const base = 'http://localhost/api'

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let parsed = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = text }
  return { status: res.status, body: parsed }
}

const admin = await req('POST', '/v1/auth/login', { email: 'admin@mobilya.local', password: 'admin123' })
const sales = await req('POST', '/v1/auth/login', { email: 'sales@mobilya.local', password: 'sales123' })
const finance = await req('POST', '/v1/auth/login', { email: 'finance@mobilya.local', password: 'finance123' })

const order = await req('POST', '/v1/orders', {
  customerName: `S13CF ${Date.now()}`,
  phone: '+905550009900',
  totalAmount: 1200,
  paidAmount: 0,
  status: 'Bekleniyor',
  orderDate: new Date().toISOString().slice(0, 10),
  dueDate: '2026-08-20',
  shipmentDate: '2026-08-10',
  salesPerson: 'Sales Bot',
  lines: [{ title: 'Flow Urun', quantity: 1, unitPrice: 1200 }],
}, admin.body?.token)
const orderId = order.body?.id

const postedBySales = await req('POST', `/v1/orders/${orderId}/payments`, {
  amount: 200,
  method: 'TRANSFER',
  note: 'sales-posted',
}, sales.body?.token)

const list = await req('GET', `/v1/orders/${orderId}/payments`, null, admin.body?.token)
const paymentId = Array.isArray(list.body) ? list.body[0]?.id : list.body?.items?.[0]?.id

const approvedByFinance = paymentId
  ? await req('POST', `/v1/orders/${orderId}/payments/${paymentId}/approve`, { note: 'finance-approve' }, finance.body?.token)
  : { status: null, body: { message: 'payment id not found' } }

console.log(JSON.stringify({
  orderId,
  postedBySalesStatus: postedBySales.status,
  paymentId,
  approvedByFinanceStatus: approvedByFinance.status,
  approvedByFinanceBody: approvedByFinance.body,
}, null, 2))
