-- FAZ 42 — AI Tool Execution log
CREATE TABLE "ai_tool_executions" (
    "id" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "workerCode" TEXT,
    "toolName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "approvalRequired" BOOLEAN NOT NULL DEFAULT false,
    "parameters" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB,
    "orderId" TEXT,
    "runId" TEXT,
    "taskId" TEXT,
    "managerName" TEXT,
    "managerNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "safeMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tool_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_tool_executions_workerId_createdAt_idx"
  ON "ai_tool_executions"("workerId", "createdAt" DESC);

CREATE INDEX "ai_tool_executions_status_createdAt_idx"
  ON "ai_tool_executions"("status", "createdAt" DESC);

CREATE INDEX "ai_tool_executions_orderId_idx"
  ON "ai_tool_executions"("orderId");
