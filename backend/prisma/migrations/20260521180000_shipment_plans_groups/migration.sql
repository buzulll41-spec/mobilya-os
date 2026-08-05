-- CreateTable
CREATE TABLE "shipment_groups" (
    "id" TEXT NOT NULL,
    "groupNo" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "plannedDate" DATE NOT NULL,
    "vehicleName" TEXT,
    "crewPrimary" TEXT,
    "crewSecondary" TEXT,
    "estimatedSaving" DECIMAL(14,2) NOT NULL,
    "totalOrders" INTEGER NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_plans" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "plannedDate" DATE NOT NULL,
    "plannedTime" TEXT,
    "region" TEXT,
    "vehicleName" TEXT,
    "crewPrimary" TEXT,
    "crewSecondary" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "groupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipment_groups_groupNo_key" ON "shipment_groups"("groupNo");

-- CreateIndex
CREATE INDEX "shipment_groups_plannedDate_idx" ON "shipment_groups"("plannedDate");

-- CreateIndex
CREATE UNIQUE INDEX "shipment_plans_salesOrderId_key" ON "shipment_plans"("salesOrderId");

-- CreateIndex
CREATE INDEX "shipment_plans_plannedDate_idx" ON "shipment_plans"("plannedDate");

-- CreateIndex
CREATE INDEX "shipment_plans_groupId_idx" ON "shipment_plans"("groupId");

-- AddForeignKey
ALTER TABLE "shipment_plans" ADD CONSTRAINT "shipment_plans_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_plans" ADD CONSTRAINT "shipment_plans_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "shipment_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
