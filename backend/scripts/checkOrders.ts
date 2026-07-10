import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const nihal = await prisma.salesOrder.findMany({
    where: { customerName: { contains: 'NİHAL', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      customerName: true,
      displayStatus: true,
      createdAt: true,
      totalAmount: true,
      productSummary: true,
    },
  })
  const nihalAlt = await prisma.salesOrder.findMany({
    where: { customerName: { contains: 'NIHAL', mode: 'insensitive' } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, customerName: true, createdAt: true },
  })
  const count = await prisma.salesOrder.count()
  const recent = await prisma.salesOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { id: true, customerName: true, createdAt: true, displayStatus: true },
  })

  console.log(JSON.stringify({ totalOrders: count, nihal, nihalAlt, recent }, null, 2))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
