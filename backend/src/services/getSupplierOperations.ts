import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import type { SupplierOperationsDetailDto } from '../contracts/supplierOperationsDto.js'
import { formatCommercialMoney } from '../contracts/supplierOperationsDto.js'
import { decimalToNumber } from '../lib/money.js'
import { optionalIsoDate, toIsoDateString } from '../lib/isoDate.js'
import { fmtQty } from '../lib/productReadiness.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  buildSupplierLinkage,
  filterOpenProductsForSupplier,
  sumLedgerTotals,
} from '../lib/supplierOperationsCore.js'
import { loadSupplierBalanceSnapshot } from './supplierBalance.js'
import {
  computeSupplierOpsMetrics,
  estimateOpenProductCost,
  loadIncomingLinksBySupplier,
  loadLastPaymentDates,
  loadPendingLinesCore,
} from './buildSupplierOperationsContext.js'

export async function getSupplierOperations(
  prisma: PrismaClient,
  supplierId: string,
): Promise<SupplierOperationsDetailDto> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) throw new AppHttpError(404, 'Tedarikçi bulunamadı', 'Not Found')

  const [balance, pendingLines, incomingLinksMap, ledgerRows, incomingRows, lastPayments] =
    await Promise.all([
      loadSupplierBalanceSnapshot(prisma, supplierId),
      loadPendingLinesCore(prisma),
      loadIncomingLinksBySupplier(prisma),
      prisma.supplierLedgerEntry.findMany({
        where: { supplierId },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.incomingGoodsRecord.findMany({
        where: { supplierId },
        orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
        take: 30,
      }),
      loadLastPaymentDates(prisma, [supplierId]),
    ])

  const links = incomingLinksMap.get(supplierId) ?? []
  const linkage = buildSupplierLinkage(links)
  const ops = filterOpenProductsForSupplier(pendingLines, linkage, todayIso, supplierId)
  const metrics = computeSupplierOpsMetrics(
    pendingLines,
    links,
    todayIso,
    balance,
    supplier.isActive,
    lastPayments.get(supplierId) ?? null,
    supplierId,
  )

  const { totalPayments, totalPurchases } = sumLedgerTotals(ledgerRows)
  const openProductCost = await estimateOpenProductCost(prisma, supplierId, ops.openProducts)

  const incomingHistory = incomingRows.map((row) => ({
    id: row.id,
    productTitle: row.productTitle,
    qty: fmtQty(decimalToNumber(row.qty)),
    unitPurchasePrice: formatMoneyAmount(decimalToNumber(row.unitPurchasePrice)),
    lineTotal: formatMoneyAmount(decimalToNumber(row.lineTotal)),
    receivedAt: optionalIsoDate(row.receivedAt) ?? toIsoDateString(row.receivedAt),
    orderNumber: row.salesOrderId,
    customerName: null,
  }))

  return {
    supplierId,
    commercial: {
      totalPurchases: formatCommercialMoney(totalPurchases),
      totalPayments: formatCommercialMoney(totalPayments),
      openBalance: formatCommercialMoney(balance.openBalance),
      openProductCostEstimate: formatCommercialMoney(openProductCost),
      currency: 'TRY',
    },
    openProducts: ops.openProducts,
    pendingOrders: ops.pendingOrders,
    incomingHistory,
    healthStatus: metrics.healthStatus,
    healthLabel: metrics.healthLabel,
    openProductCount: metrics.openProductCount,
    pendingOrderCount: metrics.pendingOrderCount,
    lastActivityLabel: metrics.lastActivityLabel,
  }
}
