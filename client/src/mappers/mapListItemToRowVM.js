import { parseCustomerExtraFromNotes } from '../features/orders/newOrderWizardModel.js'
import { moneyToNumber } from './moneyHelpers.js'

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */

/**
 * @param {SalesOrderListItemDto} dto
 * @returns {OrderListRowVM}
 */
export function mapListItemToRowVM(dto) {
  const amount = moneyToNumber(dto.totalAmount)
  const paidAmount = moneyToNumber(dto.amountPaid)
  const dueNum = moneyToNumber(dto.amountDue)
  const paid = dueNum <= 0.009
  const cost = dto.lineCostAmount ? moneyToNumber(dto.lineCostAmount) : undefined
  const notes = dto.notesSnapshot ?? undefined
  const extra = parseCustomerExtraFromNotes(notes)

  return {
    id: dto.id,
    customer: dto.customerDisplayName,
    phone: dto.customerPhone ?? undefined,
    phone2: extra.phone2,
    nationalId: extra.nationalId,
    taxNumber: extra.taxNumber,
    taxOffice: extra.taxOffice,
    product: dto.lineSummaryTitle,
    status: /** @type {import('../data/constants.js').OrderStatus} */ (dto.displayStatus),
    amount,
    cost,
    orderDate:
      typeof dto.placedAt === 'string' && dto.placedAt.length >= 10
        ? dto.placedAt.slice(0, 10)
        : '2026-05-14',
    ...(typeof dto.createdAt === 'string' && dto.createdAt.length >= 10
      ? { createdAt: dto.createdAt }
      : {}),
    dueDate: dto.latestCommittedShipBy ?? dto.earliestCommittedShipBy ?? undefined,
    shipmentDate:
      dto.shipmentSummaryNextPlannedDate ?? dto.plannedShipmentDate ?? undefined,
    paid,
    paidAmount: paid ? amount : paidAmount,
    notes,
    salesPerson: dto.salesPerson,
    orderNumber: dto.orderNumber,
    lifecycleStatus: dto.lifecycleStatus,
    riskSeverity: dto.currentRiskSeverity,
    operationalState: dto.operationalState,
  }
}
