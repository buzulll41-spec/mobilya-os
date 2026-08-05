import type { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'
import { USER_ROLE } from '../src/constants/userRoles.js'

const DEMO_USERS = [
  {
    id: 'user-admin-demo',
    fullName: 'Admin Demo',
    email: 'admin@mobilya.local',
    password: 'admin123',
    role: USER_ROLE.ADMIN,
  },
  {
    id: 'user-manager-demo',
    fullName: 'Mağaza Müdürü',
    email: 'manager@mobilya.local',
    password: 'manager123',
    role: USER_ROLE.MANAGER,
  },
  {
    id: 'user-sales-demo',
    fullName: 'Satış Temsilcisi',
    email: 'sales@mobilya.local',
    password: 'sales123',
    role: USER_ROLE.SALES,
  },
  {
    id: 'user-ops-demo',
    fullName: 'Operasyon Sorumlusu',
    email: 'ops@mobilya.local',
    password: 'ops123',
    role: USER_ROLE.OPERATION,
  },
  {
    id: 'user-warehouse-demo',
    fullName: 'Depo Sorumlusu',
    email: 'warehouse@mobilya.local',
    password: 'warehouse123',
    role: USER_ROLE.WAREHOUSE,
  },
  {
    id: 'user-service-demo',
    fullName: 'Servis Sorumlusu',
    email: 'service@mobilya.local',
    password: 'service123',
    role: USER_ROLE.SERVICE,
  },
  {
    id: 'user-finance-demo',
    fullName: 'Finans Sorumlusu',
    email: 'finance@mobilya.local',
    password: 'finance123',
    role: USER_ROLE.FINANCE,
  },
] as const

type SeedUserInput = {
  id: string
  fullName: string
  email: string
  password: string
  role: (typeof USER_ROLE)[keyof typeof USER_ROLE]
}

function parseProductionUsersFromEnv(): SeedUserInput[] {
  const raw = process.env.SEED_USERS_JSON?.trim()
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const r = row as Record<string, unknown>
        const id = typeof r.id === 'string' ? r.id.trim() : ''
        const fullName = typeof r.fullName === 'string' ? r.fullName.trim() : ''
        const email = typeof r.email === 'string' ? r.email.trim().toLowerCase() : ''
        const password = typeof r.password === 'string' ? r.password : ''
        const role = typeof r.role === 'string' ? r.role.trim().toUpperCase() : ''
        if (!id || !fullName || !email || !password) return null
        if (!Object.values(USER_ROLE).includes(role as (typeof USER_ROLE)[keyof typeof USER_ROLE])) return null
        return {
          id,
          fullName,
          email,
          password,
          role: role as (typeof USER_ROLE)[keyof typeof USER_ROLE],
        }
      })
      .filter((x): x is SeedUserInput => Boolean(x))
  } catch {
    return []
  }
}

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const count = await prisma.user.count()
  if (count > 0) {
    console.log(`Pilot-safe seed: ${count} kullanıcı mevcut — kullanıcı seed atlandı`)
    return
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const users = isProduction ? parseProductionUsersFromEnv() : [...DEMO_USERS]

  if (isProduction && users.length === 0) {
    console.log('Pilot-safe seed: production için SEED_USERS_JSON tanımlı değil — kullanıcı seed atlandı')
    return
  }

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        passwordHash: hashPassword(u.password),
        role: u.role,
        isActive: true,
      },
    })
  }
}

export { DEMO_USERS }
