import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { listSalesOrderListItems } from '../src/services/listOrdersProjection.js'
import { projectSalesOrderListItemFromDbRow } from '../src/projection/salesOrderListItemProjection.js'

const prisma = new PrismaClient()
const ORDER_ID = 'S-1780137840703'

async function main() {
  const row = await prisma.salesOrder.findUnique({
    where: { id: ORDER_ID },
    include: {
      lines: true,
      payments: true,
      shipments: { include: { lines: true } },
      missingItems: { select: { status: true } },
    },
  })
  console.log('DB row exists:', Boolean(row))
  if (row) {
    console.log('customerName:', row.customerName)
    console.log('orderDate:', row.orderDate)
    console.log('createdAt:', row.createdAt)
    console.log('displayStatus:', row.displayStatus)
    console.log('lines:', row.lines.length)
    try {
      const projected = projectSalesOrderListItemFromDbRow(row, process.env.DEMO_TODAY ?? '2026-05-14')
      console.log('projection OK:', projected.id, projected.customerDisplayName)
    } catch (e) {
      console.error('projection FAILED:', e)
    }
  }

  const list = await listSalesOrderListItems(prisma)
  const inList = list.find((x) => x.id === ORDER_ID)
  console.log('listSalesOrderListItems count:', list.length)
  console.log('NİHAL in projection list:', Boolean(inList))

  process.env.AUTH_DISABLED = 'true'
  const app = await buildApp()
  await app.ready()
  const res = await app.inject({ method: 'GET', url: '/v1/orders' })
  console.log('GET /v1/orders status:', res.statusCode)
  const body = res.json() as { id: string; customerDisplayName?: string }[]
  console.log('GET /v1/orders count:', body.length)
  console.log('NİHAL in GET:', body.some((x) => x.id === ORDER_ID))
  const nihal = body.find((x) => x.id === ORDER_ID)
  if (nihal) console.log('NİHAL dto:', JSON.stringify(nihal, null, 2))

  await app.close()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
