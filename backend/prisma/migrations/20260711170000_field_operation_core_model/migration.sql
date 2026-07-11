-- Enterprise 2.2 — Field Operation Core Model
-- Saha Operasyon Merkezi çekirdek veri modeli. Yalnızca yeni field_operation* tabloları
-- eklenir; mevcut tablolar değiştirilmez (payment_transactions'a yalnızca FK referansı gelir).

-- CreateTable
CREATE TABLE "field_operations" (
    "id" TEXT NOT NULL,
    "operationNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderId" TEXT,
    "shipmentPlanId" TEXT,
    "serviceRecordId" TEXT,
    "customerId" TEXT,
    "addressId" TEXT,
    "plannedDate" DATE,
    "plannedStartTime" TEXT,
    "plannedEndTime" TEXT,
    "actualStartTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "assignedTeamId" TEXT,
    "assignedVehicleId" TEXT,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "requiresPayment" BOOLEAN NOT NULL DEFAULT false,
    "requiresLocation" BOOLEAN NOT NULL DEFAULT false,
    "dedupeKey" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "field_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_tasks" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "assignedUserId" TEXT,
    "note" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "field_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_assignments" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "assignedByUserId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_operation_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "leaderUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "field_operation_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_vehicles" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "field_operation_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_timelines" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_operation_timelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_evidences" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3),
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "field_operation_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_issues" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "field_operation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_part_requests" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "productId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "field_operation_part_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_payment_links" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "paymentTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_operation_payment_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_customer_approvals" (
    "id" TEXT NOT NULL,
    "fieldOperationId" TEXT NOT NULL,
    "customerName" TEXT,
    "approvalType" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "signatureEvidenceId" TEXT,
    "note" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_operation_customer_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_operations_operationNumber_key" ON "field_operations"("operationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "field_operations_dedupeKey_key" ON "field_operations"("dedupeKey");

-- CreateIndex
CREATE INDEX "field_operations_status_plannedDate_idx" ON "field_operations"("status", "plannedDate");

-- CreateIndex
CREATE INDEX "field_operations_type_status_idx" ON "field_operations"("type", "status");

-- CreateIndex
CREATE INDEX "field_operations_orderId_idx" ON "field_operations"("orderId");

-- CreateIndex
CREATE INDEX "field_operations_shipmentPlanId_idx" ON "field_operations"("shipmentPlanId");

-- CreateIndex
CREATE INDEX "field_operations_assignedTeamId_idx" ON "field_operations"("assignedTeamId");

-- CreateIndex
CREATE INDEX "field_operations_deletedAt_idx" ON "field_operations"("deletedAt");

-- CreateIndex
CREATE INDEX "field_tasks_fieldOperationId_sequence_idx" ON "field_tasks"("fieldOperationId", "sequence");

-- CreateIndex
CREATE INDEX "field_operation_assignments_fieldOperationId_role_idx" ON "field_operation_assignments"("fieldOperationId", "role");

-- CreateIndex
CREATE INDEX "field_operation_assignments_userId_idx" ON "field_operation_assignments"("userId");

-- CreateIndex
CREATE INDEX "field_operation_teams_active_idx" ON "field_operation_teams"("active");

-- CreateIndex
CREATE INDEX "field_operation_vehicles_fieldOperationId_idx" ON "field_operation_vehicles"("fieldOperationId");

-- CreateIndex
CREATE INDEX "field_operation_vehicles_vehicleId_idx" ON "field_operation_vehicles"("vehicleId");

-- CreateIndex
CREATE INDEX "field_operation_timelines_fieldOperationId_occurredAt_idx" ON "field_operation_timelines"("fieldOperationId", "occurredAt");

-- CreateIndex
CREATE INDEX "field_operation_evidences_fieldOperationId_type_idx" ON "field_operation_evidences"("fieldOperationId", "type");

-- CreateIndex
CREATE INDEX "field_operation_issues_fieldOperationId_status_idx" ON "field_operation_issues"("fieldOperationId", "status");

-- CreateIndex
CREATE INDEX "field_operation_part_requests_fieldOperationId_status_idx" ON "field_operation_part_requests"("fieldOperationId", "status");

-- CreateIndex
CREATE INDEX "field_operation_payment_links_paymentTransactionId_idx" ON "field_operation_payment_links"("paymentTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "field_operation_payment_links_fieldOperationId_paymentTrans_key" ON "field_operation_payment_links"("fieldOperationId", "paymentTransactionId");

-- CreateIndex
CREATE INDEX "field_operation_customer_approvals_fieldOperationId_idx" ON "field_operation_customer_approvals"("fieldOperationId");

-- AddForeignKey
ALTER TABLE "field_tasks" ADD CONSTRAINT "field_tasks_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_assignments" ADD CONSTRAINT "field_operation_assignments_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_vehicles" ADD CONSTRAINT "field_operation_vehicles_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_timelines" ADD CONSTRAINT "field_operation_timelines_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_evidences" ADD CONSTRAINT "field_operation_evidences_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_issues" ADD CONSTRAINT "field_operation_issues_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_part_requests" ADD CONSTRAINT "field_operation_part_requests_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_payment_links" ADD CONSTRAINT "field_operation_payment_links_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_payment_links" ADD CONSTRAINT "field_operation_payment_links_paymentTransactionId_fkey" FOREIGN KEY ("paymentTransactionId") REFERENCES "payment_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_customer_approvals" ADD CONSTRAINT "field_operation_customer_approvals_fieldOperationId_fkey" FOREIGN KEY ("fieldOperationId") REFERENCES "field_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
