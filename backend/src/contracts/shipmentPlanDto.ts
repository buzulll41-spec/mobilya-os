import { optionalIsoDate } from '../lib/isoDate.js'

export type ShipmentPlanDto = {
  id: string
  salesOrderId: string
  plannedDate: string
  plannedTime: string | null
  region: string | null
  vehicleName: string | null
  crewPrimary: string | null
  crewSecondary: string | null
  note: string | null
  status: string
  groupId: string | null
  createdAt: string
  updatedAt: string
}

export type ShipmentGroupDto = {
  id: string
  groupNo: string
  region: string
  plannedDate: string
  vehicleName: string | null
  crewPrimary: string | null
  crewSecondary: string | null
  estimatedSaving: number
  totalOrders: number
  totalAmount: number
  orderIds: string[]
  createdAt: string
  updatedAt: string
}

export function mapShipmentPlanRow(row: {
  id: string
  salesOrderId: string
  plannedDate: Date
  plannedTime: string | null
  region: string | null
  vehicleName: string | null
  crewPrimary: string | null
  crewSecondary: string | null
  note: string | null
  status: string
  groupId: string | null
  createdAt: Date
  updatedAt: Date
}): ShipmentPlanDto {
  return {
    id: row.id,
    salesOrderId: row.salesOrderId,
    plannedDate: optionalIsoDate(row.plannedDate) ?? '',
    plannedTime: row.plannedTime,
    region: row.region,
    vehicleName: row.vehicleName,
    crewPrimary: row.crewPrimary,
    crewSecondary: row.crewSecondary,
    note: row.note,
    status: row.status,
    groupId: row.groupId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function mapShipmentGroupRow(row: {
  id: string
  groupNo: string
  region: string
  plannedDate: Date
  vehicleName: string | null
  crewPrimary: string | null
  crewSecondary: string | null
  estimatedSaving: { toNumber(): number }
  totalOrders: number
  totalAmount: { toNumber(): number }
  createdAt: Date
  updatedAt: Date
  plans?: { salesOrderId: string }[]
}): ShipmentGroupDto {
  return {
    id: row.id,
    groupNo: row.groupNo,
    region: row.region,
    plannedDate: optionalIsoDate(row.plannedDate) ?? '',
    vehicleName: row.vehicleName,
    crewPrimary: row.crewPrimary,
    crewSecondary: row.crewSecondary,
    estimatedSaving: row.estimatedSaving.toNumber(),
    totalOrders: row.totalOrders,
    totalAmount: row.totalAmount.toNumber(),
    orderIds: row.plans?.map((p) => p.salesOrderId) ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function parseIsoDateInput(value: string, field = 'plannedDate'): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} YYYY-MM-DD olmalı`)
  }
  return new Date(`${value}T00:00:00.000Z`)
}

export function normalizePlanTimeInput(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number.parseInt(m[1], 10)
  const min = Number.parseInt(m[2], 10)
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  return t ? t : undefined
}
