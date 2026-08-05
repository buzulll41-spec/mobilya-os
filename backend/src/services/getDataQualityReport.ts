import type { PrismaClient } from '@prisma/client'
import { decimalToNumber } from '../lib/money.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { isIsoDateString } from '../lib/isoDate.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { SALES_SOURCE_TYPE, isSalesSourceType, salesSourceTypeLabelTr } from '../constants/salesSourceTypes.js'
import { isDisplayFloor, displayFloorLabelTr, type DisplayFloor } from '../constants/displayFloors.js'
import {
  isExternalSupplyType,
  externalSupplyTypeLabelTr,
  type ExternalSupplyType,
} from '../constants/externalSupplyTypes.js'
import type {
  DataQualityIssueCode,
  DataQualityIssueDto,
  DataQualityResponseDto,
  DataQualityRowDto,
  DataQualitySeverity,
  DataQualityStatus,
} from '../contracts/dataQualityDto.js'

export type DataQualityQuery = {
  from?: string
  to?: string
  salesPerson?: string
  /** 'all' | 'problem' | 'clean' */
  status?: string
  issueCode?: string
  q?: string
}

/** Değerlendirme girdisi — DB'den bağımsız (birim test için). */
export type DataQualityRecordInput = {
  orderLineId: string
  orderId: string
  orderDate: string // ISO yyyy-mm-dd
  customerName: string
  productTitle: string
  salesPerson: string | null
  soldSalesSourceType: string | null
  soldDisplayFloor: string | null
  soldExternalSupplyType: string | null
  soldUnitCost: number | null
}

/** Kalite skoru kuralları (puan düşürme miktarları). */
export const QUALITY_PENALTY: Record<DataQualityIssueCode, number> = {
  UNKNOWN_SOURCE: 40,
  MISSING_DISPLAY_FLOOR: 20,
  MISSING_EXTERNAL_SUPPLY_TYPE: 20,
  ZERO_COST: 30,
  SOURCE_CONFLICT: 30,
}

const ISSUE_META: Record<DataQualityIssueCode, { label: string; severity: DataQualitySeverity }> = {
  UNKNOWN_SOURCE: { label: 'Bilinmeyen Kaynak', severity: 'warning' },
  MISSING_DISPLAY_FLOOR: { label: 'Eksik Sergi Katı', severity: 'warning' },
  MISSING_EXTERNAL_SUPPLY_TYPE: { label: 'Eksik Dış Tedarik Tipi', severity: 'warning' },
  ZERO_COST: { label: 'Alış Maliyeti Yok', severity: 'critical' },
  SOURCE_CONFLICT: { label: 'Satış Kaynağı Çelişkisi', severity: 'critical' },
}

function makeIssue(code: DataQualityIssueCode): DataQualityIssueDto {
  return {
    code,
    label: ISSUE_META[code].label,
    severity: ISSUE_META[code].severity,
    penalty: QUALITY_PENALTY[code],
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export type ScoredRecord = {
  issues: DataQualityIssueDto[]
  qualityScore: number
  status: DataQualityStatus
}

/**
 * Tek kayıt için kalite problemlerini ve skorunu hesaplar (saf fonksiyon).
 *
 * Kurallar:
 *  - soldUnitCost <= 0 → ZERO_COST (kritik, -30)
 *  - kaynak boş / 'UNKNOWN' → UNKNOWN_SOURCE (-40)
 *  - IN_STORE_DISPLAY + geçersiz/eksik kat → MISSING_DISPLAY_FLOOR (-20)
 *  - EXTERNAL_SUPPLY + geçersiz/eksik tip → MISSING_EXTERNAL_SUPPLY_TYPE (-20)
 *  - geçerli olmayan eski değer (ör. WAREHOUSE) → SOURCE_CONFLICT (kritik, -30)
 *
 * Not: physicalLocation burada hiç değerlendirilmez (satış kaynağı değildir).
 */
export function scoreDataQualityRecord(input: {
  soldSalesSourceType: string | null
  soldDisplayFloor: string | null
  soldExternalSupplyType: string | null
  soldUnitCost: number | null
}): ScoredRecord {
  const issues: DataQualityIssueDto[] = []

  const source = typeof input.soldSalesSourceType === 'string' ? input.soldSalesSourceType.trim() : ''
  const floor = typeof input.soldDisplayFloor === 'string' ? input.soldDisplayFloor.trim() : ''
  const ext = typeof input.soldExternalSupplyType === 'string' ? input.soldExternalSupplyType.trim() : ''
  const cost = input.soldUnitCost ?? 0

  if (!(cost > 0)) {
    issues.push(makeIssue('ZERO_COST'))
  }

  if (source === '' || source === SALES_SOURCE_TYPE.UNKNOWN) {
    issues.push(makeIssue('UNKNOWN_SOURCE'))
  } else if (isSalesSourceType(source)) {
    if (source === SALES_SOURCE_TYPE.IN_STORE_DISPLAY && !isDisplayFloor(floor)) {
      issues.push(makeIssue('MISSING_DISPLAY_FLOOR'))
    } else if (source === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY && !isExternalSupplyType(ext)) {
      issues.push(makeIssue('MISSING_EXTERNAL_SUPPLY_TYPE'))
    }
  } else {
    // Geçerli kaynak listesinde olmayan eski/yanlış değer (ör. WAREHOUSE)
    issues.push(makeIssue('SOURCE_CONFLICT'))
  }

  const penaltySum = issues.reduce((s, i) => s + i.penalty, 0)
  const qualityScore = Math.max(0, Math.min(100, 100 - penaltySum))
  return { issues, qualityScore, status: issues.length === 0 ? 'OK' : 'PROBLEM' }
}

function sourceLabel(source: string): string {
  if (source === '') return 'Bilinmeyen'
  if (isSalesSourceType(source)) return salesSourceTypeLabelTr(source)
  return source // eski/yanlış değer ham gösterilir (yöneticiye görünsün)
}

/**
 * Saf değerlendirme: kayıt listesinden kalite raporu üretir.
 */
export function evaluateDataQuality(
  records: DataQualityRecordInput[],
  query: DataQualityQuery = {},
): DataQualityResponseDto {
  const fFrom = isIsoDateString(query.from ?? '') ? (query.from as string) : undefined
  const fTo = isIsoDateString(query.to ?? '') ? (query.to as string) : undefined
  const fSalesPerson = trimOrUndef(query.salesPerson)
  const fStatusRaw = trimOrUndef(query.status)?.toLowerCase()
  const fStatus = fStatusRaw === 'problem' || fStatusRaw === 'clean' ? fStatusRaw : undefined
  const fIssue = trimOrUndef(query.issueCode)
  const fq = trimOrUndef(query.q)?.toLocaleLowerCase('tr')

  const rows: DataQualityRowDto[] = []
  const issueCounts = new Map<DataQualityIssueCode, number>()
  const orderIds = new Set<string>()
  let scoreSum = 0
  let cleanRecords = 0
  let problemRecords = 0
  let unknownCount = 0
  let missingCostCount = 0

  for (const r of records) {
    if (fFrom && r.orderDate < fFrom) continue
    if (fTo && r.orderDate > fTo) continue
    if (fSalesPerson && (r.salesPerson ?? '') !== fSalesPerson) continue
    if (fq) {
      const hay = `${r.orderId} ${r.customerName} ${r.productTitle} ${r.salesPerson ?? ''}`.toLocaleLowerCase('tr')
      if (!hay.includes(fq)) continue
    }

    const scored = scoreDataQualityRecord(r)

    if (fStatus === 'problem' && scored.status !== 'PROBLEM') continue
    if (fStatus === 'clean' && scored.status !== 'OK') continue
    if (fIssue && !scored.issues.some((i) => i.code === fIssue)) continue

    const source = typeof r.soldSalesSourceType === 'string' ? r.soldSalesSourceType.trim() : ''
    const floor = typeof r.soldDisplayFloor === 'string' ? r.soldDisplayFloor.trim() : ''
    const ext = typeof r.soldExternalSupplyType === 'string' ? r.soldExternalSupplyType.trim() : ''

    rows.push({
      orderLineId: r.orderLineId,
      orderId: r.orderId,
      orderDate: r.orderDate,
      customerName: r.customerName,
      productTitle: r.productTitle,
      salesPerson: r.salesPerson ?? null,
      soldSalesSourceType: r.soldSalesSourceType ?? null,
      soldSalesSourceTypeLabel: sourceLabel(source),
      soldDisplayFloor: r.soldDisplayFloor ?? null,
      soldDisplayFloorLabel: isDisplayFloor(floor) ? displayFloorLabelTr(floor as DisplayFloor) : null,
      soldExternalSupplyType: r.soldExternalSupplyType ?? null,
      soldExternalSupplyTypeLabel: isExternalSupplyType(ext)
        ? externalSupplyTypeLabelTr(ext as ExternalSupplyType)
        : null,
      soldUnitCost: formatMoneyAmount(r.soldUnitCost ?? 0),
      qualityScore: scored.qualityScore,
      status: scored.status,
      issues: scored.issues,
    })

    orderIds.add(r.orderId)
    scoreSum += scored.qualityScore
    if (scored.status === 'OK') cleanRecords += 1
    else problemRecords += 1
    for (const issue of scored.issues) {
      issueCounts.set(issue.code, (issueCounts.get(issue.code) ?? 0) + 1)
      if (issue.code === 'UNKNOWN_SOURCE') unknownCount += 1
      if (issue.code === 'ZERO_COST') missingCostCount += 1
    }
  }

  const totalRecords = rows.length

  const issueCategories = (Object.keys(ISSUE_META) as DataQualityIssueCode[]).map((code) => ({
    code,
    label: ISSUE_META[code].label,
    severity: ISSUE_META[code].severity,
    count: issueCounts.get(code) ?? 0,
  }))

  // Önce problemli kayıtlar, en düşük skor üstte; sonra tarih (yeni → eski).
  rows.sort((a, b) => {
    if (a.qualityScore !== b.qualityScore) return a.qualityScore - b.qualityScore
    return a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : 0
  })

  return {
    rows,
    totals: {
      totalOrders: orderIds.size,
      totalRecords,
      cleanRecords,
      problemRecords,
      unknownCount,
      missingCostCount,
      averageQualityScore: totalRecords > 0 ? round1(scoreSum / totalRecords) : 100,
    },
    issueCategories,
    filters: {
      from: fFrom ?? null,
      to: fTo ?? null,
      salesPerson: fSalesPerson ?? null,
      status: fStatus ?? null,
      issueCode: fIssue ?? null,
      q: fq ?? null,
    },
    currency: 'TRY',
    generatedAt: new Date().toISOString(),
  }
}

export async function getDataQualityReport(
  prisma: PrismaClient,
  query: DataQualityQuery = {},
): Promise<DataQualityResponseDto> {
  try {
    const orders = await prisma.salesOrder.findMany({
      select: {
        id: true,
        orderDate: true,
        customerName: true,
        salesPerson: true,
        lines: {
          select: {
            id: true,
            title: true,
            productTitleSnapshot: true,
            soldUnitCost: true,
            soldSalesSourceType: true,
            soldDisplayFloor: true,
            soldExternalSupplyType: true,
          },
        },
      },
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
    })

    const records: DataQualityRecordInput[] = []
    for (const o of orders) {
      const orderDate = o.orderDate.toISOString().slice(0, 10)
      for (const l of o.lines) {
        records.push({
          orderLineId: l.id,
          orderId: o.id,
          orderDate,
          customerName: o.customerName,
          productTitle: l.productTitleSnapshot ?? l.title,
          salesPerson: o.salesPerson ?? null,
          soldSalesSourceType: l.soldSalesSourceType ?? null,
          soldDisplayFloor: l.soldDisplayFloor ?? null,
          soldExternalSupplyType: l.soldExternalSupplyType ?? null,
          soldUnitCost: l.soldUnitCost != null ? decimalToNumber(l.soldUnitCost) : null,
        })
      }
    }

    return evaluateDataQuality(records, query)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
