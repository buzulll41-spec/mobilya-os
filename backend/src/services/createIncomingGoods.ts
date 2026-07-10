import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  INCOMING_GOODS_PURPOSE,
  isIncomingGoodsPurpose,
} from '../constants/incomingGoodsPurpose.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../constants/supplierLedgerEntryTypes.js'
import {
  mapIncomingGoodsRecordDto,
  type IncomingGoodsRecordDto,
} from '../contracts/incomingGoodsDto.js'
import { parseIsoDateOnly } from '../lib/isoDate.js'
import { decimalToNumber } from '../lib/money.js'
import { loadSupplierBalanceSnapshot } from './supplierBalance.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import { formatGoodsReceiptLedgerDescription } from '../lib/supplierLedger.js'
import type { AuthUserContext } from '../lib/authUser.js'
import {
  SUPPLY_STATUS,
  computeWarehouseEntryStatusFromQty,
} from '../constants/supplyOrderStatus.js'
import { syncSalesOrderDisplayStatusFromLines } from './syncSalesOrderDisplayStatus.js'

const INCOMING_GOODS_RECORDED_EVENT = 'incoming_goods.recorded'

export type CreateIncomingGoodsRequest = {
  supplierId: string
  receivedAt: string
  productTitle: string
  productGroup?: string
  productId?: string
  qty: number
  unitPurchasePrice: number
  purpose: string
  orderLineId?: string
  invoiceNo?: string
  documentNo?: string
  note?: string
}

export function assertValidCreateIncomingGoodsRequest(body: unknown): CreateIncomingGoodsRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Geçersiz istek gövdesi', 'Validation Error')
  }
  const o = body as Record<string, unknown>
  const supplierId = typeof o.supplierId === 'string' ? o.supplierId.trim() : ''
  if (!supplierId) throw new AppHttpError(400, 'Tedarikçi seçilmeli', 'Validation Error')

  const receivedAt = typeof o.receivedAt === 'string' ? o.receivedAt.trim() : ''
  if (!receivedAt) throw new AppHttpError(400, 'Geliş tarihi zorunlu', 'Validation Error')
  parseIsoDateOnly(receivedAt)

  const productId =
    typeof o.productId === 'string' && o.productId.trim() ? o.productId.trim() : undefined
  let productTitle = typeof o.productTitle === 'string' ? o.productTitle.trim() : ''
  if (!productTitle && !productId) {
    throw new AppHttpError(400, 'Ürün adı veya ürün kartı zorunlu', 'Validation Error')
  }

  const purpose = typeof o.purpose === 'string' ? o.purpose.trim() : ''
  if (!isIncomingGoodsPurpose(purpose)) {
    throw new AppHttpError(400, 'Ürün amacı geçersiz', 'Validation Error')
  }

  const qty = typeof o.qty === 'number' ? o.qty : Number(o.qty)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new AppHttpError(400, "Adet 0'dan büyük olmalı", 'Validation Error')
  }

  const unitPurchasePrice =
    typeof o.unitPurchasePrice === 'number' ? o.unitPurchasePrice : Number(o.unitPurchasePrice)
  if (!Number.isFinite(unitPurchasePrice) || unitPurchasePrice < 0) {
    throw new AppHttpError(400, 'Alış fiyatı geçersiz', 'Validation Error')
  }

  const orderLineId =
    typeof o.orderLineId === 'string' && o.orderLineId.trim() ? o.orderLineId.trim() : undefined

  if (purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER && !orderLineId) {
    throw new AppHttpError(400, 'Müşteri siparişi için sipariş kalemi seçilmeli', 'Validation Error')
  }
  if (purpose !== INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER && orderLineId) {
    throw new AppHttpError(400, 'Stok/teşhir kaydında sipariş bağlantısı olamaz', 'Validation Error')
  }

  return {
    supplierId,
    receivedAt,
    productTitle,
    ...(productId ? { productId } : {}),
    productGroup:
      typeof o.productGroup === 'string' && o.productGroup.trim() ? o.productGroup.trim() : undefined,
    qty,
    unitPurchasePrice,
    purpose,
    orderLineId,
    invoiceNo: typeof o.invoiceNo === 'string' && o.invoiceNo.trim() ? o.invoiceNo.trim() : undefined,
    documentNo:
      typeof o.documentNo === 'string' && o.documentNo.trim() ? o.documentNo.trim() : undefined,
    note: typeof o.note === 'string' && o.note.trim() ? o.note.trim() : undefined,
  }
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

export async function createIncomingGoods(
  prisma: PrismaClient,
  body: CreateIncomingGoodsRequest,
  options?: { authUser?: AuthUserContext },
): Promise<IncomingGoodsRecordDto> {
  let productTitle = body.productTitle
  let productGroup = body.productGroup
  let supplierId = body.supplierId
  let unitPurchasePrice = body.unitPurchasePrice
  let productId = body.productId

  if (body.productId) {
    const product = await prisma.product.findUnique({ where: { id: body.productId } })
    if (!product) throw new AppHttpError(404, 'Ürün kartı bulunamadı', 'Not Found')
    if (!productTitle) productTitle = product.productName
    if (!productGroup) productGroup = product.category
    if (!supplierId && product.defaultSupplierId) supplierId = product.defaultSupplierId
    if (!Number.isFinite(unitPurchasePrice) || unitPurchasePrice <= 0) {
      unitPurchasePrice = Number(product.purchasePrice)
    }
    productId = product.id
  }

  if (!productTitle.trim()) {
    throw new AppHttpError(400, 'Ürün adı zorunlu', 'Validation Error')
  }

  const receivedAt = parseIsoDateOnly(body.receivedAt)
  const purchaseDueAt = new Date(receivedAt)
  purchaseDueAt.setUTCDate(purchaseDueAt.getUTCDate() + 30)

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) throw new AppHttpError(404, 'Tedarikçi bulunamadı', 'Not Found')
  if (!supplier.isActive) {
    throw new AppHttpError(400, 'Pasif tedarikçiye kayıt açılamaz', 'Validation Error')
  }

  return prisma.$transaction(async (tx) => {
    let salesOrderId: string | null = null
    let orderMeta: { orderNumber: string; customerName: string } | null = null
    let previousWarehouseStatus: string | undefined
    let nextWarehouseStatus: string | undefined
    let lineSoldUnitCost: number | null = null

    if (body.purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER && body.orderLineId) {
      const line = await tx.orderLine.findUnique({
        where: { id: body.orderLineId },
        include: { salesOrder: true },
      })
      if (!line) throw new AppHttpError(404, 'Sipariş kalemi bulunamadı', 'Not Found')

      const soldCost = decimalToNumber(line.soldUnitCost)
      lineSoldUnitCost = soldCost > 0 ? soldCost : null
      if (line.supplierId) {
        if (body.supplierId !== line.supplierId) {
          throw new AppHttpError(
            400,
            'Siparişe bağlı gelen ürün kaydında tedarikçi değiştirilemez',
            'Validation Error',
          )
        }
        supplierId = line.supplierId
      }
      if (lineSoldUnitCost != null && (!Number.isFinite(unitPurchasePrice) || unitPurchasePrice <= 0)) {
        unitPurchasePrice = lineSoldUnitCost
      }

      if (line.supplyStatus !== SUPPLY_STATUS.SENT) {
        throw new AppHttpError(
          409,
          'Tedarik emri verilmeden depo girişi yapılamaz',
          'Conflict',
        )
      }

      const ordered = decimalToNumber(line.qtyOrdered)
      const received = decimalToNumber(line.qtyReceived)
      const pending = ordered - received
      if (pending <= 0.0001) {
        throw new AppHttpError(
          409,
          'Bu ürünün tamamı daha önce depoya alınmıştır.',
          'Conflict',
        )
      }
      if (body.qty > pending + 0.0001) {
        throw new AppHttpError(
          400,
          `Gelen adet bekleyen miktarı (${pending.toFixed(2)}) aşamaz`,
          'Validation Error',
        )
      }

      const nextReceived = received + body.qty
      previousWarehouseStatus = line.warehouseEntryStatus
      nextWarehouseStatus = computeWarehouseEntryStatusFromQty(
        ordered,
        nextReceived,
        line.supplyStatus,
      )
      await tx.orderLine.update({
        where: { id: line.id },
        data: {
          qtyReceived: new Prisma.Decimal(nextReceived),
          warehouseEntryStatus: nextWarehouseStatus,
          shipmentReady: false,
        },
      })

      salesOrderId = line.salesOrderId
      orderMeta = {
        orderNumber: line.salesOrder.id,
        customerName: line.salesOrder.customerName,
      }
      await syncSalesOrderDisplayStatusFromLines(tx, salesOrderId)
    }

    const lineTotal = roundMoney(body.qty * unitPurchasePrice)

    const record = await tx.incomingGoodsRecord.create({
      data: {
        supplierId,
        receivedAt,
        productId: productId ?? null,
        productTitle,
        productGroup: productGroup ?? null,
        qty: new Prisma.Decimal(body.qty),
        unitPurchasePrice: new Prisma.Decimal(unitPurchasePrice),
        lineTotal: new Prisma.Decimal(lineTotal),
        purpose: body.purpose,
        orderLineId: body.orderLineId ?? null,
        salesOrderId,
        invoiceNo: body.invoiceNo ?? null,
        documentNo: body.documentNo ?? null,
        note: body.note ?? null,
      },
      include: { supplier: { select: { companyName: true } } },
    })

    const snap = await loadSupplierBalanceSnapshot(tx, supplierId)
    const balanceAfter = snap.openBalance + lineTotal
    const ledgerDescription = formatGoodsReceiptLedgerDescription({
      customerName: orderMeta?.customerName ?? null,
      orderId: salesOrderId,
      productTitle,
      qty: body.qty,
      unitPrice: unitPurchasePrice,
      lineTotal,
    })

    await tx.supplierLedgerEntry.create({
      data: {
        supplierId,
        entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
        occurredAt: receivedAt,
        description: ledgerDescription,
        debitAmount: new Prisma.Decimal(0),
        creditAmount: new Prisma.Decimal(lineTotal),
        balanceAfter: new Prisma.Decimal(balanceAfter),
        currency: 'TRY',
        documentNo: salesOrderId ?? body.documentNo ?? body.invoiceNo ?? null,
        salesOrderId,
        customerNameSnapshot: orderMeta?.customerName ?? null,
        productTitleSnapshot: productTitle,
        dueAt: purchaseDueAt,
        incomingGoodsRecordId: record.id,
      },
    })

    const aggregateId = salesOrderId ?? body.supplierId
    const aggregateType = salesOrderId ? 'SalesOrder' : 'Supplier'
    await tx.domainEvent.create({
      data: domainEventCreateInput(
        aggregateId,
        aggregateType,
        INCOMING_GOODS_RECORDED_EVENT,
        `corr-incoming-${record.id}`,
        receivedAt,
        {
          incomingGoodsRecordId: record.id,
          supplierId: body.supplierId,
          productTitle,
          qty: body.qty,
          purpose: body.purpose,
          lineTotal,
          ...(salesOrderId ? { salesOrderId } : {}),
          ...(body.orderLineId ? { orderLineId: body.orderLineId } : {}),
          ...(body.orderLineId && previousWarehouseStatus && nextWarehouseStatus
            ? {
                previousWarehouseStatus,
                newWarehouseStatus: nextWarehouseStatus,
              }
            : {}),
        },
        options?.authUser,
      ),
    })

    return mapIncomingGoodsRecordDto(record, orderMeta)
  })
}
