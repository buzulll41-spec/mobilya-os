import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { mapSupplierDetailDto, type SupplierDetailDto } from '../contracts/supplierDto.js'

export type CreateSupplierRequest = {
  companyName: string
  code?: string
  contactName?: string
  phone?: string
  iban?: string
  taxNumber?: string
  taxOffice?: string
  address?: string
  isActive?: boolean
}

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function assertValidCreateSupplierRequest(body: unknown): CreateSupplierRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const companyName = typeof o.companyName === 'string' ? o.companyName.trim() : ''
  const details: Record<string, string> = {}
  if (!companyName) details.companyName = 'Required'

  if (Object.keys(details).length > 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', details)
  }

  return {
    companyName,
    ...(optString(o.code) ? { code: optString(o.code) } : {}),
    ...(optString(o.contactName) ? { contactName: optString(o.contactName) } : {}),
    ...(optString(o.phone) ? { phone: optString(o.phone) } : {}),
    ...(optString(o.iban) ? { iban: optString(o.iban) } : {}),
    ...(optString(o.taxNumber) ? { taxNumber: optString(o.taxNumber) } : {}),
    ...(optString(o.taxOffice) ? { taxOffice: optString(o.taxOffice) } : {}),
    ...(optString(o.address) ? { address: optString(o.address) } : {}),
    ...(typeof o.isActive === 'boolean' ? { isActive: o.isActive } : {}),
  }
}

export async function createSupplier(
  prisma: PrismaClient,
  body: CreateSupplierRequest,
): Promise<SupplierDetailDto> {
  if (body.code) {
    const dup = await prisma.supplier.findFirst({ where: { code: body.code } })
    if (dup) {
      throw new AppHttpError(409, 'Bu kısa kod zaten kullanılıyor', 'Conflict', { code: 'Duplicate' })
    }
  }

  const row = await prisma.supplier.create({
    data: {
      companyName: body.companyName,
      code: body.code ?? null,
      contactName: body.contactName ?? null,
      phone: body.phone ?? null,
      iban: body.iban ?? null,
      taxNumber: body.taxNumber ?? null,
      taxOffice: body.taxOffice ?? null,
      address: body.address ?? null,
      isActive: body.isActive ?? true,
    },
  })

  return mapSupplierDetailDto(row, 0, null)
}
