import { PrismaClient } from "@prisma/client";
const probe = new PrismaClient();
try {
  await probe.salesOrder.findFirst({ take: 1 });
  console.log("schemaReady: true");
} catch (e: unknown) {
  const err = e as Error;
  console.log("schemaReady: false", err.message);
} finally {
  await probe.$disconnect();
}
