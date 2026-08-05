import { parseCustomerExtraFromNotes } from '../features/orders/newOrderWizardModel.js'

/** @typedef {import('../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * ViewModel → mevcut `Order` şekli (workspace, drawer, finans).
 * @param {OrderListRowVM} row
 * @returns {Order}
 */
export function listRowVmToLegacyOrder(row) {
  const extra = parseCustomerExtraFromNotes(row.notes)
  return {
    id: row.id,
    customer: row.customer,
    phone: row.phone,
    phone2: row.phone2 ?? extra.phone2,
    nationalId: row.nationalId ?? extra.nationalId,
    taxNumber: row.taxNumber ?? extra.taxNumber,
    taxOffice: row.taxOffice ?? extra.taxOffice,
    product: row.product,
    status: row.status,
    amount: row.amount,
    cost: row.cost,
    orderDate: row.orderDate,
    dueDate: row.dueDate,
    shipmentDate: row.shipmentDate,
    paid: row.paid,
    paidAmount: row.paidAmount,
    notes: row.notes,
    salesPerson: row.salesPerson,
  }
}
