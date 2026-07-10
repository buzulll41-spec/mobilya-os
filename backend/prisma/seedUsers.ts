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

export async function seedUsers(prisma: PrismaClient): Promise<void> {
  for (const u of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        passwordHash: hashPassword(u.password),
        role: u.role,
        isActive: true,
      },
      update: {
        fullName: u.fullName,
        passwordHash: hashPassword(u.password),
        role: u.role,
        isActive: true,
      },
    })
  }
}

export { DEMO_USERS }
