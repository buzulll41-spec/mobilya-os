import type { PrismaClient } from '@prisma/client'
import { FIELD_OPERATION_STATUS, FIELD_OPERATION_TYPE } from '../constants/fieldOperationConstants.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'

type NumericLike = number | string | bigint | null | undefined

function toNumber(value: NumericLike): number {
  if (value == null) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function resolveTodayIso(): string {
  return process.env.DEMO_TODAY ?? new Date().toISOString().slice(0, 10)
}

function resolveTodayDate(todayIso: string): Date {
  return new Date(`${todayIso}T00:00:00.000Z`)
}

function resolveTomorrowDate(todayIso: string): Date {
  const day = resolveTodayDate(todayIso)
  day.setUTCDate(day.getUTCDate() + 1)
  return day
}

export async function getCollectionsSummary(prisma: PrismaClient): Promise<{
  pendingAmount: number
  pendingCount: number
}> {
  try {
    const [agg, count] = await Promise.all([
      prisma.salesOrder.aggregate({
        _sum: { remainingAmount: true },
        where: { remainingAmount: { gt: 0 } },
      }),
      prisma.salesOrder.count({
        where: { remainingAmount: { gt: 0 } },
      }),
    ])

    return {
      pendingAmount: toNumber(agg._sum.remainingAmount as NumericLike),
      pendingCount: count,
    }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function getShipmentsTodaySummary(prisma: PrismaClient): Promise<{
  todayCount: number
}> {
  const todayIso = resolveTodayIso()
  const today = resolveTodayDate(todayIso)
  const tomorrow = resolveTomorrowDate(todayIso)

  try {
    const todayCount = await prisma.shipment.count({
      where: {
        plannedShipDate: {
          gte: today,
          lt: tomorrow,
        },
        status: {
          not: 'CANCELLED',
        },
      },
    })

    return { todayCount }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function getServiceOpenSummary(prisma: PrismaClient): Promise<{
  openCount: number
}> {
  try {
    const openCount = await prisma.fieldOperation.count({
      where: {
        type: FIELD_OPERATION_TYPE.SERVICE,
        deletedAt: null,
        status: {
          notIn: [FIELD_OPERATION_STATUS.CLOSED, FIELD_OPERATION_STATUS.CANCELLED],
        },
      },
    })

    return { openCount }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function getOrdersSummary(prisma: PrismaClient): Promise<{
  orderCount: number
}> {
  try {
    const orderCount = await prisma.salesOrder.count({
      where: {
        displayStatus: {
          not: 'Teslim Edildi',
        },
      },
    })

    return { orderCount }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function getCustomersSummary(prisma: PrismaClient): Promise<{
  customerCount: number
}> {
  try {
    const groups = await prisma.salesOrder.groupBy({
      by: ['customerName'],
    })

    return { customerCount: groups.length }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}

export async function getReportsSummary(prisma: PrismaClient): Promise<{
  reportCount: number
  dailySales: number
}> {
  const todayIso = resolveTodayIso()
  const today = resolveTodayDate(todayIso)
  const tomorrow = resolveTomorrowDate(todayIso)

  try {
    const [todayAgg, reportCount] = await Promise.all([
      prisma.salesOrder.aggregate({
        _sum: { totalAmount: true },
        where: {
          orderDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.domainEvent.count({
        where: {
          occurredAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
    ])

    return {
      reportCount,
      dailySales: toNumber(todayAgg._sum.totalAmount as NumericLike),
    }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
