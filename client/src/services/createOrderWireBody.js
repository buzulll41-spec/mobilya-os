/**

 * POST /v1/orders — Fastify schema ile uyumlu gövde (additionalProperties: false).

 * @param {import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} body

 */

export function toCreateOrderWireBody(body) {

  /** @type {Record<string, unknown>} */

  const wire = {

    customerName: body.customerName,

    paidAmount: body.paidAmount,

    status: body.status,

  }



  if (typeof body.productTitle === 'string' && body.productTitle.trim()) {

    wire.productTitle = body.productTitle.trim()

  }

  if (typeof body.subtotalAmount === 'number' && Number.isFinite(body.subtotalAmount)) {

    wire.subtotalAmount = body.subtotalAmount

  }

  if (typeof body.discountAmount === 'number' && Number.isFinite(body.discountAmount)) {

    wire.discountAmount = body.discountAmount

  }

  if (typeof body.discountType === 'string' && body.discountType.trim()) {

    wire.discountType = body.discountType.trim().toUpperCase()

  }

  if (typeof body.discountPercent === 'number' && Number.isFinite(body.discountPercent)) {

    wire.discountPercent = body.discountPercent

  }

  if (typeof body.discountFixedAmount === 'number' && Number.isFinite(body.discountFixedAmount)) {

    wire.discountFixedAmount = body.discountFixedAmount

  }

  if (typeof body.discountNote === 'string' && body.discountNote.trim()) {

    wire.discountNote = body.discountNote.trim()

  }

  if (typeof body.totalAmount === 'number' && Number.isFinite(body.totalAmount)) {

    wire.totalAmount = body.totalAmount

  }

  if (typeof body.phone === 'string' && body.phone.trim()) {

    wire.phone = body.phone.trim()

  }

  if (typeof body.salesPerson === 'string' && body.salesPerson.trim()) {

    wire.salesPerson = body.salesPerson.trim()

  }

  if (typeof body.dueDate === 'string' && body.dueDate.trim()) {

    wire.dueDate = body.dueDate.trim()

  }

  if (typeof body.shipmentDate === 'string' && body.shipmentDate.trim()) {

    wire.shipmentDate = body.shipmentDate.trim()

  }

  if (typeof body.notes === 'string' && body.notes.trim()) {

    wire.notes = body.notes.trim()

  }

  if (typeof body.cost === 'number' && Number.isFinite(body.cost)) {

    wire.cost = body.cost

  }



  if (typeof body.paymentMethod === 'string' && body.paymentMethod.trim()) {

    wire.paymentMethod = body.paymentMethod.trim().toUpperCase()

  }

  if (typeof body.paymentNote === 'string' && body.paymentNote.trim()) {

    wire.paymentNote = body.paymentNote.trim()

  }

  if (typeof body.mailOrderCustomerId === 'string' && body.mailOrderCustomerId.trim()) {

    wire.mailOrderCustomerId = body.mailOrderCustomerId.trim()

  }

  if (typeof body.mailOrderSupplierId === 'string' && body.mailOrderSupplierId.trim()) {

    wire.mailOrderSupplierId = body.mailOrderSupplierId.trim()

  }

  if (

    typeof body.mailOrderCommissionRate === 'number' &&

    Number.isFinite(body.mailOrderCommissionRate)

  ) {

    wire.mailOrderCommissionRate = body.mailOrderCommissionRate

  }

  if (typeof body.mailOrderAmount === 'number' && Number.isFinite(body.mailOrderAmount)) {

    wire.mailOrderAmount = body.mailOrderAmount

  }



  if (Array.isArray(body.lines) && body.lines.length > 0) {

    wire.lines = body.lines.map((ln, index) => {

      /** @type {Record<string, unknown>} */

      const row = {

        title: String(ln.title).trim(),

        quantity: ln.quantity,

        unitPrice: ln.unitPrice,

        sortOrder: typeof ln.sortOrder === 'number' ? ln.sortOrder : index,

      }

      if (typeof ln.lineTotal === 'number' && Number.isFinite(ln.lineTotal)) {

        row.lineTotal = ln.lineTotal

      }

      if (typeof ln.productGroup === 'string' && ln.productGroup.trim()) {

        row.productGroup = ln.productGroup.trim()

      }

      if (typeof ln.productId === 'string' && ln.productId.trim()) {

        row.productId = ln.productId.trim()

      }

      if (typeof ln.supplierId === 'string' && ln.supplierId.trim()) {

        row.supplierId = ln.supplierId.trim()

      }

      if (typeof ln.supplierNameSnapshot === 'string' && ln.supplierNameSnapshot.trim()) {

        row.supplierNameSnapshot = ln.supplierNameSnapshot.trim()

      }

      if (

        ln.configuration &&

        typeof ln.configuration === 'object' &&

        Object.keys(ln.configuration).length > 0

      ) {

        row.configuration = ln.configuration

      }

      return row

    })

  }



  return wire

}

