import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { mapSupplierDetailDto, type SupplierDetailDto } from '../contracts/supplierDto.js'
import { loadSupplierBalanceSnapshot } from './supplierBalance.js'

export type PatchSupplierRequest = Partial<{
  companyName: string
  code: string | null
  contactName: string | null
  phone: string | null
  iban: string | null
  taxNumber: string | null
  taxOffice: string | null
  address: string | null
  isActive: boolean
}>

function optStringOrNull(v: unknown): string | null | undefined {
  if (v === null) return null
  if (typeof v === 'string') return v.trim() ? v.trim() : null
  return undefined
}

export function assertValidPatchSupplierRequest(body: unknown): PatchSupplierRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const patch: PatchSupplierRequest = {}

  if (typeof o.companyName === 'string') {
    const name = o.companyName.trim()
    if (!name) {
      throw new AppHttpError(400, 'Firma adı boş olamaz', 'Bad Request', { companyName: 'Required' })
    }
    patch.companyName = name
  }
  if ('code' in o) patch.code = optStringOrNull(o.code) ?? null
  if ('contactName' in o) patch.contactName = optStringOrNull(o.contactName) ?? null
  if ('phone' in o) patch.phone = optStringOrNull(o.phone) ?? null
  if ('iban' in o) patch.iban = optStringOrNull(o.iban) ?? null
  if ('taxNumber' in o) patch.taxNumber = optStringOrNull(o.taxNumber) ?? null
  if ('taxOffice' in o) patch.taxOffice = optStringOrNull(o.taxOffice) ?? null
  if ('address' in o) patch.address = optStringOrNull(o.address) ?? null
  if (typeof o.isActive === 'boolean') patch.isActive = o.isActive

  if (Object.keys(patch).length === 0) {
    throw new AppHttpError(400, 'Güncellenecek alan yok', 'Bad Request')
  }

  return patch
}

export async function patchSupplier(
  prisma: PrismaClient,
  supplierId: string,
  body: PatchSupplierRequest,
): Promise<SupplierDetailDto> {
  const existing = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!existing) {
    throw new AppHttpError(404, 'Tedarikçi bulunamadı', 'Not Found')
  }

  if (body.code && body.code !== existing.code) {
    const dup = await prisma.supplier.findFirst({
      where: { code: body.code, NOT: { id: supplierId } },
    })
    if (dup) {
      throw new AppHttpError(409, 'Bu kısa kod zaten kullanılıyor', 'Conflict')
    }
  }

  const row = await prisma.supplier.update({
    where: { id: supplierId },
    data: body,
  })

  const snap = await loadSupplierBalanceSnapshot(prisma, supplierId)
  return mapSupplierDetailDto(row, snap.openBalance, snap.lastMovementAt)
}
