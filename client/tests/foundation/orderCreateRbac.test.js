import { describe, expect, it, vi, beforeEach } from 'vitest'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import {
  canCreateSalesOrder,
  canPostOrderPayment,
} from '../../src/constants/orderDrawerPermissions.js'
import { canAccessPage } from '../../src/constants/roleAccess.js'
import { executeRefreshOrdersFlow } from '../../src/application/orderMutationOrchestration.js'
import * as ordersClient from '../../src/services/ordersClient.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  createOrder,
  resetMockOrdersStore,
  approveOrderPayment,
} from '../../src/services/mockApi.js'
import { getPaymentTransactionsForSalesOrder } from '../../src/services/mockPaymentStore.js'
import { PAYMENT_TRANSACTION_STATUS } from '../../src/contracts/v1/enums.js'

describe('order create RBAC', () => {
  it('Sales yeni sipariş oluşturabilir ve tahsilat girebilir', () => {
    expect(canCreateSalesOrder(USER_ROLE.SALES)).toBe(true)
    expect(canAccessPage(USER_ROLE.SALES, 'orders')).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.SALES)).toBe(true)
  })

  it('Operation yeni sipariş oluşturabilir ve tahsilat girebilir', () => {
    expect(canCreateSalesOrder(USER_ROLE.OPERATION)).toBe(true)
    expect(canAccessPage(USER_ROLE.OPERATION, 'orders')).toBe(true)
    expect(canPostOrderPayment(USER_ROLE.OPERATION)).toBe(true)
  })

  it('Finance ve Service sipariş oluşturamaz', () => {
    expect(canCreateSalesOrder(USER_ROLE.FINANCE)).toBe(false)
    expect(canCreateSalesOrder(USER_ROLE.SERVICE)).toBe(false)
  })

  it('refreshOrders sevk kuyruğu 403 olsa bile sipariş listesini yükler', async () => {
    const sampleDto = {
      id: 'S-RBAC-1',
      orderNumber: 'S-RBAC-1',
      customerName: 'Test',
      displayStatus: 'Bekleniyor',
      totalAmount: '1000',
      paidAmount: '0',
      remainingAmount: '1000',
      currency: 'TRY',
      orderDate: '2026-05-14',
      dueDate: '2026-05-28',
    }
    const getOrders = vi.spyOn(ordersClient, 'getOrders').mockResolvedValue(
      /** @type {import('../../src/contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} */ ([
        sampleDto,
      ]),
    )
    const getShipmentQueue = vi
      .spyOn(ordersClient, 'getShipmentQueue')
      .mockRejectedValue(new Error('Bu işlem için yetkiniz yok'))
    const getDomainEvents = vi.spyOn(ordersClient, 'getDomainEvents').mockResolvedValue([])
    const getTasks = vi.spyOn(ordersClient, 'getTasks').mockResolvedValue([])

    const result = await executeRefreshOrdersFlow()

    expect(result.salesOrderListItemDtos).toHaveLength(1)
    expect(result.shipmentQueueRows).toEqual([])

    getOrders.mockRestore()
    getShipmentQueue.mockRestore()
    getDomainEvents.mockRestore()
    getTasks.mockRestore()
  })
})

describe('operation order create flow', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    saveAuthSession({
      token: 'test',
      user: {
        id: 'mock-ops',
        fullName: 'Operasyon',
        email: 'ops@mobilya.local',
        role: 'OPERATION',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  })

  it('ops kullanıcısı kaporalı sipariş oluşturur — tahsilat onay bekler', async () => {
    const created = await createOrder({
      customerName: 'Ops Müşteri',
      productTitle: 'Koltuk',
      totalAmount: 10000,
      paidAmount: 2500,
      status: 'Bekleniyor',
      paymentMethod: 'CASH',
      lines: [{ title: 'Koltuk', quantity: 1, unitPrice: 10000, sortOrder: 0 }],
    })

    expect(created.id).toBeTruthy()
    const txs = getPaymentTransactionsForSalesOrder(created.id)
    expect(txs.some((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)).toBe(true)

    saveAuthSession({
      token: 'test',
      user: {
        id: 'mock-admin',
        fullName: 'Admin',
        email: 'admin@mobilya.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })

    const pending = txs.find((t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
    expect(pending?.id).toBeTruthy()
    await approveOrderPayment(created.id, pending.id, { approvalNote: 'Onaylandı' })
    const after = getPaymentTransactionsForSalesOrder(created.id)
    expect(after.find((t) => t.id === pending.id)?.status).toBe(PAYMENT_TRANSACTION_STATUS.POSTED)
  })

  it('warehouse sipariş oluşturamaz', async () => {
    saveAuthSession({
      token: 'test',
      user: {
        id: 'mock-wh',
        fullName: 'Depo',
        email: 'warehouse@mobilya.local',
        role: 'WAREHOUSE',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })

    await expect(
      createOrder({
        customerName: 'Depo Test',
        productTitle: 'Ürün',
        totalAmount: 1000,
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [{ title: 'Ürün', quantity: 1, unitPrice: 1000, sortOrder: 0 }],
      }),
    ).rejects.toThrow(/yetkiniz yok/i)
  })
})
