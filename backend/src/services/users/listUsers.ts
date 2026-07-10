import type { PrismaClient } from '@prisma/client'
import { userToPublicDto, type UserPublicDto } from '../../lib/authUser.js'

export async function listUsers(prisma: PrismaClient): Promise<UserPublicDto[]> {
  const rows = await prisma.user.findMany({ orderBy: [{ fullName: 'asc' }] })
  return rows.map(userToPublicDto)
}
