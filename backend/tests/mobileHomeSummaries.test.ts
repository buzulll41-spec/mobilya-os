import type { PrismaClient } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import {
  getCollectionsSummary,
  getCustomersSummary,
  getOrdersSummary,
  getReportsSummary,
  getServiceOpenSummary,
  getShipmentsTodaySummary,
} from '../src/services/mobileHomeSummaries.js'
import { FIELD_OPERATION_TYPE } from '../src/constants/fieldOperationConstants.js'

describe('mobileHomeSummaries', () => {
  it('returns pending collection amount and count', async () => {
    const prisma = {
      salesOrder: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { remainingAmount: '228750.00' } }),
        count: vi.fn().mockResolvedValue(7),
      },
    } as unknown as PrismaClient

    const result = await getCollectionsSummary(prisma)

    expect(result).toEqual({ pendingAmount: 228750, pendingCount: 7 })
  })

  it('counts todays shipments and excludes cancelled status', async () => {
    process.env.DEMO_TODAY = '2026-07-24'
    const count = vi.fn().mockResolvedValue(5)
    const prisma = {
      shipment: { count },
    } as unknown as PrismaClient

    const result = await getShipmentsTodaySummary(prisma)

    expect(result).toEqual({ todayCount: 5 })
    expect(count).toHaveBeenCalledWith({
      where: {
        plannedShipDate: {
          gte: new Date('2026-07-24T00:00:00.000Z'),
          lt: new Date('2026-07-25T00:00:00.000Z'),
        },
        status: { not: 'CANCELLED' },
      },
    })
  })

  it('counts open service operations', async () => {
    const count = vi.fn().mockResolvedValue(3)
    const prisma = {
      fieldOperation: { count },
    } as unknown as PrismaClient

    const result = await getServiceOpenSummary(prisma)

    expect(result).toEqual({ openCount: 3 })
    expect(count).toHaveBeenCalledWith({
      where: {
        type: FIELD_OPERATION_TYPE.SERVICE,
        deletedAt: null,
        status: { notIn: ['CLOSED', 'CANCELLED'] },
      },
    })
  })

  it('counts non-delivered orders', async () => {
    const count = vi.fn().mockResolvedValue(11)
    const prisma = {
      salesOrder: { count },
    } as unknown as PrismaClient

    const result = await getOrdersSummary(prisma)

    expect(result).toEqual({ orderCount: 11 })
    expect(count).toHaveBeenCalledWith({
      where: {
        displayStatus: { not: 'Teslim Edildi' },
      },
    })
  })

  it('counts distinct customers from sales orders', async () => {
    const groupBy = vi.fn().mockResolvedValue([{ customerName: 'A' }, { customerName: 'B' }])
    const prisma = {
      salesOrder: { groupBy },
    } as unknown as PrismaClient

    const result = await getCustomersSummary(prisma)

    expect(result).toEqual({ customerCount: 2 })
    expect(groupBy).toHaveBeenCalledWith({ by: ['customerName'] })
  })

  it('returns daily sales amount and report count', async () => {
    process.env.DEMO_TODAY = '2026-07-24'
    const prisma = {
      salesOrder: {
        aggregate: vi.fn().mockResolvedValue({ _sum: { totalAmount: '94500.50' } }),
      },
      domainEvent: {
        count: vi.fn().mockResolvedValue(19),
      },
    } as unknown as PrismaClient

    const result = await getReportsSummary(prisma)

    expect(result).toEqual({ reportCount: 19, dailySales: 94500.5 })
  })
})
