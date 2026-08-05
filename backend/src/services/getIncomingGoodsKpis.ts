import type { PrismaClient } from '@prisma/client'
import { INCOMING_GOODS_PURPOSE } from '../constants/incomingGoodsPurpose.js'
import type { IncomingGoodsKpisDto } from '../contracts/incomingGoodsDto.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { loadBalancesForSuppliers } from './supplierBalance.js'
import { listIncomingGoods, todayIsoDate } from './listIncomingGoods.js'

export async function getIncomingGoodsKpis(prisma: PrismaClient): Promise<IncomingGoodsKpisDto> {
  const today = todayIsoDate()
  const todayRows = await listIncomingGoods(prisma, { receivedAt: today })

  let customerOrderCount = 0
  let stockCount = 0
  let displayCount = 0
  for (const row of todayRows) {
    if (row.purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) customerOrderCount += 1
    else if (row.purpose === INCOMING_GOODS_PURPOSE.STOCK) stockCount += 1
    else if (row.purpose === INCOMING_GOODS_PURPOSE.DISPLAY) displayCount += 1
  }

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true },
  })
  const balances = await loadBalancesForSuppliers(
    prisma,
    suppliers.map((s) => s.id),
  )
  let totalDebt = 0
  for (const snap of balances.values()) {
    totalDebt += snap.openBalance
  }

  return {
    todayCount: todayRows.length,
    customerOrderCount,
    stockCount,
    displayCount,
    totalSupplierDebt: formatMoneyAmount(totalDebt),
    currency: 'TRY',
  }
}
